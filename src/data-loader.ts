import React from 'react'
import { DataLoaderContextComponent, ensureContext } from './data-loader-context'
import { DataLoaderStoreAndLoader } from './data-loader-store-and-loader'
import { LoaderState } from './data-loader-state'
import cuid from 'cuid'

export type RenderData<T, TActions> = (
    loaderProps: LoaderState<T>,
    actions: TActions
) => React.ReactElement<any> | null

export interface Props<T, TActions> {
    /** The id of the resource */
    resourceId: string
    clientLoadOnly?: boolean
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
export interface ActionContext<TResource, TDataLoaderParams> {
    context: DataLoaderStoreAndLoader | undefined
    props: Readonly<{ children?: React.ReactNode }> &
        Readonly<Props<TResource, any> & TDataLoaderParams>
}

export type DataLoaderAction<TResource, TDataLoaderParams> = (
    this: ActionContext<TResource, TDataLoaderParams>
) => void

export function createTypedDataLoader<
    TResource,
    TDataLoaderParams,
    TInternalState extends object,
    TActions extends {
        // We bind this so we can reuse the same function so actions do not cause
        // PureComponent's to re-render
        [actionName: string]: DataLoaderAction<TResource, TDataLoaderParams>
    }
>(
    resourceType: string,
    // initialInternalState: TInternalState,
    /** Callback to provide additional actions */
    actions: TActions
): Return<TResource, TActions, TDataLoaderParams> {
    type ComponentProps = Props<TResource, TActions> & TDataLoaderParams
    type ComponentState = State<TResource, TInternalState>

    class DataLoader extends React.Component<ComponentProps, ComponentState>
        implements ActionContext<TResource, TDataLoaderParams> {
        static contextType = DataLoaderContextComponent
        static displayName = `DataLoader(${resourceType})`

        context!: React.ContextType<typeof DataLoaderContextComponent>
        // Need to capture actions, otherwise instances will share bound actions
        actions: TActions
        id: string

        constructor(
            props: ComponentProps,
            context: React.ContextType<typeof DataLoaderContextComponent>
        ) {
            super(props, context)

            // Bind each action to the instance of this data loader
            // so the actions can access current state/props when they need to
            const boundActions: any = {}
            Object.keys(actions).forEach(key => {
                boundActions[key] = actions[key].bind(this)
            })

            this.actions = boundActions
            this.id = cuid()
        }

        getParams(props: ComponentProps) {
            const { clientLoadOnly, renderData, ...rest } = props

            // TODO Unsure why we need the cast, figure out later or write a test to protect
            // against adding more internal props
            return rest as { resourceId: string } & TDataLoaderParams
        }

        componentDidMount() {
            ensureContext(this.context).attach(this.id, () => this.forceUpdate())
        }

        componentWillUnmount() {
            ensureContext(this.context).detach(this.id)
        }

        render() {
            const context = ensureContext(this.context)
            if (context.isServerSideRender && this.props.clientLoadOnly) {
                return null
            }

            const loaderState = context.getDataLoaderState(
                this.id,
                resourceType,
                this.getParams(this.props)
            )

            return this.props.renderData(loaderState, this.actions)
        }
    }

    return DataLoader
}
