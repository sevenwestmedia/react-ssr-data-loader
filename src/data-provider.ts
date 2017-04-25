import * as React from 'react'
import {
    DataLoaderState, LoaderDataState, Actions,
    CompletedSuccessfullyLoaderDataState, reducer,
    LOAD_DATA, LOAD_DATA_FAILED, LOAD_DATA_COMPLETED,
    UNLOAD_DATA, LOAD_NEXT_DATA, REFRESH_DATA, NEXT_PAGE,
    INIT,
} from './data-loader-actions'
import DataLoaderResources from './data-loader-resources'

export { LoaderDataState }

export interface Props {
    initialState: DataLoaderState
    onError?: (err: string) => void
    loadingCountUpdated?: (loadingCount: number) => void
    loadAllCompleted?: () => void
    stateChanged?: (state: DataLoaderState) => void
    isServerSideRender: boolean
    resources: DataLoaderResources
}

export interface State extends DataLoaderState {
}

export interface MetaData<TArgs> {
    dataType: string
    dataKey: string
    dataParams: TArgs
}

const ssrNeedsData = (state: LoaderDataState | undefined) => !state || (!state.completed && !state.loading)
const hasValidData = (state: LoaderDataState | undefined): state is CompletedSuccessfullyLoaderDataState => (
    !!(state && state.completed && !state.failed)
)

export type DataUpdateCallback = (newState: LoaderDataState) => void
export type StateSubscription = (state: DataLoaderState) => void

export interface DataLoaderContext {
    isServerSideRender: boolean
    loadData(metadata: MetaData<any>, update: DataUpdateCallback): Promise<any>
    loadNextData(currentMetadata: MetaData<any>, nextMetadata: MetaData<any>, update: DataUpdateCallback): Promise<any>
    unloadData(metadata: MetaData<any>, update: DataUpdateCallback): void
    detach(metadata: MetaData<any>, update: DataUpdateCallback): void
    refresh(metadata: MetaData<any>): Promise<any>
    nextPage(metadata: MetaData<any>): Promise<any>

    subscribe: (callback: StateSubscription) => void
    unsubscribe: (callback: StateSubscription) => void
    getDataLoaderState: () => DataLoaderState
}

// Keep the public methods used to notify the context of changes hidden from the data loader
// component by using an internal class with an interface
class DataLoaderContextInternal implements DataLoaderContext {
    // We need to track this in two places, one with immediate effect,
    // one tied to reacts lifecycle
    private loadingCount = 0
    private _subscriptions: {
        [dataType: string]: {
            [dataKey: string]: DataUpdateCallback[]
        }
    } = {}
    private _stateSubscriptions: StateSubscription[] = []
    private state: DataLoaderState

    constructor(
        private onStateChanged: (state: DataLoaderState) => void,
        initialState: DataLoaderState,
        private performLoad: (metadata: MetaData<any>, existingData: any) => Promise<any>,
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

    async loadData(metadata: MetaData<any>, update: DataUpdateCallback) {
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
            if (hasValidData(loadedState)) {
                if (loadedState.dataFromServerSideRender) {
                    // TODO Need to flag data as cached
                }
            } else {
                return await this._loadData(metadata)
            }
        }
    }

    async loadNextData(currentMetadata: MetaData<any>, nextMetadata: MetaData<any>, update: DataUpdateCallback) {
        this.detach(currentMetadata, update)
        const firstAttached = this.attach(nextMetadata, update)

        if (firstAttached) {
            this.dispatch<LOAD_NEXT_DATA>({
                type: LOAD_NEXT_DATA,
                meta: {
                    current: { ...currentMetadata, dataFromServerSideRender: this.isServerSideRender },
                    next: { ...nextMetadata, dataFromServerSideRender: this.isServerSideRender }
                }
            })

            await this.performLoadData(nextMetadata, undefined)
        }
    }

    async nextPage(metadata: MetaData<any>) {
        const currentState = this.getLoadedState(metadata)
        const existingData = currentState && currentState.completed && !currentState.failed
            ? currentState.data
            : undefined
        this.dispatch<NEXT_PAGE>({
            type: NEXT_PAGE,
            meta: { ...metadata, dataFromServerSideRender: this.isServerSideRender },
            payload: { existingData }
        })

        await this.performLoadData(metadata, existingData)
    }

    async refresh(metadata: MetaData<any>) {
        this.dispatch<REFRESH_DATA>({
            type: REFRESH_DATA,
            meta: { ...metadata, dataFromServerSideRender: this.isServerSideRender },
        })

        await this.performLoadData(metadata, undefined)
    }

    unloadData(metadata: MetaData<any>, update: DataUpdateCallback) {
        if (this.detach(metadata, update)) {
            this.dispatch<UNLOAD_DATA>({
                type: UNLOAD_DATA,
                meta: { ...metadata, dataFromServerSideRender: this.isServerSideRender },
            })
        }
    }

    // Returns true when data needs to be unloaded from redux
    detach(metadata: MetaData<any>, update: DataUpdateCallback) {
        const subscriptions = this.getSubscription(metadata)

        if (subscriptions.length === 1) {
            delete this._subscriptions[metadata.dataType][metadata.dataKey]
            if (Object.keys(this._subscriptions[metadata.dataType]).length === 0) {
                delete this._subscriptions[metadata.dataType]
            }

            return true
        }

        const subscriptionIndex = subscriptions.indexOf(update)
        const without = subscriptions.splice(subscriptionIndex, 1)
        this._subscriptions[metadata.dataType][metadata.dataType] = without
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

    private _loadData = async (metadata: MetaData<any>) => {
        const currentState = this.getLoadedState(metadata)
        const existingData = currentState && currentState.completed && !currentState.failed
            ? currentState.data
            : undefined
        this.dispatch<LOAD_DATA>({
            type: LOAD_DATA,
            meta: { ...metadata, dataFromServerSideRender: this.isServerSideRender }
        })

        await this.performLoadData(metadata, existingData)
    }

    private getSubscription(metadata: MetaData<any>) {
        if (!this._subscriptions[metadata.dataType]) {
            this._subscriptions[metadata.dataType] = {}
        }

        if (!this._subscriptions[metadata.dataType][metadata.dataKey]) {
            this._subscriptions[metadata.dataType][metadata.dataKey] = []
        }

        return this._subscriptions[metadata.dataType][metadata.dataKey]
    }

    private attach(metadata: MetaData<any>, update: DataUpdateCallback) {
        const subscriptions = this.getSubscription(metadata)

        subscriptions.push(update)
        const firstAttached = subscriptions.length === 1
        return firstAttached
    }

    private _hasMountedComponents = (metadata: MetaData<any>) => {
        return (
            this._subscriptions[metadata.dataType] &&
            this._subscriptions[metadata.dataType][metadata.dataKey] &&
            this._subscriptions[metadata.dataType][metadata.dataKey].length > 0
        )
    }

    private getLoadedState = (metadata: MetaData<any>): LoaderDataState | undefined => {
        const dataLookup = this.state.data[metadata.dataType]
        if (!dataLookup) {
            return undefined
        }

        return dataLookup[metadata.dataKey]
    }

    private performLoadData = async (metadata: MetaData<any>, existingData: any) => {
        try {
            this.loadingCount++
            this.loadingCountChanged(this.loadingCount)
            const data = await this.performLoad(metadata, existingData)
            if (!this._hasMountedComponents(metadata)) {
                return
            }

            this.dispatch<LOAD_DATA_COMPLETED>({
                type: LOAD_DATA_COMPLETED,
                meta: { ...metadata, dataFromServerSideRender: this.isServerSideRender },
                payload: data
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

            this.onError(payload)

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

    private dataLoader: DataLoaderContextInternal
    state: State = reducer(undefined, { type: INIT })

    constructor(props: Props, context: any) {
        super(props, context)

        this.dataLoader = new DataLoaderContextInternal(
            this.props.stateChanged || (() => {}),
            this.props.initialState,
            this.loadData,
            this.props.loadAllCompleted || (() => {}),
            this.props.loadingCountUpdated || (() => {}),
            this.props.onError || (() => {}),
            this.props.isServerSideRender,
        )
    }

    private loadData = (metadata: MetaData<any>, existingData: any): Promise<any> => {
        const dataLoader = this.props.resources.getResourceLoader(metadata.dataType)
        if (!dataLoader) {
            return Promise.reject(`No data loader present for ${metadata.dataType}`)
        }

        return dataLoader(metadata.dataKey, metadata.dataParams, existingData)
    }

    getChildContext = (): { dataLoader: DataLoaderContext } => ({ dataLoader: this.dataLoader })

    render() {
        return React.Children.only(this.props.children)
    }
}
