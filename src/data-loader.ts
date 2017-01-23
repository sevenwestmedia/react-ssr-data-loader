import * as React from 'react'
import { Dispatch } from 'redux'
import { connect } from 'react-redux'
import {
    ReduxStoreState, DataTypeMap, LoaderDataState,
    LOAD_DATA, LOAD_DATA_FAILED, LOAD_DATA_COMPLETED
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
    loadData = async () => {
        const actionMeta = {
            dataType: this.props.dataType,
            dataKey: this.props.dataKey,
            isServerSideRender: this.props.isServerSideRender
        }

        this.props.dispatch<LOAD_DATA>({
            type: LOAD_DATA,
            meta: actionMeta
        })

        try {
            const data = await this.props.loadData()
            this.props.dispatch<LOAD_DATA_COMPLETED>({
                type: LOAD_DATA_COMPLETED,
                meta: actionMeta,
                payload: data
            })
        } catch (err) {
            let payload: string
            if (err instanceof Error) {
                payload = err.message
            } else {
                payload = err ? err.toString() : ''
            }

            this.props.dispatch<LOAD_DATA_FAILED>({
                type: LOAD_DATA_FAILED,
                meta: actionMeta,
                payload: payload
            })
        }
    }

    async componentWillMount() {
        const loadedState = this.getLoadedState()

        if (this.props.isServerSideRender && needsData(loadedState)) {
            return await this.loadData()
        }
        if (!this.props.isServerSideRender && !hasDataFromServer(loadedState)) {
            return await this.loadData()
        }
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
