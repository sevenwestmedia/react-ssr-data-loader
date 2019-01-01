import React from 'react'
import { DataLoaderContext, DataLoaderContextComponent, ensureContext } from './data-loader-context'
import { DataUpdateCallback } from './subscriptions'
import { ResourceLoadInfo, LoaderState } from './data-loader-state'

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

interface State<T, TInternalState extends object> {
    loaderState?: LoaderState<T>
    internalState: TInternalState
}

export type Return<TResource, TActions, TDataLoaderParams> = React.ComponentClass<
    Props<TResource, TActions> & TDataLoaderParams
>

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
export interface ActionContext<TResource, TDataLoaderParams, TInternalState> {
    context: DataLoaderContext | undefined
    nextProps: Props<TResource, any> & TDataLoaderParams | undefined
    props: Readonly<{ children?: React.ReactNode }> &
        Readonly<Props<TResource, any> & TDataLoaderParams>
    internalState: () => TInternalState
    actionMeta: (
        props: Props<TResource, any> & TDataLoaderParams
    ) => ResourceLoadInfo<any, TInternalState>
}

export type DataLoaderAction<TResource, TDataLoaderParams, TInternalState> = (
    this: ActionContext<TResource, TDataLoaderParams, TInternalState>
) => void

export function createTypedDataLoader<
    TResource,
    TDataLoaderParams,
    TInternalState extends object,
    TActions extends {
        // We bind this so we can reuse the same function so actions do not cause
        // PureComponent's to re-render
        [actionName: string]: DataLoaderAction<TResource, TDataLoaderParams, TInternalState>
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
        static contextType = DataLoaderContextComponent
        static displayName = `DataLoader(${resourceType})`

        context!: React.ContextType<typeof DataLoaderContextComponent>
        // Need to capture actions, otherwise instances will share bound actions
        actions: TActions
        state: ComponentState = {
            internalState: initialInternalState
        }
        nextProps: ComponentProps | undefined

        // tslint:disable-next-line:variable-name
        private _isMounted: boolean = false

        constructor(props: ComponentProps) {
            super(props)

            // Bind each action to the instance of this data loader
            // so the actions can access current state/props when they need to
            const boundActions: any = {}
            Object.keys(actions).forEach(key => {
                boundActions[key] = actions[key].bind(this)
            })
            this.actions = boundActions

            const context = ensureContext(this.context)
            if (context.isServerSideRender && this.props.clientLoadOnly) {
                return
            }

            context.loadData(this.actionMeta(), this.handleStateUpdate)
        }

        componentDidMount() {
            this._isMounted = true
        }

        componentWillReceiveProps(readOnlyNextProps: any) {
            this.nextProps = readOnlyNextProps as any

            try {
                // The types are Readonly<P>, TypeScript limitations with unions, generics etc cause
                // this to be required for TS > 2.4
                const nextProps: ComponentProps = readOnlyNextProps

                if (this.props.resourceId !== nextProps.resourceId) {
                    this.unloadOrDetachData()
                    ensureContext(this.context).loadData(
                        this.actionMeta(nextProps),
                        this.handleStateUpdate
                    )
                    return
                }

                // When registering resource types, we register a hidden action
                // which only performs the update if properties have changes
                // it excludes things like renderData and paging info to make the check
                // useful.
                // Also paging has hooks to make update act like refresh
                if (this.actions.update) {
                    ;(this.actions as any).update()
                } else {
                    ensureContext(this.context).update(this.actionMeta(nextProps))
                }
            } finally {
                this.nextProps = undefined
            }
        }

        componentWillUnmount() {
            this._isMounted = false
            // TODO This was missing and no tests were failing... Add test
            this.unloadOrDetachData()
        }

        unloadOrDetachData() {
            if (this.props.unloadDataOnUnmount === false) {
                ensureContext(this.context).detach(this.actionMeta(), this.handleStateUpdate)
            } else {
                ensureContext(this.context).unloadData(this.actionMeta(), this.handleStateUpdate)
            }
        }

        internalState = () => {
            return this.state.internalState
        }

        render() {
            if (
                !this.state.loaderState ||
                (ensureContext(this.context).isServerSideRender && this.props.clientLoadOnly)
            ) {
                return null
            }

            return this.props.renderData(this.state.loaderState, this.actions)
        }

        actionMeta = (props: Props<TResource, TActions> = this.props) => {
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
            if (ensureContext(this.context).isServerSideRender) {
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
