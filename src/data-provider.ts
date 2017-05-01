import * as React from 'react'
import {
    DataLoaderState, LoaderState, Actions, reducer,
    LOAD_DATA, LOAD_DATA_FAILED, LOAD_DATA_COMPLETED,
    UNLOAD_DATA, REFRESH_DATA, NEXT_PAGE,
    INIT, ResourceLoadInfo,
} from './data-loader-actions'
import DataLoaderResources from './data-loader-resources'

export { LoaderState }

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

export type DataUpdateCallback = (newState: LoaderState<any>) => void
export type StateSubscription = (state: DataLoaderState) => void
const ssrNeedsData = (state: LoaderState<any> | undefined) => !state || (!state.data.hasData && state.lastAction.success)

export class DataLoaderContext {
    // We need to track this in two places, one with immediate effect,
    // one tied to reacts lifecycle
    private loadingCount = 0
    private _subscriptions: {
        [resourceType: string]: {
            [resourceId: string]: DataUpdateCallback[]
        }
    } = {}
    private _stateSubscriptions: StateSubscription[] = []
    private state: DataLoaderState

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
        this.updateDataLoaders(this.state)
        this.onStateChanged(this.state)
    }

    getDataLoaderState = () => this.state

    subscribe(callback: StateSubscription) {
        this._stateSubscriptions.push(callback)
    }

    unsubscribe(callback: StateSubscription) {
        this._stateSubscriptions.splice(this._stateSubscriptions.indexOf(callback), 1)
    }

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

    async nextPage(metadata: ResourceLoadInfo<any>) {
        const currentState = this.getLoadedState(metadata)
        const existingData = currentState && currentState.data.hasData
            ? currentState.data.data
            : undefined
        this.dispatch<NEXT_PAGE>({
            type: NEXT_PAGE,
            meta: { ...metadata, dataFromServerSideRender: this.isServerSideRender },
            payload: { existingData }
        })

        await this.performLoadData(metadata, existingData)
    }

    async refresh(metadata: ResourceLoadInfo<any>) {
        this.dispatch<REFRESH_DATA>({
            type: REFRESH_DATA,
            meta: { ...metadata, dataFromServerSideRender: this.isServerSideRender },
        })

        await this.performLoadData(metadata, undefined)
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
        const subscriptions = this.getSubscription(metadata)

        if (subscriptions.length === 1) {
            delete this._subscriptions[metadata.resourceType][metadata.resourceId]
            if (Object.keys(this._subscriptions[metadata.resourceType]).length === 0) {
                delete this._subscriptions[metadata.resourceType]
            }

            return true
        }

        const subscriptionIndex = subscriptions.indexOf(update)
        const without = subscriptions.splice(subscriptionIndex, 1)
        this._subscriptions[metadata.resourceType][metadata.resourceId] = without
        return false
    }

    updateDataLoaders(state: DataLoaderState) {
        const subscribedDataTypes = Object.keys(this._subscriptions)

        // Notify any dataloaders
        for (const subscribedDataType of subscribedDataTypes) {
            const subscribedKeys = Object.keys(this._subscriptions[subscribedDataType])

            for (const subscriberKey of subscribedKeys) {
                const subscribers = this._subscriptions[subscribedDataType][subscriberKey]

                for (const subscriber of subscribers) {
                    if (state.data[subscribedDataType] && state.data[subscribedDataType][subscriberKey]) {
                        subscriber(state.data[subscribedDataType][subscriberKey])
                    }
                }
            }
        }

        // Notify any is-loading components
        for (const stateSubscriber of this._stateSubscriptions) {
            stateSubscriber(state)
        }
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

    private getSubscription(metadata: ResourceLoadInfo<any>) {
        if (!this._subscriptions[metadata.resourceType]) {
            this._subscriptions[metadata.resourceType] = {}
        }

        if (!this._subscriptions[metadata.resourceType][metadata.resourceId]) {
            this._subscriptions[metadata.resourceType][metadata.resourceId] = []
        }

        return this._subscriptions[metadata.resourceType][metadata.resourceId]
    }

    private attach(metadata: ResourceLoadInfo<any>, update: DataUpdateCallback) {
        const subscriptions = this.getSubscription(metadata)

        subscriptions.push(update)
        const firstAttached = subscriptions.length === 1
        return firstAttached
    }

    private _hasMountedComponents = (metadata: ResourceLoadInfo<any>) => {
        return (
            this._subscriptions[metadata.resourceType] &&
            this._subscriptions[metadata.resourceType][metadata.resourceId] &&
            this._subscriptions[metadata.resourceType][metadata.resourceId].length > 0
        )
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
            if (!this._hasMountedComponents(metadata)) {
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
            if (!this._hasMountedComponents(metadata)) {
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
            if (--this.loadingCount === 0) {
                this.loadingCountChanged(this.loadingCount)
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
