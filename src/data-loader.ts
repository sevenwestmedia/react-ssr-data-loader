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

export class DataLoader<T> extends React.Component<Props<T>, {}> {
    async componentWillMount() {
        const loadedState = this.getLoadedState()
        const actionMeta = {
            dataType: this.props.dataType,
            dataKey: this.props.dataKey,
            isServerSideRender: this.props.isServerSideRender
        }

        if (this.props.isServerSideRender && !loadedState.loaded && !loadedState.failed) {
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
    }

    getLoadedState = (): LoaderDataState => (this.props.store[this.props.dataType] && this.props.store[this.props.dataType][this.props.dataKey]) || {
        loaded: false,
        loading: false,
        failed: false,
        serverSideRender: this.props.isServerSideRender
    }

    getLoadedProps = (): LoadedState<T> => {
        const loadedState = this.getLoadedState()

        return {
            isLoaded: loadedState.loaded,
            isLoading: loadedState.loading,
            loadFailed: loadedState.failed,
            data: loadedState.data
        }
    }

    render() {
        return this.props.renderData(this.getLoadedProps())
    }
}


export function createTypedDataLoader<T>() {
    return connect<MappedProps, {}, OwnProps<T>>(
        (state: ReduxStoreState) => ({ store: state.dataLoader })
    )(DataLoader)
}

export default createTypedDataLoader<any>()
