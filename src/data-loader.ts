import * as React from 'react'
import { DataLoaderContext, LoaderDataState } from './data-provider'

export interface SuccessLoadedState<T> {
    isCompleted: true
    isLoaded: true
    isLoading: false
    isError: false
    data: T
}
export interface ErrorLoadedState {
    isCompleted: true
    isLoaded: false
    isLoading: false
    isError: true
    errorMessage: string
}
export interface BeforeLoadingState {
    isCompleted: false
    isLoaded: false
    isLoading: false
    isError: false
}
export interface LoadingState {
    isCompleted: false
    isLoaded: false
    isLoading: true
    isError: false
}

export type LoadedState<T> = SuccessLoadedState<T> | BeforeLoadingState| ErrorLoadedState | LoadingState

export interface RenderData<T> {
    (loaderProps: LoadedState<T>, ): React.ReactElement<any> | null
}
export interface Props<T> {
    dataKey: string
    clientLoadOnly?: boolean
    renderData: RenderData<T>
}

// @TODO This is a decent blog post or something in itself, generic react components are hard..
export function createTypedDataLoader<T, TLoadArgs>(dataType: string) : React.ComponentClass<Props<T> & TLoadArgs> {
    class DataLoader extends React.PureComponent<Props<T> & TLoadArgs, LoadedState<T>> {
        private _isMounted: boolean

        static contextTypes = {
            dataLoader: React.PropTypes.object
        }

        context: { dataLoader: DataLoaderContext }

        state: LoadedState<T> = {
            isCompleted: false,
            isLoading: false,
            isLoaded: false,
            isError: false
        }

        async componentWillMount(): Promise<void> {
            this._isMounted = true

            if (this.context.dataLoader.isServerSideRender && this.props.clientLoadOnly) {
                return
            }

            this.context.dataLoader.loadData(this.actionMeta(), this.handleStateUpdate)
        }

        async componentWillReceiveProps(nextProps: Props<T>) {
            if (
                this.props.dataKey !== nextProps.dataKey
            ) {
                this.context.dataLoader.loadNextData(
                    this.actionMeta(),
                    this.actionMeta(nextProps),
                    this.handleStateUpdate
                )
            }
        }

        componentWillUnmount() {
            this._isMounted = false
            this.context.dataLoader.unloadData(this.actionMeta(), this.handleStateUpdate)
        }

        private actionMeta = (props: { dataKey: string, clientLoadOnly?: boolean, renderData: any } = this.props) => {
            const { dataKey, clientLoadOnly, renderData, ...dataParams } = props

            return {
                dataType,
                dataKey,
                dataParams,
            }
        }

        private handleStateUpdate = (loadedState: LoaderDataState): void => {
            let newState: LoadedState<T>

            if (loadedState && loadedState.completed && loadedState.failed) {
                newState = {
                    isCompleted: true,
                    isLoaded: false,
                    isLoading: false,
                    isError: true,
                    errorMessage: loadedState.error,
                }
            } else if (loadedState && loadedState.completed && loadedState.failed === false) {
                newState = {
                    isCompleted: true,
                    isLoaded: true,
                    isLoading: false,
                    isError: false,
                    data: loadedState.data
                }
            } else {
                newState = {
                    isCompleted: false,
                    isLoaded: false,
                    isLoading: true,
                    isError: false,
                }
            }

            this.setState(newState)
        }

        render() {
            if (this.context.dataLoader.isServerSideRender && this.props.clientLoadOnly) {
                return null
            }

            return this.props.renderData(this.state)
        }
    }

    return DataLoader
}
