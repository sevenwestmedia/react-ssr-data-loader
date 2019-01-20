import objectHash from 'object-hash'
import { DataProviderEvents } from './events'
import { LoaderState, LoaderStatus } from './data-loader-state'
import { isPromise } from './utils'
import { getDataState } from './state-helper'

export interface DataLoaderState {
    [paramsHash: string]: LoaderState<any>
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

// Some other names
// DataLoaderDataAccessor
// DataLoaderCore
// ?
export class DataLoaderStoreAndLoader {
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

    constructor(
        private onEvent: (event: DataProviderEvents) => void | Promise<any>,
        initialState: DataLoaderState | undefined,
        private performLoad: (dataLoadParams: LoadParams) => Promise<any> | any,
        public isServerSideRender: boolean
    ) {
        if (initialState) {
            this.dataStore = initialState
        } else {
            this.onEvent({
                type: 'state-changed',
                state: this.dataStore
            })
        }
    }

    attach(componentInstanceId: string, update: () => void): void {
        this.registeredDataLoaders[componentInstanceId] = {
            update,
            currentParamsHash: undefined
        }
    }

    // Returns true when data needs to be unloaded from redux
    detach(componentInstanceId: string) {
        delete this.registeredDataLoaders[componentInstanceId]
    }

    /** Should only be called from render of data loader component (through context) */
    getDataLoaderState(
        componentInstanceId: string,
        resourceType: string,
        dataLoadParams: object,
        internalState: object,
        keepData = false,
        forceRefresh = false
    ) {
        const paramsObject = {
            resourceType,
            ...dataLoadParams,
            ...internalState
        }

        // Initial render (before mount) and SSR will not be registered, we can safely fall back to
        // undefined in both these instances
        const previousRenderParamsObjectHash = this.registeredDataLoaders[componentInstanceId]
            ? this.registeredDataLoaders[componentInstanceId].currentParamsHash
            : undefined
        const paramsObjectHash = objectHash(paramsObject)

        // Cleanup data which is not needed
        if (previousRenderParamsObjectHash && paramsObjectHash !== previousRenderParamsObjectHash) {
            const consumersForPreviousHash = this.paramHashConsumers[previousRenderParamsObjectHash]
            consumersForPreviousHash.splice(
                consumersForPreviousHash.indexOf(componentInstanceId),
                1
            )
            if (consumersForPreviousHash.length === 0) {
                // We no longer need this data
                delete this.dataStore[previousRenderParamsObjectHash]
                delete this.paramHashConsumers[previousRenderParamsObjectHash]
            }
        }

        // If we have state for the current renders params, return it synchronously
        const stateForParams = this.dataStore[paramsObjectHash]
        if (stateForParams && !forceRefresh) {
            return stateForParams
        }

        // Register the calling data loader as a consumer
        if (!this.paramHashConsumers[paramsObjectHash]) {
            this.paramHashConsumers[paramsObjectHash] = []
        }
        this.paramHashConsumers[paramsObjectHash].push(componentInstanceId)

        const result = this.performLoad(paramsObject)
        if (isPromise(result)) {
            // Init state as loading
            this.dataStore[paramsObjectHash] = {
                version: this.stateVersionCounter++,
                status: LoaderStatus.Fetching,
                lastAction: {
                    type: 'none',
                    success: true
                },
                data: getDataState(keepData, previousRenderParamsObjectHash, this.dataStore)
            }
            this.monitorLoad(paramsObjectHash, result)
        } else {
            // Init state as loaded, nothing async to monitor
            this.dataStore[paramsObjectHash] = {
                version: this.stateVersionCounter++,
                status: LoaderStatus.Idle,
                lastAction: {
                    type: 'fetch',
                    success: true
                },
                data: {
                    hasData: true,
                    dataFromServerSideRender: this.isServerSideRender,
                    result
                }
            }
        }

        return this.dataStore[paramsObjectHash]
    }

    monitorLoad(paramsObjectHash: string, work: Promise<any>) {
        work.then(result => {
            // Check to see if any data loaders care, if they don't return
            const dataLoadersForHash = this.paramHashConsumers[paramsObjectHash]
            if (!dataLoadersForHash) {
                return
            }

            this.dataStore[paramsObjectHash] = {
                version: this.stateVersionCounter++,
                status: LoaderStatus.Idle,
                lastAction: {
                    type: 'fetch',

                    success: true
                },
                data: {
                    hasData: true,
                    dataFromServerSideRender: this.isServerSideRender,
                    result
                }
            }

            dataLoadersForHash.forEach(dataLoader => {
                const dataLoaderInfo = this.registeredDataLoaders[dataLoader]
                // Tell the data loader to update
                dataLoaderInfo.update()
            })
        })
    }
}
