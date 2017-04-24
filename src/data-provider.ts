import * as React from 'react'
import { Dispatch } from 'redux'
import { connect } from 'react-redux'
import {
    ReduxStoreState, DataTypeMap, LoaderDataState,
    CompletedSuccessfullyLoaderDataState,
    LOAD_DATA, LOAD_DATA_FAILED, LOAD_DATA_COMPLETED,
    UNLOAD_DATA, LOAD_NEXT_DATA, REFRESH_DATA, NEXT_PAGE,
} from './data-loader.redux'
import DataLoaderResources from './data-loader-resources'

export { LoaderDataState }

export interface MappedProps {
    store: DataTypeMap
}
export interface DispatchProps {
    dispatch: Dispatch<ReduxStoreState>
}

export interface OwnProps {
    loadingCountUpdated?: (loadingCount: number) => void
    loadAllCompleted?: () => void
    isServerSideRender: boolean
    resources: DataLoaderResources
}

export interface Props extends MappedProps, DispatchProps, OwnProps {

}
export interface State {

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

export interface DataLoaderContext {
    isServerSideRender: boolean
    loadData(metadata: MetaData<any>, update: DataUpdateCallback): Promise<any>
    loadNextData(currentMetadata: MetaData<any>, nextMetadata: MetaData<any>, update: DataUpdateCallback): Promise<any>
    unloadData(metadata: MetaData<any>, update: DataUpdateCallback): void
    detach(metadata: MetaData<any>, update: DataUpdateCallback): void
    refresh(metadata: MetaData<any>): Promise<any>
    nextPage(metadata: MetaData<any>): Promise<any>
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

    constructor(
        private dispatch: Dispatch<ReduxStoreState>,
        private getStoreState: () => DataTypeMap,
        private performLoad: (metadata: MetaData<any>, existingData: any) => Promise<any>,
        private loadAllCompleted: () => void,
        private loadingCountChanged: (loadingCount: number) => void,
        public isServerSideRender: boolean
    ) { }

    async loadData(metadata: MetaData<any>, update: DataUpdateCallback) {
        const firstAttached = this.attach(metadata, update)
        const loadedState = this.getLoadedState(metadata)

        if (this.isServerSideRender && ssrNeedsData(loadedState) && firstAttached) {
            return await this._loadData(metadata)
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

        this.updateDataLoaders(this.getStoreState())
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

    updateDataLoaders(store: DataTypeMap) {
        const subscribedDataTypes = Object.keys(this._subscriptions)

        for (const subscribedDataType of subscribedDataTypes) {
            const subscribedKeys = Object.keys(this._subscriptions[subscribedDataType])

            for (const subscriberKey of subscribedKeys) {
                const subscribers = this._subscriptions[subscribedDataType][subscriberKey]

                for (const subscriber of subscribers) {
                    if (store.data[subscribedDataType] && store.data[subscribedDataType][subscriberKey]) {
                        subscriber(store.data[subscribedDataType][subscriberKey])
                    }
                }
            }
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
        const dataLookup = this.getStoreState().data[metadata.dataType]
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

class DataProvider extends React.Component<Props, State> {
    static childContextTypes = {
        dataLoader: React.PropTypes.object
    }

    private dataLoader: DataLoaderContextInternal

    constructor(props: Props, context: any) {
        super(props, context)

        this.dataLoader = new DataLoaderContextInternal(
            this.props.dispatch,
            () => this.props.store,
            this.loadData,
            this.props.loadAllCompleted || (() => {}),
            this.props.loadingCountUpdated || (() => {}),
            this.props.isServerSideRender
        )
    }

    componentWillReceiveProps(nextProps: Props) {
        this.dataLoader.updateDataLoaders(nextProps.store)
    }

    private loadData = (metadata: MetaData<any>, existingData: any): Promise<any> => {
        const dataLoader = this.props.resources.getResourceLoader(metadata.dataType)
        if (!dataLoader) {
            return Promise.reject(`No data loader present for ${metadata.dataType}`)
        }

        return dataLoader(metadata.dataKey, metadata.dataParams, existingData)
    }

    getChildContext = () => ({ dataLoader: this.dataLoader })

    render() {
        return React.Children.only(this.props.children)
    }
}

export default connect<MappedProps, {}, OwnProps>(
    (state: ReduxStoreState) => ({ store: state.dataLoader })
)(DataProvider)
