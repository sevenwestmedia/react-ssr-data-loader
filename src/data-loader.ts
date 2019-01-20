import React from 'react'
import { DataLoaderContextComponent, ensureContext } from './data-loader-context'
import { ActionResult } from './data-loader-store-and-loader'
import { LoaderState } from './data-loader-state'
import cuid from 'cuid'

export type RenderData<T, TActions> = (
    loaderProps: LoaderState<T>,
    actions: UserActions<keyof TActions>
) => React.ReactElement<any> | null

export interface Props<T, TActions> {
    clientLoadOnly?: boolean
    renderData: RenderData<T, TActions>
}

interface State<TInternalState extends object> {
    internalState: TInternalState
}

export type Return<TResource, TActions, TDataLoaderParams> = React.ComponentClass<
    Props<TResource, TActions> & TDataLoaderParams
>

export type DataLoaderAction<TInternalState> = (
    internalState: TInternalState
) => ActionResult<TInternalState>

export interface DataLoaderActions<TInternalState> {
    [actionName: string]: DataLoaderAction<TInternalState>
}

export type UserActions<TActions extends string | number | symbol> = {
    [action in TActions]: () => void
}

export function createTypedDataLoader<
    TResource,
    TDataLoaderParams extends {},
    TInternalState extends {},
    TActions extends DataLoaderActions<TInternalState>
>(
    resourceType: string,
    initialInternalState: TInternalState,
    /** Callback to provide additional actions */
    actions: TActions
): Return<TResource, TActions, TDataLoaderParams> {
    type ComponentProps = Props<TResource, TActions> & TDataLoaderParams
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
            context: React.ContextType<typeof DataLoaderContextComponent>
        ) {
            super(props, context)

            const userActions: any = {}
            Object.keys(actions).forEach(key => {
                userActions[key] = () => {
                    const actionResult = actions[key](this.state.internalState)
                    // This will trigger loading/resolving of the data for the new internal state
                    ensureContext(this.context).getDataLoaderState(
                        this.id,
                        resourceType,
                        this.getParams(this.props),
                        actionResult.newInternalState,
                        actionResult.keepData,
                        actionResult.refresh
                    )

                    // We can then set internal state, which will cause a re-render
                    // calling the above method without refreshing/keeping data flags
                    this.setState({
                        internalState: actionResult.newInternalState
                    })
                }
            })

            this.id = cuid()
            this.userActions = userActions
            this.state = {
                internalState: initialInternalState
            }
        }

        getParams(props: ComponentProps): TDataLoaderParams & TInternalState {
            const { clientLoadOnly, renderData, ...rest } = props

            // Need to figure out why we need the casts here
            return { ...((rest as unknown) as TDataLoaderParams), ...this.state.internalState }
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
                this.getParams(this.props),
                this.state.internalState
            )

            return this.props.renderData(loaderState, this.userActions)
        }
    }

    return DataLoader
}
