import * as React from 'react'
import { DataLoaderContext } from './data-loader-context'
import { DataLoaderState } from './data-loader-state'
import * as PropTypes from 'prop-types'

export interface LoadedState {
    isLoading: boolean
}
export type RenderLoading = (loaderProps: LoadedState) => React.ReactElement<any> | null
export interface Props {
    renderData: RenderLoading
}

export class IsLoading extends React.Component<Props, DataLoaderState> {
    static contextTypes = {
        dataLoader: PropTypes.object
    }

    context!: { dataLoader: DataLoaderContext }

    constructor(props: Props, context: { dataLoader: DataLoaderContext }) {
        super(props, context)
        this.state = context.dataLoader.getDataLoaderState()
    }

    componentDidMount() {
        this.context.dataLoader.subscribe(this.stateChanged)
    }

    componentWillUnmount() {
        this.context.dataLoader.unsubscribe(this.stateChanged)
    }

    stateChanged = (state: DataLoaderState) => {
        this.setState(state)
    }

    render() {
        const loadedProps: LoadedState = {
            isLoading: this.state.loadingCount > 0
        }

        return this.props.renderData(loadedProps)
    }
}
