import * as React from 'react'
import { Dispatch } from 'redux'
import { connect } from 'react-redux'
import {
    ReduxStoreState, DataTypeMap, LoaderDataState,
} from './data-loader.redux'

export interface LoadedState {
    isLoading: boolean
}
export interface RenderLoading {
    (loaderProps: LoadedState): React.ReactElement<any>
}
export interface OwnProps {
    renderData: RenderLoading
}

export interface MappedProps {
    store: DataTypeMap
}

class IsLoading extends React.Component<OwnProps & MappedProps, {}> {
    render() {
        const loadedProps: LoadedState = {
            isLoading: this.props.store.loadingCount > 0
        }

        return this.props.renderData(loadedProps)
    }
}

export default connect<MappedProps, {}, OwnProps>((state: ReduxStoreState) => ({
    store: state.dataLoader
}))(IsLoading)
