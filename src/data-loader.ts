import * as React from 'react'
import { LoaderState } from './'
import { DataLoaderContext } from './data-provider'
import { DataUpdateCallback } from "./subscriptions";

export interface RenderData<T, TActions> {
    (loaderProps: LoaderState<T>, actions?: TActions): React.ReactElement<any> | null
}
export interface Props<T, TActions> {
    /** The id of the resource */
    resourceId: string
    clientLoadOnly?: boolean
    unloadDataOnUnmount?: boolean // defaults to true
    renderData: RenderData<T, TActions>
}

type State<T, TInternalState extends object> = {
    loaderState?: LoaderState<T>
    internalState: TInternalState
}

export type Return<TResource, TActions, TDataLoaderParams> =
    React.ComponentClass<Props<TResource, TActions> & TDataLoaderParams>

// This function needs to exist because for each resource we need a new react component
// The function provides a closure for anything specific to the resource
/**
 * TLoadResourceParams is the type of the arguments to load the resource
 * TActions is the type of additional actions provided by the renderData function (in addition to the BuildInActions like refresh)
 */
export function createTypedDataLoader<
    TResource,
    TDataLoaderParams,
    TInternalState extends object,
    TActions extends object
>(
    resourceType: string,
    initialInternalState: TInternalState,
    /** Callback to provide additional actions */
    actions?: (
        dataLoader: DataLoaderContext,
        props: Props<TResource, TActions> & TDataLoaderParams,
        internalState: TInternalState
    ) => TActions
) : Return<TResource, TActions, TDataLoaderParams> {
    type ComponentProps = Props<TResource, TActions> & TDataLoaderParams
    type ComponentState = State<TResource, TInternalState>

    class DataLoader extends React.PureComponent<ComponentProps, ComponentState> {
        static contextTypes = {
            dataLoader: React.PropTypes.object
        }
        context: { dataLoader: DataLoaderContext }
        state: ComponentState = {
            internalState: initialInternalState,
        }
        private _isMounted: boolean

        componentWillMount() {
            this._isMounted = true

            if (this.context.dataLoader.isServerSideRender && this.props.clientLoadOnly) {
                return
            }

            this.context.dataLoader.loadData(this.actionMeta(), this.handleStateUpdate)
        }

        componentWillReceiveProps(nextProps: Props<TResource, TActions>) {
            if (
                // When the resourceId has changed we need to unmount then load the new resource
                // This happens when the loader is used on a page which can be routed to different content
                // For example a blog entry, which navigates to another blog entry
                this.props.resourceId !== nextProps.resourceId
            ) {
                this.componentWillUnmount()
                this.context.dataLoader.loadData(this.actionMeta(nextProps), this.handleStateUpdate)
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

        private actionMeta = (props: Props<TResource, TActions> = this.props) => {
            const { resourceId, clientLoadOnly, renderData, unloadDataOnUnmount, ...resourceLoadParams } = props

            // TODO Add type safety here, am turning the remaing props into resourceLoadParams
            // For example this could be paging into, or any other data which needs to be passed through
            // the data loader to the resource loading function
            return {
                resourceType,
                resourceId,
                resourceLoadParams,
                internalState: this.state.internalState,
            }
        }

        private handleStateUpdate: DataUpdateCallback = (loadedState: LoaderState<TResource>, internalState: TInternalState): void => {
            this.setState({
                loaderState: loadedState,
                internalState
            })
        }

        render() {
            if (!this.state.loaderState || this.context.dataLoader.isServerSideRender && this.props.clientLoadOnly) {
                return null
            }

            // These are the actions available for the renderData callback
            const availableActions = actions
                ? actions(
                    this.context.dataLoader,
                    this.props,
                    this.state.internalState)
                : undefined

            return this.props.renderData(
                this.state.loaderState,
                availableActions,
            )
        }
    }

    return DataLoader
}
