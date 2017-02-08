import * as React from 'react'
import { Dispatch } from 'redux'
import { connect } from 'react-redux'
import {
    ReduxStoreState, DataTypeMap, LoaderDataState,
    LOAD_DATA, LOAD_DATA_FAILED, LOAD_DATA_COMPLETED,
    UNLOAD_DATA, LOAD_NEXT_DATA, ATTACH_TO_DATA,
    DETACH_FROM_DATA
} from './data-loader.redux'

export { LoaderDataState }

export interface MappedProps {
    store: DataTypeMap
}
export interface DispatchProps {
    dispatch: Dispatch<ReduxStoreState>
}

export interface OwnProps {
    isServerSideRender: boolean
    loadData: {
        [dataType: string]: (dataKey: string) => Promise<any>
    }
}

export interface Props extends MappedProps, DispatchProps, OwnProps {

}
export interface State {

}

export interface MetaData {
    dataType: string
    dataKey: string
}

const ssrNeedsData = (state: LoaderDataState) => !state || (!state.completed && !state.loading)
const hasValidData = (state: LoaderDataState) => (
    state && state.completed && !state.failed && state.dataFromServerSideRender
)

export type DataUpdateCallback = (newState: LoaderDataState) => void

export interface DataLoaderContext {
    isServerSideRender: boolean
    loadData(metadata: MetaData, update: DataUpdateCallback): Promise<any>
    loadNextData(currentMetadata: MetaData, nextMetadata: MetaData, update: DataUpdateCallback): Promise<any>
    unloadData(metadata: MetaData, update: DataUpdateCallback): void
}

// Keep the public methods used to notify the context of changes hidden from the data loader
// component by using an internal class with an interface
class DataLoaderContextInternal implements DataLoaderContext {
    private _subscriptions: {
        [dataType: string]: {
            [dataKey: string]: DataUpdateCallback[]
        }
    } = {}

    constructor(
        private dispatch: Dispatch<ReduxStoreState>,
        private getLoadedState: (metadata: MetaData) => LoaderDataState | undefined,
        private performLoad: (metadata: MetaData) => Promise<any>,
        public isServerSideRender: boolean
    ) { }

    async loadData(metadata: MetaData, update: DataUpdateCallback) {
        const firstAttached = this._attach(metadata, update)
        const loadedState = this.getLoadedState(metadata)

        if (this.isServerSideRender && ssrNeedsData(loadedState) && firstAttached) {
            return await this._loadData(metadata)
        }

        if (!this.isServerSideRender && firstAttached) {
            if (!hasValidData(loadedState)) {
                return await this._loadData(metadata)
            }
        }
    }

    async loadNextData(currentMetadata: MetaData, nextMetadata: MetaData, update: DataUpdateCallback) {
        this.dispatch<LOAD_NEXT_DATA>({
            type: LOAD_NEXT_DATA,
            meta: {
                current: { ...currentMetadata, dataFromServerSideRender: this.isServerSideRender },
                next: { ...nextMetadata, dataFromServerSideRender: this.isServerSideRender }
            }
        })

        await this.performLoadData(nextMetadata)
    }

    unloadData(metadata: MetaData, update: DataUpdateCallback) {
        const loadedState = this.getLoadedState(metadata)
        if (loadedState.attachedComponents > 1) {
            this.dispatch<DETACH_FROM_DATA>({
                type: DETACH_FROM_DATA,
                meta: { ...metadata, dataFromServerSideRender: this.isServerSideRender },
            })
        } else {
            this.dispatch<UNLOAD_DATA>({
                type: UNLOAD_DATA,
                meta: { ...metadata, dataFromServerSideRender: this.isServerSideRender },
            })
        }
    }

    updateDataLoaders(store: DataTypeMap) {
        const subscribedDataTypes = Object.keys(this._subscriptions)

        for (const subscribedDataType of subscribedDataTypes) {
            const subscribedKeys = Object.keys(this._subscriptions[subscribedDataType])

            for (const subscriberKey of subscribedKeys) {
                const subscribers = this._subscriptions[subscribedDataType][subscriberKey]

                for (const subscriber of subscribers) {
                    if (store[subscribedDataType] && store[subscribedDataType][subscriberKey]) {
                        subscriber(store[subscribedDataType][subscriberKey])
                    }
                }
            }
        }
    }

    private _loadData = async (metadata: MetaData) => {
        this.dispatch<LOAD_DATA>({
            type: LOAD_DATA,
            meta: { ...metadata, dataFromServerSideRender: this.isServerSideRender }
        })

        await this.performLoadData(metadata)
    }

    private _attach(metadata: MetaData, update: DataUpdateCallback) {
        if (!this._subscriptions[metadata.dataType]) {
            this._subscriptions[metadata.dataType] = {}
        }

        if (!this._subscriptions[metadata.dataType][metadata.dataKey]) {
            this._subscriptions[metadata.dataType][metadata.dataKey] = []
        }

        this._subscriptions[metadata.dataType][metadata.dataKey].push(update)
        const firstAttached = this._subscriptions[metadata.dataType][metadata.dataKey].length === 1
        return firstAttached
    }

    private _hasMountedComponents = (metadata: MetaData) => {
        return (
            this._subscriptions[metadata.dataType] &&
            this._subscriptions[metadata.dataType][metadata.dataKey] &&
            this._subscriptions[metadata.dataType][metadata.dataKey].length > 0
        )
    }

    private performLoadData = async (metadata: MetaData) => {
        try {
            const data = await this.performLoad(metadata)
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
        }
    }
}

class DataProvider extends React.Component<Props, State> {
    static childContextTypes = {
        dataLoader: React.PropTypes.object
    }

    private dataLoader: DataLoaderContextInternal

    constructor(props) {
        super(props)

        this.dataLoader = new DataLoaderContextInternal(
            this.props.dispatch,
            this.getLoadedState,
            this.loadData,
            this.props.isServerSideRender
        )
    }

    componentWillReceiveProps(nextProps: Props) {
        this.dataLoader.updateDataLoaders(nextProps.store)
    }

    private getLoadedState = (metadata: MetaData): LoaderDataState => {
        const dataLookup = this.props.store.data[metadata.dataType]
        if (!dataLookup) {
            return undefined
        }

        return dataLookup[metadata.dataKey]
    }

    private loadData = (metadata: MetaData): Promise<any> => {
        const dataLoader = this.props.loadData[metadata.dataType]
        if (!dataLoader) {
            return Promise.reject(`No data loader present for ${metadata.dataType}`)
        }

        return dataLoader(metadata.dataKey)
    }

    getChildContext = () => ({ dataLoader: this.dataLoader })

    render() {
        return React.Children.only(this.props.children)
    }
}

export default connect<MappedProps, {}, OwnProps>(
    (state: ReduxStoreState) => ({ store: state.dataLoader })
)(DataProvider)
