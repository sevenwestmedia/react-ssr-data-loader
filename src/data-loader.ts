import * as React from 'react'
import { Dispatch } from 'redux'
import { connect } from 'react-redux'
import {
    ReduxStoreState, DataTypeMap, LoaderDataState,
    LOAD_DATA, LOAD_DATA_FAILED, LOAD_DATA_COMPLETED,
    UNLOAD_DATA, LOAD_NEXT_DATA
} from './data-loader.redux'

export interface LoadedState<T> {
    isLoaded: boolean
    isLoading: boolean
    loadFailed: boolean
    errorMessage?: string
    data?: T
}

export interface RenderData<T> {
    (loaderProps: LoadedState<T>): React.ReactElement<any>
}
export interface OwnProps<T> {
    dataType: string
    dataKey: string
    loadData: () => Promise<T>
    clientLoadOnly?: boolean
    isServerSideRender: boolean
    renderData: RenderData<T>
}

export interface MappedProps {
    store: DataTypeMap
}
export interface DispatchProps {
    dispatch: Dispatch<ReduxStoreState>
}
export interface Props<T> extends OwnProps<T>, MappedProps, DispatchProps { }

const needsData = (state: LoaderDataState) => !state || (!state.loaded && !state.failed)
const hasDataFromServer = (state: LoaderDataState) => state && state.loaded && state.serverSideRender

export class DataLoader<T> extends React.PureComponent<Props<T>, {}> {
    private _isMounted: boolean

    actionMeta = (props = this.props) => ({
        dataType: props.dataType,
        dataKey: props.dataKey,
        isServerSideRender: props.isServerSideRender
    })

    loadData = async () => {
        this.props.dispatch<LOAD_DATA>({
            type: LOAD_DATA,
            meta: this.actionMeta(),
        })

        await this.performLoadData()
    }

    performLoadData = async () => {
        try {
            const data = await this.props.loadData()
            if (!this._isMounted) {
                return
            }

            this.props.dispatch<LOAD_DATA_COMPLETED>({
                type: LOAD_DATA_COMPLETED,
                meta: this.actionMeta(),
                payload: data
            })
        } catch (err) {
            if (!this._isMounted) {
                return
            }

            let payload: string
            if (err instanceof Error) {
                payload = err.message
            } else {
                payload = err ? err.toString() : ''
            }

            this.props.dispatch<LOAD_DATA_FAILED>({
                type: LOAD_DATA_FAILED,
                meta: this.actionMeta(),
                payload: payload
            })
        }
    }

    async componentWillMount() {
        this._isMounted = true
        const loadedState = this.getLoadedState()

        if (this.props.isServerSideRender && needsData(loadedState)) {
            return await this.loadData()
        }
        if (!this.props.isServerSideRender && !hasDataFromServer(loadedState)) {
            return await this.loadData()
        }
    }

    async componentWillReceiveProps(nextProps: Props<T>) {
        if (
            this.props.dataType !== nextProps.dataType ||
            this.props.dataKey !== nextProps.dataKey ||
            this.props.isServerSideRender !== nextProps.isServerSideRender
        ) {
            this.props.dispatch<LOAD_NEXT_DATA>({
                type: LOAD_NEXT_DATA,
                meta: {
                    current: this.actionMeta(),
                    next: this.actionMeta(nextProps)
                }
            })

            await this.performLoadData()
        }
    }

    componentWillUnmount() {
        this._isMounted = false
        this.props.dispatch<UNLOAD_DATA>({
            type: UNLOAD_DATA,
            meta: this.actionMeta(),
        })
    }

    getLoadedState = (): LoaderDataState => {
        const dataLookup = this.props.store[this.props.dataType]
        if (!dataLookup) {
            return undefined
        }
        return dataLookup[this.props.dataKey]
    }

    getLoadedProps = (): LoadedState<T> => {
        const loadedState = this.getLoadedState()
        if (!loadedState) {
            return undefined
        }

        return {
            isLoaded: loadedState.loaded,
            isLoading: loadedState.loading,
            loadFailed: loadedState.failed,
            errorMessage: loadedState.error,
            data: loadedState.data
        }
    }

    render() {
        const loadedProps = this.getLoadedProps() || {
            isLoaded: false,
            isLoading: false,
            loadFailed: false
        }
        return this.props.renderData(loadedProps)
    }
}


export function createTypedDataLoader<T>() {
    return connect<MappedProps, {}, OwnProps<T>>(
        (state: ReduxStoreState) => ({ store: state.dataLoader })
    )(DataLoader)
}

export default createTypedDataLoader<any>()
