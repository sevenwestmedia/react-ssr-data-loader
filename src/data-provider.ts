import * as React from 'react'
import {
    DataLoaderState, LoaderState, Actions, reducer,
    LOAD_DATA, LOAD_DATA_FAILED, LOAD_DATA_COMPLETED,
    UNLOAD_DATA, REFRESH_DATA, NEXT_PAGE,
    INIT, ResourceLoadInfo,
} from './data-loader-actions'
import DataLoaderResources from './data-loader-resources'
import { Subscriptions, DataUpdateCallback } from './subscriptions'

export interface Props {
    initialState?: DataLoaderState
    onError?: (err: string) => void
    loadingCountUpdated?: (loadingCount: number) => void
    loadAllCompleted?: () => void
    stateChanged?: (state: DataLoaderState) => void
    isServerSideRender?: boolean
    resources: DataLoaderResources
}

export interface State extends DataLoaderState {
}

const ssrNeedsData = (state: LoaderState<any> | undefined) => !state || (!state.data.hasData && state.lastAction.success)

export class DataLoaderContext {
    // We need to track this in two places, one with immediate effect,
    // one tied to reacts lifecycle
    private loadingCount = 0
    private state: DataLoaderState
    private subscriptions = new Subscriptions()

    constructor(
        private onStateChanged: (state: DataLoaderState) => void,
        initialState: DataLoaderState | undefined,
        private performLoad: (metadata: ResourceLoadInfo<any>, existingData: any) => Promise<any>,
        private loadAllCompleted: () => void,
        private loadingCountChanged: (loadingCount: number) => void,
        private onError: (err: string) => void,
        public isServerSideRender: boolean
    ) {
        if (initialState) {
            this.state = initialState
        } else {
            this.state = reducer(undefined, { type: INIT })
            onStateChanged(this.state)
        }
    }

    dispatch = <T extends Actions>(action: T): void => {
        this.state = reducer(this.state, action)
        this.subscriptions.notifyStateSubscribersAndDataLoaders(this.state)
        this.onStateChanged(this.state)
    }

    getDataLoaderState = () => this.state

    subscribe = this.subscriptions.subscribeToStateChanges
    unsubscribe = this.subscriptions.unsubscribeFromStateChanges

    async loadData(metadata: ResourceLoadInfo<any>, update: DataUpdateCallback) {
        const firstAttached = this.attach(metadata, update)
        const loadedState = this.getLoadedState(metadata)

        if (this.isServerSideRender && ssrNeedsData(loadedState) && firstAttached) {
            return await this._loadData(metadata)
        } else {
            // Give the data-loader it's state
            const loaderState = this.getLoadedState(metadata)
            loaderState && update(loaderState)
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

    nextPage(metadata: ResourceLoadInfo<any>) {
        const currentState = this.getLoadedState(metadata)
        const existingData = currentState && currentState.data.hasData
            ? currentState.data.data
            : undefined
        this.dispatch<NEXT_PAGE>({
            type: NEXT_PAGE,
            meta: { ...metadata, dataFromServerSideRender: this.isServerSideRender },
            payload: { existingData }
        })

        return this.performLoadData(metadata, existingData)
    }

    refresh(metadata: ResourceLoadInfo<any>) {
        this.dispatch<REFRESH_DATA>({
            type: REFRESH_DATA,
            meta: { ...metadata, dataFromServerSideRender: this.isServerSideRender },
        })

        return this.performLoadData(metadata, undefined)
    }

    unloadData(metadata: ResourceLoadInfo<any>, update: DataUpdateCallback) {
        if (this.detach(metadata, update)) {
            this.dispatch<UNLOAD_DATA>({
                type: UNLOAD_DATA,
                meta: { ...metadata, dataFromServerSideRender: this.isServerSideRender },
            })
        }
    }

    // Returns true when data needs to be unloaded from redux
    detach(metadata: ResourceLoadInfo<any>, update: DataUpdateCallback) {
        const remainingSubscribers = this.subscriptions.unregisterDataLoader(
            metadata.resourceType,
            metadata.resourceId,
            update,
        )

        return remainingSubscribers === 0
    }

    private _loadData = async (metadata: ResourceLoadInfo<any>) => {
        const currentState = this.getLoadedState(metadata)
        const existingData = currentState && currentState.data.hasData
            ? currentState.data.data
            : undefined
        this.dispatch<LOAD_DATA>({
            type: LOAD_DATA,
            meta: { ...metadata, dataFromServerSideRender: this.isServerSideRender }
        })

        await this.performLoadData(metadata, existingData)
    }

    /** @returns true if this is the first data loader to attach to that type and id */
    private attach(metadata: ResourceLoadInfo<any>, update: DataUpdateCallback): boolean {
        const totalDataLoaders = this.subscriptions.registerDataLoader(
            metadata.resourceType,
            metadata.resourceId,
            update,
        )
        const firstDataLoaderForResourceAndId = totalDataLoaders === 1
        return firstDataLoaderForResourceAndId
    }

    private getLoadedState = (metadata: ResourceLoadInfo<any>): LoaderState<any> | undefined => {
        const dataLookup = this.state.data[metadata.resourceType]
        if (!dataLookup) {
            return undefined
        }

        return dataLookup[metadata.resourceId]
    }

    private performLoadData = async (metadata: ResourceLoadInfo<any>, existingData: any) => {
        try {
            this.loadingCount++
            this.loadingCountChanged(this.loadingCount)
            const data = await this.performLoad(metadata, existingData)
            // If we no longer have data loaders, they have been unmounted since we started loading
            if (!this.subscriptions.hasRegisteredDataLoader(metadata.resourceType, metadata.resourceId)) {
                return
            }

            this.dispatch<LOAD_DATA_COMPLETED>({
                type: LOAD_DATA_COMPLETED,
                meta: metadata,
                payload: {
                    data,
                    dataFromServerSideRender: this.isServerSideRender
                }
            })
        } catch (err) {
            // If we no longer have data loaders, they have been unmounted since we started loading
            if (!this.subscriptions.hasRegisteredDataLoader(metadata.resourceType, metadata.resourceId)) {
                return
            }

            let payload: string
            if (err instanceof Error) {
                payload = err.message
            } else {
                payload = err ? err.toString() : ''
            }

            this.onError(`Error when loading ${JSON.stringify(metadata)}:
    ${payload}`)

            this.dispatch<LOAD_DATA_FAILED>({
                type: LOAD_DATA_FAILED,
                meta: { ...metadata, dataFromServerSideRender: this.isServerSideRender },
                payload: payload
            })
        } finally {
            this.loadingCountChanged(this.loadingCount)
            if (--this.loadingCount === 0) {
                this.loadAllCompleted()
            }
        }
    }
}

export default class DataProvider extends React.Component<Props, {}> {
    static childContextTypes = {
        dataLoader: React.PropTypes.object
    }

    private dataLoader: DataLoaderContext
    state: State = reducer(undefined, { type: INIT })

    constructor(props: Props, context: any) {
        super(props, context)

        this.dataLoader = new DataLoaderContext(
            this.props.stateChanged || (() => {}),
            this.props.initialState,
            this.loadData,
            this.props.loadAllCompleted || (() => {}),
            this.props.loadingCountUpdated || (() => {}),
            this.props.onError || (() => {}),
            this.props.isServerSideRender || false,
        )
    }

    private loadData = (metadata: ResourceLoadInfo<any>, existingData: any): Promise<any> => {
        const dataLoader = this.props.resources.getResourceLoader(metadata.resourceType)
        if (!dataLoader) {
            return Promise.reject(`No data loader present for ${metadata.resourceType}`)
        }

        return dataLoader(metadata.resourceId, metadata.resourceLoadParams, existingData)
    }

    getChildContext = (): { dataLoader: DataLoaderContext } => ({ dataLoader: this.dataLoader })

    render() {
        return React.Children.only(this.props.children)
    }
}
