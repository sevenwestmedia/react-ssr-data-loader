import * as React from 'react'
import { LoaderStatus } from './data-loader-actions'
import { DataLoaderContext, LoaderState } from './data-provider'

export interface SuccessLoadedState<T, TActions> {
    isCompleted: true
    isLoaded: true
    isLoading: false
    isError: false
    data: T
    actions: TActions & BuiltInActions
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

export type LoadedState<T, TActions> = SuccessLoadedState<T, TActions> | BeforeLoadingState| ErrorLoadedState | LoadingState

export interface RenderData<T, TActions> {
    (loaderProps: LoadedState<T, TActions>, ): React.ReactElement<any> | null
}
export interface Props<T, TActions> {
    dataKey: string
    clientLoadOnly?: boolean
    unloadDataOnUnmount?: boolean // defaults to true
    renderData: RenderData<T, TActions>
}

export interface BuiltInActions {
    refresh: () => void
}

// @TODO This is a decent blog post or something in itself, generic react components are hard..
export function createTypedDataLoader<T, TLoadArgs extends object, TActions extends object>(
    dataType: string,
    actions: (
        dataLoader: DataLoaderContext,
        props: Props<T, TActions> & TLoadArgs,
        handleStateUpdates: (loadedState: LoaderState<T>) => void
    ) => TActions
) : React.ComponentClass<Props<T, TActions & BuiltInActions> & TLoadArgs> {
    class DataLoader extends React.PureComponent<Props<T, TActions & BuiltInActions> & TLoadArgs, LoadedState<T, TActions & BuiltInActions>> {
        context: { dataLoader: DataLoaderContext }
        private _isMounted: boolean

        static contextTypes = {
            dataLoader: React.PropTypes.object
        }

        state: LoadedState<T, TActions & BuiltInActions> = {
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

        async componentWillReceiveProps(nextProps: Props<T, TActions>) {
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
            if (this.props.unloadDataOnUnmount === false) {
                this.context.dataLoader.detach(this.actionMeta(), this.handleStateUpdate)
            } else {
                this.context.dataLoader.unloadData(this.actionMeta(), this.handleStateUpdate)
            }
        }

        private actionMeta = (props: { dataKey: string, clientLoadOnly?: boolean, renderData: any } = this.props) => {
            const { dataKey, clientLoadOnly, renderData, ...dataParams } = props

            return {
                dataType,
                dataKey,
                dataParams,
            }
        }

        private handleStateUpdate = (loadedState: LoaderState<T>): void => {
            let newState: LoadedState<T, TActions & BuiltInActions>

            if (loadedState && loadedState.status === LoaderStatus.Idle && !loadedState.lastAction.success) {
                newState = {
                    isCompleted: true,
                    isLoaded: false,
                    isLoading: false,
                    isError: true,
                    errorMessage: loadedState.lastAction.error,
                }
            } else if (loadedState && loadedState.status === LoaderStatus.Idle && loadedState.data.hasData) {
                newState = {
                    isCompleted: true,
                    isLoaded: true,
                    isLoading: false,
                    isError: false,
                    data: loadedState.data.data,
                    actions: this.actions,
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

        private actions: TActions & BuiltInActions = {
            ...actions(this.context.dataLoader, this.props, this.handleStateUpdate) as object,
            refresh: () => { this.context.dataLoader.refresh(this.actionMeta()) }
        } as TActions & BuiltInActions

        render() {
            if (this.context.dataLoader.isServerSideRender && this.props.clientLoadOnly) {
                return null
            }

            return this.props.renderData(this.state)
        }
    }

    return DataLoader
}
