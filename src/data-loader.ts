import * as React from 'react'
import { Dispatch } from 'redux'
import { connect } from 'react-redux'
import { ReduxStoreState, LoaderReduxState, LoaderDataState } from './data-loader.redux'

export interface LoadedState<T> {
    isLoaded: boolean
    isLoading: boolean
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
    store: LoaderReduxState
}
export interface DispatchProps {
    dispatch: Dispatch<ReduxStoreState>
}
export interface Props<T> extends OwnProps<T>, MappedProps, DispatchProps { }

export class DataLoader<T> extends React.Component<Props<T>, {}> {
    componentWillMount() {
        const loadedState = this.getLoadedState()

        if (this.props.isServerSideRender && !loadedState.loaded && !loadedState.failed) {

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
            isLoaded: loadedState.loaded
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
