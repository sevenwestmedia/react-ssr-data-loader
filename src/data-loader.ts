import * as React from 'react'
import { LoaderState } from './'
import { DataLoaderContext } from './data-provider'
import { DataUpdateCallback } from './subscriptions'
import * as shallowCompare from 'react-addons-shallow-compare'
import * as PropTypes from 'prop-types'

export type RenderData<T, TActions> = (
    loaderProps: LoaderState<T>,
    actions: TActions
) => React.ReactElement<any> | null

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

export type Return<TResource, TActions, TDataLoaderParams> = React.ComponentClass<
    Props<TResource, TActions> & TDataLoaderParams
>
export type Context = { dataLoader: DataLoaderContext }

// The `createTypedDataLoader` function needs to exist because for each
// resource we need a new react component
// The function provides a closure for anything specific to that resource

/**
 * TDataLoaderParams is the type of the arguments to load the resource
 *
 * TActions is the type of additional actions provided by the renderData function
 * (in addition to the BuildInActions like refresh)
 *
 * TInternalState allows a resource to track some sort of state without
 * exposing it to the end user. This is where the current page number
 * is stored for instance
 */
export type ActionContext<TResource, TDataLoaderParams, TInternalState> = {
    context: Context
    props: Readonly<{ children?: React.ReactNode }> &
        Readonly<Props<TResource, any> & TDataLoaderParams>
    internalState: () => TInternalState
}

export function createTypedDataLoader<
    TResource,
    TDataLoaderParams,
    TInternalState extends object,
    TActions extends {
        // We bind this so we can reuse the same function so actions do not cause
        // PureComponent's to re-render
        [actionName: string]: (
            this: ActionContext<TResource, TDataLoaderParams, TInternalState>
        ) => void
    }
>(
    resourceType: string,
    initialInternalState: TInternalState,
    /** Callback to provide additional actions */
    actions: TActions
): Return<TResource, TActions, TDataLoaderParams> {
    type ComponentProps = Props<TResource, TActions> & TDataLoaderParams
    type ComponentState = State<TResource, TInternalState>

    class DataLoader extends React.PureComponent<ComponentProps, ComponentState>
        implements ActionContext<TResource, TDataLoaderParams, TInternalState> {
        static contextTypes = {
            dataLoader: PropTypes.object
        }
        // Need to capture actions, otherwise instances will share bound actions
        actions: TActions
        context: Context
        state: ComponentState = {
            internalState: initialInternalState
        }
        private _isMounted: boolean

        constructor(props: ComponentProps, context: Context) {
            super(props, context)

            // Bind each action to the instance of this data loader
            // so the actions can access current state/props when they need to
            const boundActions: any = {}
            Object.keys(actions).forEach(key => {
                boundActions[key] = actions[key].bind(this)
            })
            this.actions = boundActions

            if (this.context.dataLoader.isServerSideRender && this.props.clientLoadOnly) {
                return
            }

            this.context.dataLoader.loadData(this.actionMeta(), this.handleStateUpdate)
        }

        componentWillMount() {
            this._isMounted = true
        }

        componentWillReceiveProps(readOnlyNextProps: any) {
            // The types are Readonly<P>, TypeScript limitations with unions, generics etc cause
            // this to be required for TS > 2.4
            const nextProps: ComponentProps = readOnlyNextProps
            if (
                // When the resource params has changed we need to update the resource data
                // This happens when the loader is used on a page which can be
                // routed to different content
                // For example a blog entry, which navigates to another blog entry

                // We can use Reacts shallow compare because we force the params to be flattened
                // onto the component, rather than having a params prop which contains everything
                // We also always want to only take props into account, so this.state is intentially passed
                shallowCompare(this, nextProps, this.state)
            ) {
                if (this.props.resourceId !== nextProps.resourceId) {
                    this.unloadOrDetachData()
                    this.context.dataLoader.loadData(
                        this.actionMeta(nextProps),
                        this.handleStateUpdate
                    )
                    return
                }

                this.context.dataLoader.update(this.actionMeta(nextProps))
            }
        }

        componentWillUnmount() {
            this._isMounted = false
            // TODO This was missing and no tests were failing... Add test
            this.unloadOrDetachData()
        }

        unloadOrDetachData() {
            if (this.props.unloadDataOnUnmount === false) {
                this.context.dataLoader.detach(this.actionMeta(), this.handleStateUpdate)
            } else {
                this.context.dataLoader.unloadData(this.actionMeta(), this.handleStateUpdate)
            }
        }

        internalState = () => {
            return this.state.internalState
        }

        render() {
            if (
                !this.state.loaderState ||
                (this.context.dataLoader.isServerSideRender && this.props.clientLoadOnly)
            ) {
                return null
            }

            return this.props.renderData(this.state.loaderState, this.actions)
        }

        private actionMeta = (props: Props<TResource, TActions> = this.props) => {
            const {
                resourceId,
                clientLoadOnly,
                renderData,
                unloadDataOnUnmount,
                ...resourceLoadParams
            } = props

            // TODO Add type safety here, am turning the remaing props into resourceLoadParams
            // For example this could be paging into, or any other data which needs
            // to be passed through the data loader to the resource loading function
            return {
                resourceType,
                resourceId,
                resourceLoadParams,
                internalState: this.state.internalState
            }
        }

        private handleStateUpdate: DataUpdateCallback = (
            loadedState: LoaderState<TResource>,
            internalState: TInternalState
        ): void => {
            // If we are not mounted yet we should just load the state in
            if (!this._isMounted) {
                this.state = {
                    loaderState: loadedState,
                    internalState
                }
                return
            }
            // Don't set state during SSR
            if (this.context.dataLoader.isServerSideRender) {
                return
            }
            this.setState({
                loaderState: loadedState,
                internalState
            })
        }
    }

    return DataLoader
}
