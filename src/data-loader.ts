import * as React from 'react'
import { LoaderState } from './'
import { DataLoaderContext } from './data-provider'

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

type State<T> = {
    loaderState: LoaderState<T>
}

// This function needs to exist because for each resource we need a new react component
// The function provides a closure for anything specific to the resource
/**
 * TLoadResourceParams is the type of the arguments to load the resource
 * TActions is the type of additional actions provided by the renderData function (in addition to the BuildInActions like refresh)
 */
export function createTypedDataLoader<TResource, TLoadResourceParams, TActions extends object>(
    resourceType: string,
    /** Callback to provide additional actions */
    actions?: (
        dataLoader: DataLoaderContext,
        props: Props<TResource, TActions> & TLoadResourceParams,
        handleStateUpdates: (loadedState: LoaderState<TResource>) => void
    ) => TActions
) : React.ComponentClass<Props<TResource, TActions> & TLoadResourceParams> {
    class DataLoader extends React.PureComponent<Props<TResource, TActions> & TLoadResourceParams, State<TResource>> {
        static contextTypes = {
            dataLoader: React.PropTypes.object
        }
        context: { dataLoader: DataLoaderContext }
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
            }
        }

        private handleStateUpdate = (loadedState: LoaderState<TResource>): void => {
            this.setState({
                loaderState: loadedState,
            })
        }

        render() {
            if (this.context.dataLoader.isServerSideRender && this.props.clientLoadOnly) {
                return null
            }

            // These are the actions available for the renderData callback
            const availableActions = this.state.loaderState.data.hasData && actions
                ? actions(this.context.dataLoader, this.props, this.handleStateUpdate)
                : undefined

            return this.props.renderData(
                this.state.loaderState,
                availableActions,
            )
        }
    }

    return DataLoader
}
