import React from 'react'
import { DataLoaderContextComponent, ensureContext } from './data-loader-context'
import { DataLoaderState } from './data-loader-state'

export interface LoadedState {
    isLoading: boolean
}
export type RenderLoading = (loaderProps: LoadedState) => React.ReactElement<any> | null
export interface Props {
    renderData: RenderLoading
}

export class IsLoading extends React.Component<Props, DataLoaderState> {
    static contextType = DataLoaderContextComponent
    context!: React.ContextType<typeof DataLoaderContextComponent>

    constructor(props: Props) {
        super(props)
        this.state = ensureContext(this.context).getDataLoaderState()
    }

    componentDidMount() {
        ensureContext(this.context).subscribe(this.stateChanged)
    }

    componentWillUnmount() {
        ensureContext(this.context).unsubscribe(this.stateChanged)
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
