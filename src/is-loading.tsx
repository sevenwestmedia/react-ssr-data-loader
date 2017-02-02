import * as React from 'react'
import { Dispatch } from 'redux'
import { connect } from 'react-redux'
import {
    ReduxStoreState, DataTypeMap, LoaderDataState,
} from './data-loader.redux'

export interface LoadedState {
    isCompleted: boolean
    isLoading: boolean
    loadFailed: boolean 
}
export interface RenderLoading {
    (loaderProps: LoadedState): React.ReactElement<any>
}
export interface Props {
    renderData: RenderLoading
}

export interface MappedProps {

}

class IsLoading extends React.Component<Props, {}> {
    getLoadedProps() {
        
    }

    render() {
        const loadedProps: LoadedState = this.getLoadedProps() || {
            isCompleted: false,
            isLoading: false,
            loadFailed: false,
        }

        return this.props.renderData(loadedProps)
    }
}

export default connect<MappedProps, {}, Props>((state: ReduxStoreState) => ({
    foo: state.dataLoader
}))(IsLoading)
