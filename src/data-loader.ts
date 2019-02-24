import React from 'react'
import { DataLoaderContextComponent, ensureContext } from './data-loader-context'
import { ActionResult } from './data-loader-store-and-loader'
import { LoaderState } from './data-loader-state'
import cuid from 'cuid'

export type RenderData<TData, TActions, TParams> = (
    loaderProps: LoaderState<TData, TParams>,
    actions: UserActions<keyof TActions>,
    params: TParams,
) => React.ReactElement<any> | null

export interface Props<T, TActions, TParams> {
    clientLoadOnly?: boolean
    renderData: RenderData<T, TActions, TParams>
}

interface State<TInternalState extends object> {
    internalState: TInternalState
}

export type Return<TResource, TActions, TDataLoaderParams, TInternalState> = React.ComponentClass<
    Props<TResource, TActions, TDataLoaderParams & TInternalState> & TDataLoaderParams
>

export type DataLoaderAction<TInternalState, TData, TParams> = (
    internalState: TInternalState,
    loaderState: LoaderState<TData, TParams>,
) => ActionResult<TInternalState> | null

export interface DataLoaderActions<TInternalState, TData, TParams> {
    [actionName: string]: DataLoaderAction<TInternalState, TData, TParams>
}

export type UserActions<TActions extends string | number | symbol> = {
    [action in TActions]: () => void
}

export function createTypedDataLoader<
    TResource,
    TDataLoaderParams extends {},
    TInternalState extends {},
    TActions extends DataLoaderActions<TInternalState, TResource, TDataLoaderParams>
>(
    resourceType: string,
    initialInternalState: TInternalState,
    /** Callback to provide additional actions */
    actions: TActions,
): Return<TResource, TActions, TDataLoaderParams, TInternalState> {
    type ComponentProps = Props<TResource, TActions, TDataLoaderParams & TInternalState> &
        TDataLoaderParams
    type ComponentState = State<TInternalState>

    class DataLoader extends React.Component<ComponentProps, ComponentState> {
        static contextType = DataLoaderContextComponent
        static displayName = `DataLoader(${resourceType})`

        context!: React.ContextType<typeof DataLoaderContextComponent>
        // Need to capture actions, otherwise instances will share bound actions
        userActions: UserActions<keyof TActions>
        id: string

        constructor(
            props: ComponentProps,
            context: React.ContextType<typeof DataLoaderContextComponent>,
        ) {
            super(props, context)

            const userActions: any = {}
            Object.keys(actions).forEach(key => {
                userActions[key] = () => {
                    const currentState = ensureContext(this.context).getDataLoaderState(
                        this.id,
                        resourceType,
                        this.getParams(this.props, this.state.internalState),
                    )
                    const actionResult = actions[key](this.state.internalState, currentState)
                    if (actionResult === null) {
                        return
                    }

                    // This will trigger loading/resolving of the data for the new internal state
                    ensureContext(this.context).getDataLoaderState(
                        this.id,
                        resourceType,
                        this.getParams(this.props, actionResult.newInternalState),
                        actionResult.keepData,
                        actionResult.refresh,
                    )

                    // We can then set internal state, which will cause a re-render
                    // calling the above method without refreshing/keeping data flags
                    this.setState({
                        internalState: actionResult.newInternalState,
                    })
                }
            })

            this.id = cuid()
            this.userActions = userActions
            this.state = {
                internalState: initialInternalState,
            }
        }

        getParams(
            props: ComponentProps,
            internalState: TInternalState,
        ): TDataLoaderParams & TInternalState {
            const { clientLoadOnly, renderData, ...rest } = props

            // Need to figure out why we need the casts here
            return { ...((rest as unknown) as TDataLoaderParams), ...internalState }
        }

        componentDidMount() {
            ensureContext(this.context).attach(
                this.id,
                resourceType,
                this.getParams(this.props, this.state.internalState),
                () => this.forceUpdate(),
            )
        }

        componentWillUnmount() {
            ensureContext(this.context).detach(
                this.id,
                resourceType,
                this.getParams(this.props, this.state.internalState),
            )
        }

        render() {
            const context = ensureContext(this.context)
            if (context.isServerSideRender && this.props.clientLoadOnly) {
                return null
            }

            const params = this.getParams(this.props, this.state.internalState)
            const loaderState = context.getDataLoaderState(this.id, resourceType, params)

            return this.props.renderData(loaderState, this.userActions, params)
        }
    }

    return DataLoader
}
