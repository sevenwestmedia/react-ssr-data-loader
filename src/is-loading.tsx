import * as React from 'react'
import { DataLoaderContext } from './data-provider'
import { DataLoaderState } from './data-loader-actions'

export interface LoadedState {
    isLoading: boolean
}
export interface RenderLoading {
    (loaderProps: LoadedState): React.ReactElement<any> | null
}
export interface Props {
    renderData: RenderLoading
}

export default class IsLoading extends React.Component<Props, DataLoaderState> {
    context: { dataLoader: DataLoaderContext }

    static contextTypes = {
        dataLoader: React.PropTypes.object
    }

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
