import * as React from 'react'
import { DataLoaderContext, LoaderState } from './data-provider'

export interface RenderData<T, TActions> {
    (loaderProps: LoaderState<T>, actions?: TActions): React.ReactElement<any> | null
}
export interface Props<T, TActions> {
    dataKey: string
    clientLoadOnly?: boolean
    unloadDataOnUnmount?: boolean // defaults to true
    renderData: RenderData<T, TActions & BuiltInActions>
}

export interface BuiltInActions {
    refresh: () => void
}

type State<T> = {
    loaderState: LoaderState<T>
}

// This function is because it's hard to consume open generic React Components and you have to
// create a wrapping function anyway. 
// TODO because the data loader is created when registering resources, can we remove this?
export function createTypedDataLoader<TResource, TLoadArgs extends object, TActions extends object>(
    dataType: string,
    actions: (
        dataLoader: DataLoaderContext,
        props: Props<TResource, TActions> & TLoadArgs,
        handleStateUpdates: (loadedState: LoaderState<TResource>) => void
    ) => TActions
) : React.ComponentClass<Props<TResource, TActions & BuiltInActions> & TLoadArgs> {
    class DataLoader extends React.PureComponent<Props<TResource, TActions & BuiltInActions> & TLoadArgs, State<TResource>> {
        context: { dataLoader: DataLoaderContext }
        private _isMounted: boolean

        static contextTypes = {
            dataLoader: React.PropTypes.object
        }

        async componentWillMount(): Promise<void> {
            this._isMounted = true

            if (this.context.dataLoader.isServerSideRender && this.props.clientLoadOnly) {
                return
            }

            this.context.dataLoader.loadData(this.actionMeta(), this.handleStateUpdate)
        }

        async componentWillReceiveProps(nextProps: Props<TResource, TActions>) {
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

        private handleStateUpdate = (loadedState: LoaderState<TResource>): void => {
            this.setState({
                loaderState: loadedState,
            })
        }

        private actions: TActions & BuiltInActions = {
            ...actions(this.context.dataLoader, this.props, this.handleStateUpdate) as object,
            refresh: () => { this.context.dataLoader.refresh(this.actionMeta()) }
        } as TActions & BuiltInActions

        render() {
            if (this.context.dataLoader.isServerSideRender && this.props.clientLoadOnly) {
                return null
            }

            return this.props.renderData(
                this.state.loaderState,
                this.state.loaderState.data.hasData ? this.actions : undefined
            )
        }
    }

    return DataLoader
}
