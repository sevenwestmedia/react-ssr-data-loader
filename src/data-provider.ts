import * as React from 'react'
import {
    DataLoaderState,
    LoaderState,
    Actions,
    LOAD_DATA,
    LOAD_DATA_FAILED,
    LOAD_DATA_COMPLETED,
    UNLOAD_DATA,
    REFRESH_DATA,
    NEXT_PAGE,
    UPDATE_DATA,
    INIT,
    ResourceLoadInfo,
    LoaderStatus
} from './data-loader-actions'
import reducer from './data-loader-reducer'
import DataLoaderResources from './data-loader-resources'
import { Subscriptions, DataUpdateCallback } from './subscriptions'
import * as PropTypes from 'prop-types'

export interface BeginLoadingEvent {
    type: 'begin-loading-event'
    data: {
        numberLoading: number
        resourceType: string
        resourceId: string
    }
}
export interface EndLoadingEvent {
    type: 'end-loading-event'

    data: {
        numberLoading: number
        resourceType: string
        resourceId: string
    }
}
export interface DataLoadCompletedEvent {
    type: 'data-load-completed'

    data: {
        numberLoading: number
        resourceType: string
        resourceId: string
    }
}
export interface StateChangedEvent {
    type: 'state-changed'
    state: DataLoaderState
}
export interface LoadErrorEvent {
    type: 'load-error'

    data: {
        error: Error
        resourceType: string
        resourceId: string
    }
}
export type DataProviderEvents =
    | BeginLoadingEvent
    | EndLoadingEvent
    | DataLoadCompletedEvent
    | StateChangedEvent
    | LoadErrorEvent

export interface Props {
    initialState?: DataLoaderState
    onEvent?: (event: DataProviderEvents) => void
    isServerSideRender?: boolean
    resources: DataLoaderResources<any>
    additionalLoaderProps?: object
}

export type State = DataLoaderState

const ssrNeedsData = (state: LoaderState<any> | undefined) =>
    !state || (!state.data.hasData && state.lastAction.success)

export class DataLoaderContext {
    // We need to track this in two places, one with immediate effect,
    // one tied to reacts lifecycle
    private loadingCount = 0
    private state: DataLoaderState
    private subscriptions = new Subscriptions()

    // tslint:disable:member-ordering
    subscribe = this.subscriptions.subscribeToStateChanges
    unsubscribe = this.subscriptions.unsubscribeFromStateChanges
    // tslint:enable:member-ordering

    constructor(
        private onEvent: (event: DataProviderEvents) => void,
        initialState: DataLoaderState | undefined,
        private performLoad: (
            metadata: ResourceLoadInfo<any, any>,
            existingData: any
        ) => Promise<any> | any,
        public isServerSideRender: boolean
    ) {
        if (initialState) {
            this.state = initialState
        } else {
            this.state = reducer(undefined, { type: INIT })
            onEvent({
                type: 'state-changed',
                state: this.state
            })
        }
    }

    dispatch = <T extends Actions>(action: T, metadata: ResourceLoadInfo<any, any>): void => {
        this.state = reducer(this.state, action)
        this.subscriptions.notifyStateSubscribersAndDataLoaders(this.state, metadata)
        this.onEvent({
            type: 'state-changed',
            state: this.state
        })
    }
    getDataLoaderState = () => this.state

    async loadData<TAdditionalParameters, TInternalState>(
        metadata: ResourceLoadInfo<TAdditionalParameters, TInternalState>,
        update: DataUpdateCallback
    ) {
        const firstAttached = this.attach(metadata, update)
        const loadedState = this.getLoadedState(metadata.resourceType, metadata.resourceId)

        if (this.isServerSideRender && ssrNeedsData(loadedState) && firstAttached) {
            return await this._loadData(metadata)
        } else if (loadedState) {
            // Give the data-loader it's state, if it has any
            update(loadedState, metadata.internalState)
        }

        if (!this.isServerSideRender && firstAttached) {
            // Data is left from a previous session
            if (loadedState && loadedState.data.hasData) {
                if (loadedState.data.dataFromServerSideRender) {
                    // TODO Need to flag data as cached
                }
            } else {
                return await this._loadData(metadata)
            }
        }
    }

    nextPage<TAdditionalParameters, TInternalState>(
        metadata: ResourceLoadInfo<TAdditionalParameters, TInternalState>
    ) {
        const currentState = this.getLoadedState(metadata.resourceType, metadata.resourceId)

        if (currentState && currentState.status !== LoaderStatus.Idle) {
            return
        }

        const existingData =
            currentState && currentState.data.hasData ? currentState.data.data : undefined

        this.dispatch<NEXT_PAGE>(
            {
                type: NEXT_PAGE,
                meta: metadata,
                payload: { existingData }
            },
            metadata
        )

        return this.handleLoadingPromise(metadata, this.performLoad(metadata, existingData))
    }

    /** Update is similar to refresh, but semantically different
     * Updating is used when the id or params have changed and the data
     * needs to be updated
     */
    update<TAdditionalParameters, TInternalState>(
        metadata: ResourceLoadInfo<TAdditionalParameters, TInternalState>
    ) {
        const currentState = this.getLoadedState(metadata.resourceType, metadata.resourceId)
        if (currentState && currentState.status !== LoaderStatus.Idle) {
            return
        }
        const existingData =
            currentState && currentState.data.hasData ? currentState.data.data : undefined

        this.dispatch<UPDATE_DATA>(
            {
                type: UPDATE_DATA,
                meta: metadata
            },
            metadata
        )

        return this.handleLoadingPromise(metadata, this.performLoad(metadata, existingData))
    }

    refresh<TAdditionalParameters, TInternalState>(
        metadata: ResourceLoadInfo<TAdditionalParameters, TInternalState>
    ) {
        const currentState = this.getLoadedState(metadata.resourceType, metadata.resourceId)
        if (currentState && currentState.status !== LoaderStatus.Idle) {
            return
        }

        this.dispatch<REFRESH_DATA>(
            {
                type: REFRESH_DATA,
                meta: metadata
            },
            metadata
        )

        return this.handleLoadingPromise(
            metadata,
            Promise.resolve(this.performLoad(metadata, undefined))
        )
    }

    unloadData<TAdditionalParameters, TInternalState>(
        metadata: ResourceLoadInfo<TAdditionalParameters, TInternalState>,
        update: DataUpdateCallback
    ) {
        if (this.detach(metadata, update)) {
            this.dispatch<UNLOAD_DATA>(
                {
                    type: UNLOAD_DATA,
                    meta: metadata
                },
                metadata
            )
        }
    }

    // Returns true when data needs to be unloaded from redux
    detach<TAdditionalParameters, TInternalState>(
        metadata: ResourceLoadInfo<TAdditionalParameters, TInternalState>,
        update: DataUpdateCallback
    ) {
        const remainingSubscribers = this.subscriptions.unregisterDataLoader(
            metadata.resourceType,
            metadata.resourceId,
            update
        )

        return remainingSubscribers === 0
    }

    private _loadData = (metadata: ResourceLoadInfo<any, any>) => {
        const currentState = this.getLoadedState(metadata.resourceType, metadata.resourceId)
        const existingData =
            currentState && currentState.data.hasData ? currentState.data.data : undefined

        const loadDataResult = this.performLoad(metadata, existingData)

        // To check if result is a value, resolve it, if the same thing is returned
        // it was already a promise. This is a fast path when the resource returns a value
        // synchronously instead of asynchronously
        if (Promise.resolve(loadDataResult) !== loadDataResult) {
            this.dispatch<LOAD_DATA_COMPLETED>(
                {
                    type: LOAD_DATA_COMPLETED,
                    meta: metadata,
                    payload: {
                        data: loadDataResult,
                        dataFromServerSideRender: this.isServerSideRender
                    }
                },
                metadata
            )
            return
        }

        this.dispatch<LOAD_DATA>(
            {
                type: LOAD_DATA,
                meta: metadata
            },
            metadata
        )

        return this.handleLoadingPromise(metadata, loadDataResult)
    }

    /** @returns true if this is the first data loader to attach to that type and id */
    private attach<TAdditionalParameters, TInternalState>(
        metadata: ResourceLoadInfo<TAdditionalParameters, TInternalState>,
        update: DataUpdateCallback
    ): boolean {
        const totalDataLoaders = this.subscriptions.registerDataLoader(
            metadata.resourceType,
            metadata.resourceId,
            update
        )
        const firstDataLoaderForResourceAndId = totalDataLoaders === 1
        return firstDataLoaderForResourceAndId
    }

    private getLoadedState = (
        resourceType: string,
        resourceId: string
    ): LoaderState<any> | undefined => {
        const dataLookup = this.state.data[resourceType]
        if (!dataLookup) {
            return undefined
        }

        return dataLookup[resourceId]
    }

    private handleLoadingPromise = async (
        metadata: ResourceLoadInfo<any, any>,
        loadingPromise: Promise<any>
    ) => {
        try {
            this.loadingCount++
            this.onEvent({
                type: 'begin-loading-event',
                data: {
                    numberLoading: this.loadingCount,
                    resourceType: metadata.resourceType,
                    resourceId: metadata.resourceId
                }
            })
            const data = await loadingPromise
            // If we no longer have data loaders, they have been unmounted since we started loading
            if (
                !this.subscriptions.hasRegisteredDataLoader(
                    metadata.resourceType,
                    metadata.resourceId
                )
            ) {
                return
            }

            this.dispatch<LOAD_DATA_COMPLETED>(
                {
                    type: LOAD_DATA_COMPLETED,
                    meta: metadata,
                    payload: {
                        data,
                        dataFromServerSideRender: this.isServerSideRender
                    }
                },
                metadata
            )
        } catch (err) {
            // If we no longer have data loaders, they have been unmounted since we started loading
            if (
                !this.subscriptions.hasRegisteredDataLoader(
                    metadata.resourceType,
                    metadata.resourceId
                )
            ) {
                return
            }

            const createErrorMessage = (msg: string) =>
                `Error when loading ${metadata.resourceType} ${metadata.resourceId}: ${msg}`

            let error: Error
            let errorMessage: string

            if (err instanceof Error) {
                error = err
                errorMessage = createErrorMessage(error.message)
            } else if (typeof err === 'string') {
                error = new Error(err)
                errorMessage = createErrorMessage(err)
            } else {
                error = new Error((err || 'Unknown performLoadData error').toString())
                errorMessage = error.message
            }

            this.onEvent({
                type: 'load-error',

                data: {
                    error,
                    errorMessage,
                    resourceType: metadata.resourceType,
                    resourceId: metadata.resourceId
                }
            })

            this.dispatch<LOAD_DATA_FAILED>(
                {
                    type: LOAD_DATA_FAILED,
                    meta: metadata,
                    payload: error.toString()
                },
                metadata
            )
        } finally {
            this.onEvent({
                type: 'end-loading-event',

                data: {
                    numberLoading: this.loadingCount,
                    resourceType: metadata.resourceType,
                    resourceId: metadata.resourceId
                }
            })
            if (--this.loadingCount === 0) {
                this.onEvent({
                    type: 'data-load-completed',
                    data: {
                        numberLoading: this.loadingCount,
                        resourceType: metadata.resourceType,
                        resourceId: metadata.resourceId
                    }
                })
            }
        }
    }
}

// tslint:disable-next-line:max-classes-per-file
export default class DataProvider extends React.Component<Props, {}> {
    static childContextTypes = {
        dataLoader: PropTypes.object
    }

    state: State = reducer(undefined, { type: INIT })
    private dataLoader: DataLoaderContext

    constructor(props: Props, context: any) {
        super(props, context)

        this.dataLoader = new DataLoaderContext(
            this.props.onEvent || (() => {}),
            this.props.initialState,
            this.loadData,
            this.props.isServerSideRender || false
        )
    }

    getChildContext = (): { dataLoader: DataLoaderContext } => ({ dataLoader: this.dataLoader })

    render() {
        return React.Children.only(this.props.children)
    }

    private loadData = (metadata: ResourceLoadInfo<any, any>, existingData: any): Promise<any> => {
        const dataLoader = this.props.resources.getResourceLoader(metadata.resourceType)
        if (!dataLoader) {
            return Promise.reject(`No data loader present for ${metadata.resourceType}`)
        }

        return dataLoader(
            metadata.resourceId,
            {
                ...metadata.resourceLoadParams,
                ...metadata.internalState,
                ...this.props.additionalLoaderProps
            },
            existingData
        )
    }
}
