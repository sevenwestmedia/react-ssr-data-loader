import cuid from 'cuid'
import useForceUpdate from 'use-force-update'
import { useContext, useState, useEffect } from 'react'
import { DataLoaderContextComponent, ensureContext } from './data-loader-context'
import { ActionResult } from './data-loader-store-and-loader'
import { LoaderState, LoaderStatus } from './data-loader-state'

export type DataLoaderAction<TInternalState, TData> = (
    internalState: TInternalState,
    loaderState: LoaderState<TData>,
) => ActionResult<TInternalState> | null

export type DataLoaderActions<Actions extends string, InternalState, Data> = {
    [actionName in Actions]: DataLoaderAction<InternalState, Data>
}

export type UserActions<TActions extends string | number | symbol> = {
    [action in TActions]: () => void
}

export function createUseRegisteredResourceHook<
    ResourceData,
    ResourceLoadParams extends {},
    TInternalState extends {},
    Actions extends string
>(
    resourceType: string,
    initialInternalState: TInternalState,
    /** Callback to provide additional actions */
    actions: DataLoaderActions<Actions, TInternalState, ResourceData>,
) {
    return function useRegisteredResource(
        dataLoadParams: ResourceLoadParams,
        options: {
            clientLoadOnly?: boolean
        } = {},
    ): LoaderState<ResourceData> & {
        actions: UserActions<Actions>
        params: ResourceLoadParams
    } {
        const dataLoader = useContext(DataLoaderContextComponent)
        const [id] = useState(cuid())
        const [internalState, setInternalState] = useState(initialInternalState)
        const forceUpdate = useForceUpdate()

        const userActions: any = {}
        Object.keys(actions).forEach((key) => {
            userActions[key] = () => {
                const currentState = ensureContext(dataLoader).getDataLoaderState(
                    id,
                    resourceType,
                    getParams(dataLoadParams, internalState),
                )
                const actionResult = actions[key as Actions](internalState, currentState)
                if (actionResult === null) {
                    return
                }

                // This will trigger loading/resolving of the data for the new internal state
                ensureContext(dataLoader).getDataLoaderState(
                    id,
                    resourceType,
                    getParams(dataLoadParams, actionResult.newInternalState),
                    actionResult.keepData,
                    actionResult.refresh,
                )

                // We can then set internal state, which will cause a re-render
                // calling the above method without refreshing/keeping data flags
                setInternalState(actionResult.newInternalState)
            }
        })

        useEffect(() => {
            ensureContext(dataLoader).attach(
                id,
                resourceType,
                getParams(dataLoadParams, internalState),
                () => forceUpdate(),
            )

            return () => {
                ensureContext(dataLoader).detach(
                    id,
                    resourceType,
                    getParams(dataLoadParams, internalState),
                )
            }
        }, [])

        const context = ensureContext(dataLoader)
        const params = getParams(dataLoadParams, internalState)
        if (context.isServerSideRender && options.clientLoadOnly) {
            return {
                actions: userActions,
                status: LoaderStatus.Idle,
                data: { hasData: false },
                lastAction: { type: 'none', success: true },
                params,
            }
        }

        const loaderState = context.getDataLoaderState(id, resourceType, params)

        return { ...loaderState, actions: userActions, params }
    }
}

function getParams(props: any, internalState: any): any {
    const { clientLoadOnly, renderData, ...rest } = props

    return { ...rest, ...internalState }
}
