import objectHash from 'object-hash'
import { DataProviderEvents } from './events'
import { LoaderState, LoaderStatus } from './data-loader-state'
import { isPromise } from './utils'
import { getDataState } from './state-helper'

export interface DataLoaderState {
    [paramsHash: string]: {
        // Version allows us to throw away events which are not for the correct version
        // for example, refresh while loading initial data. We only want final refresh
        // result
        version: number
        state: LoaderState<any>
    }
}

export interface ActionResult<TInternalState> {
    /** Directive to keep the existing data if this action causes a data load */
    keepData: boolean
    /** Directive to refresh the data, even if the inputs are all the same */
    refresh: boolean
    /** Internal state for this data loader, useful for paging and other exensions */
    newInternalState: TInternalState
}

export interface LoadParams {
    resourceType: string
    [param: string]: any
}

/** Tracks data loader components */
export class DataLoaderRegistrar {}

// Some other names
// DataLoaderDataAccessor
// DataLoaderCore
// DataLoaderSmurf
// ?
// tslint:disable-next-line:max-classes-per-file
export class DataLoaderStoreAndLoader {
    private requiresUpdateOnMount: string[] = []

    private registeredDataLoaders: {
        [dataLoaderId: string]: {
            update: () => void
            currentParamsHash: string | undefined
        }
    } = {}

    /** Lookup of the dataLoaderIds which currently are consuming the params. Used for ref counting */
    private paramHashConsumers: { [paramsHash: string]: string[] } = {}
    private dataStore: DataLoaderState = {}
    private stateVersionCounter = 0
    private currentWorkCount = 0

    constructor(
        private onEvent: (event: DataProviderEvents) => void | Promise<any>,
        initialState: DataLoaderState | undefined,
        private performLoad: (dataLoadParams: LoadParams) => Promise<any> | any,
        public isServerSideRender: boolean,
    ) {
        if (initialState) {
            this.dataStore = initialState
        } else {
            // Raise state change only if we haven't got initial state
            this.onEvent({
                type: 'state-changed',
                state: { ...this.dataStore },
            })
        }
    }

    attach(
        componentInstanceId: string,
        resourceType: string,
        dataLoadParams: object,
        update: () => void,
    ): void {
        const paramsObject = this.getParamsObject(resourceType, dataLoadParams)
        const paramsObjectHash = objectHash(paramsObject)

        this.registerDataLoaderHash(paramsObjectHash, componentInstanceId)
        this.registeredDataLoaders[componentInstanceId] = {
            update,
            currentParamsHash: paramsObjectHash,
        }

        // If the data has resolved between initial render, and mounting
        // then we need to dispatch an update if not in a fetching state
        const requiresUpdateIndex = this.requiresUpdateOnMount.indexOf(componentInstanceId)
        if (requiresUpdateIndex !== -1) {
            this.requiresUpdateOnMount.splice(requiresUpdateIndex, 1)
            if (this.dataStore[paramsObjectHash].state.status !== LoaderStatus.Fetching) {
                update()
            }
        }
    }

    // Returns true when data needs to be unloaded from redux
    detach(componentInstanceId: string, resourceType: string, dataLoadParams: object) {
        const paramsObject = this.getParamsObject(resourceType, dataLoadParams)
        const paramsObjectHash = objectHash(paramsObject)
        this.cleanupDataLoader(paramsObjectHash, componentInstanceId)
        delete this.registeredDataLoaders[componentInstanceId]
    }

    /** Should only be called from render of data loader component (through context) */
    getDataLoaderState(
        componentInstanceId: string,
        resourceType: string,
        dataLoadParams: object,
        keepData = false,
        forceRefresh = false,
    ) {
        const paramsObject = this.getParamsObject(resourceType, dataLoadParams)

        // Initial render (before mount) and SSR will not be registered, we can safely fall back to
        // undefined in both these instances
        const previousRenderParamsObjectHash = this.registeredDataLoaders[componentInstanceId]
            ? this.registeredDataLoaders[componentInstanceId].currentParamsHash
            : undefined
        const paramsObjectHash = objectHash(paramsObject)

        // Cleanup data which is not needed
        if (previousRenderParamsObjectHash && paramsObjectHash !== previousRenderParamsObjectHash) {
            this.cleanupDataLoader(previousRenderParamsObjectHash, componentInstanceId)
        }

        // If we have state for the current renders params, return it synchronously
        const stateForParams = this.dataStore[paramsObjectHash]
        if (stateForParams && !forceRefresh) {
            return stateForParams.state
        }

        // Register the calling data loader as a consumer
        const wasRegistered = this.registerDataLoaderHash(paramsObjectHash, componentInstanceId)

        const result = this.performLoad(paramsObject)
        if (isPromise(result)) {
            if (wasRegistered) {
                // If this render caused the data load and the data
                // loader was registered, we need to register it
                this.requiresUpdateOnMount.push(componentInstanceId)
            }
            // Init state as loading
            this.updateParamsHashState(paramsObjectHash, {
                status: LoaderStatus.Fetching,
                lastAction: {
                    type: 'none',
                    success: true,
                },
                data: getDataState(keepData, previousRenderParamsObjectHash, this.dataStore),
            })
            this.onEvent({
                type: 'begin-loading-event',
                data: {
                    resourceLoadParamsHash: paramsObjectHash,
                    resourceType,
                },
            })
            this.monitorLoad(resourceType, paramsObjectHash, result, this.stateVersionCounter)
        } else {
            // Init state as loaded, nothing async to monitor
            this.updateParamsHashState(paramsObjectHash, {
                status: LoaderStatus.Idle,
                lastAction: {
                    type: 'fetch',
                    success: true,
                },
                data: {
                    hasData: true,
                    dataFromServerSideRender: this.isServerSideRender,
                    result,
                },
            })
        }

        return this.dataStore[paramsObjectHash].state
    }

    private getParamsObject(resourceType: string, dataLoadParams: object) {
        return {
            resourceType,
            ...dataLoadParams,
        }
    }

    private monitorLoad(
        resourceType: string,
        paramsObjectHash: string,
        work: Promise<any>,
        currentVersion: number,
    ) {
        this.currentWorkCount++
        work.then(result => {
            const currentState = this.dataStore[paramsObjectHash]
            const versionMismatch = currentState && currentState.version !== currentVersion

            const dataLoadersForHash = this.paramHashConsumers[paramsObjectHash]

            // We shouldn't update internal state if there is a version
            // mismatch, or there are no data loaders left who care
            // about this data
            if (!versionMismatch && dataLoadersForHash) {
                this.updateParamsHashState(paramsObjectHash, {
                    status: LoaderStatus.Idle,
                    lastAction: {
                        type: 'fetch',
                        success: true,
                    },
                    data: {
                        hasData: true,
                        dataFromServerSideRender: this.isServerSideRender,
                        result,
                    },
                })

                dataLoadersForHash.forEach(dataLoader => {
                    const dataLoaderInfo = this.registeredDataLoaders[dataLoader]
                    // If data loaders are not mounted yet, can't call update..
                    // TODO when it registers, if the state has changed, need to call update
                    // Otherwise it will be out of sync
                    if (dataLoaderInfo) {
                        // Tell the data loader to update
                        dataLoaderInfo.update()
                    }
                })
            }

            this.onEvent({
                type: 'end-loading-event',
                data: {
                    resourceType,
                    resourceLoadParamsHash: paramsObjectHash,
                },
            })

            const currentCount = --this.currentWorkCount
            if (currentCount === 0) {
                this.onEvent({
                    type: 'data-load-completed',
                    data: {
                        resourceType,
                        resourceLoadParamsHash: paramsObjectHash,
                    },
                })
            }
        })
    }

    private registerDataLoaderHash(paramsObjectHash: string, componentInstanceId: string) {
        if (!this.paramHashConsumers[paramsObjectHash]) {
            this.paramHashConsumers[paramsObjectHash] = []
        }
        if (this.paramHashConsumers[paramsObjectHash].indexOf(componentInstanceId) === -1) {
            this.paramHashConsumers[paramsObjectHash].push(componentInstanceId)
            return true
        }

        return false
    }

    private cleanupDataLoader(previousRenderParamsObjectHash: string, componentInstanceId: string) {
        const consumersForPreviousHash = this.paramHashConsumers[previousRenderParamsObjectHash]
        consumersForPreviousHash.splice(consumersForPreviousHash.indexOf(componentInstanceId), 1)
        if (consumersForPreviousHash.length === 0) {
            // We no longer need this data
            delete this.dataStore[previousRenderParamsObjectHash]
            delete this.paramHashConsumers[previousRenderParamsObjectHash]

            this.onEvent({
                type: 'state-changed',
                state: { ...this.dataStore },
            })
        }
    }

    private updateParamsHashState(paramsObjectHash: string, newState: LoaderState<any>) {
        this.dataStore[paramsObjectHash] = {
            version: ++this.stateVersionCounter,
            state: newState,
        }
        this.onEvent({
            type: 'state-changed',
            state: { ...this.dataStore },
        })
    }
}
