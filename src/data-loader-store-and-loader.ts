import reducer from './data-loader-reducer'
import { Subscriptions, DataUpdateCallback } from './subscriptions'
import { DataProviderEvents } from './events'
import { DataLoaderState, ResourceLoadInfo, LoaderStatus, LoaderState } from './data-loader-state'
import { ssrNeedsData } from './data-loader-context'
import { getError, isPromise } from './utils'
import * as Actions from './data-loader-actions'

export class DataLoaderStoreAndLoader {
    // We need to track this in two places, one with immediate effect,
    // one tied to reacts lifecycle
    private loadingCount = 0
    private state: DataLoaderState
    private subscriptions = new Subscriptions()
    subscribe = this.subscriptions.subscribeToStateChanges
    unsubscribe = this.subscriptions.unsubscribeFromStateChanges
    constructor(
        private onEvent: (event: DataProviderEvents) => void | Promise<any>,
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
            this.state = reducer(undefined, { type: Actions.INIT })
            this.raiseEvent({
                type: 'state-changed',
                state: this.state
            })
        }
    }
    dispatch = <T extends Actions.Actions>(
        action: T,
        metadata: ResourceLoadInfo<any, any>
    ): void => {
        this.state = reducer(this.state, action)
        this.subscriptions.notifyStateSubscribersAndDataLoaders(this.state, metadata)
        this.raiseEvent({
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
            return this._loadData(metadata)
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
                return this._loadData(metadata)
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
            currentState && currentState.data.hasData ? currentState.data.result : undefined
        this.dispatch<Actions.NEXT_PAGE>(
            {
                type: Actions.NEXT_PAGE,
                meta: metadata,
                payload: { existingData }
            },
            metadata
        )
        return this.handleLoadingPromise(metadata, this.performLoad(metadata, existingData))
    }
    /* Update is similar to refresh, but semantically different
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
            currentState && currentState.data.hasData ? currentState.data.result : undefined
        this.dispatch<Actions.UPDATE_DATA>(
            {
                type: Actions.UPDATE_DATA,
                meta: metadata
            },
            metadata
        )
        try {
            // performLoad may throw asynchrnously (handled by handleLoadingPromise)
            // or synchronously (handled by handleLoadSynchronousThrow)
            return this.handleLoadingPromise(metadata, this.performLoad(metadata, existingData))
        } catch (err) {
            return this.handleLoadSynchronousThrow(err, metadata)
        }
    }
    refresh<TAdditionalParameters, TInternalState>(
        metadata: ResourceLoadInfo<TAdditionalParameters, TInternalState>
    ) {
        const currentState = this.getLoadedState(metadata.resourceType, metadata.resourceId)
        if (currentState && currentState.status !== LoaderStatus.Idle) {
            return
        }
        this.dispatch<Actions.REFRESH_DATA>(
            {
                type: Actions.REFRESH_DATA,
                meta: metadata
            },
            metadata
        )
        try {
            // performLoad may throw asynchrnously (handled by handleLoadingPromise)
            // or synchronously (handled by handleLoadSynchronousThrow)
            return this.handleLoadingPromise(
                metadata,
                Promise.resolve(this.performLoad(metadata, undefined))
            )
        } catch (err) {
            return this.handleLoadSynchronousThrow(err, metadata)
        }
    }
    unloadData<TAdditionalParameters, TInternalState>(
        metadata: ResourceLoadInfo<TAdditionalParameters, TInternalState>,
        update: DataUpdateCallback
    ) {
        if (this.detach(metadata, update)) {
            this.dispatch<Actions.UNLOAD_DATA>(
                {
                    type: Actions.UNLOAD_DATA,
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
    private raiseEvent(event: DataProviderEvents) {
        try {
            const result = this.onEvent(event)
            // If on event handler returns a promise, add a catch handler to handle/log the error
            if (result && result.catch) {
                result.catch(err => {
                    // tslint:disable-next-line:no-console
                    console.error('onEvent handler returned a rejected promise', err)
                })
            }
        } catch (err) {
            // tslint:disable-next-line:no-console
            console.error('onEvent handler threw', err)
        }
    }
    // This function will never throw
    // tslint:disable-next-line:variable-name
    private _loadData = (metadata: ResourceLoadInfo<any, any>) => {
        const currentState = this.getLoadedState(metadata.resourceType, metadata.resourceId)
        const existingData =
            currentState && currentState.data.hasData ? currentState.data.result : undefined
        try {
            // performLoad may throw asynchrnously (handled by handleLoadingPromise)
            // or synchronously (handled by handleLoadSynchronousThrow)
            const loadDataResult = this.performLoad(metadata, existingData)
            // To check if result is a value, resolve it, if the same thing is returned
            // it was already a promise. This is a fast path when the resource returns a value
            // synchronously instead of asynchronously
            if (!isPromise(loadDataResult)) {
                this.dispatch<Actions.LOAD_DATA_COMPLETED>(
                    {
                        type: Actions.LOAD_DATA_COMPLETED,
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
            this.dispatch<Actions.LOAD_DATA>(
                {
                    type: Actions.LOAD_DATA,
                    meta: metadata
                },
                metadata
            )
            return this.handleLoadingPromise(metadata, loadDataResult)
        } catch (err) {
            return this.handleLoadSynchronousThrow(err, metadata)
        }
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
    private handleLoadSynchronousThrow<TAdditionalParameters, TInternalState>(
        err: any,
        metadata: ResourceLoadInfo<TAdditionalParameters, TInternalState>
    ) {
        const error = getError(metadata, err, 'Unknown performLoadData error')
        this.raiseEvent({
            type: 'load-error',
            data: {
                error,
                errorMessage: error.message,
                resourceType: metadata.resourceType,
                resourceId: metadata.resourceId
            }
        })
        this.dispatch<Actions.LOAD_DATA_FAILED>(
            {
                type: Actions.LOAD_DATA_FAILED,
                meta: metadata,
                payload: error
            },
            metadata
        )
        return Promise.resolve()
    }
    private handleLoadingPromise = async (
        metadata: ResourceLoadInfo<any, any>,
        loadingPromise: Promise<any>
    ) => {
        try {
            this.loadingCount++
            this.raiseEvent({
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
            this.dispatch<Actions.LOAD_DATA_COMPLETED>(
                {
                    type: Actions.LOAD_DATA_COMPLETED,
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
            const error = getError(metadata, err, 'Unknown performLoadData error')
            this.raiseEvent({
                type: 'load-error',
                data: {
                    error,
                    errorMessage: error.message,
                    resourceType: metadata.resourceType,
                    resourceId: metadata.resourceId
                }
            })
            this.dispatch<Actions.LOAD_DATA_FAILED>(
                {
                    type: Actions.LOAD_DATA_FAILED,
                    meta: metadata,
                    payload: error
                },
                metadata
            )
        } finally {
            this.raiseEvent({
                type: 'end-loading-event',
                data: {
                    numberLoading: this.loadingCount,
                    resourceType: metadata.resourceType,
                    resourceId: metadata.resourceId
                }
            })
            if (--this.loadingCount === 0) {
                this.raiseEvent({
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
