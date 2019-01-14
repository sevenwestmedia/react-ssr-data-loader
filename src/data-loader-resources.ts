import React from 'react'
import shallowEqual from 'shallowequal'
import { Props, createTypedDataLoader, ActionContext, DataLoaderAction } from './data-loader'
import { ensureContext } from './data-loader-context'
import objectHash from 'object-hash'

export type LoadResource<TData, TResourceParameters> = (
    resourceParameters: TResourceParameters
) => Promise<TData> | TData

interface Resources {
    [dataType: string]: LoadResource<any, any>
}

export interface PagedData<Data> {
    pageNumber: number
    data: Data
}

export interface RefreshAction {
    refresh: () => void
    [actionName: string]: DataLoaderAction<any, any, any>
}
export type PageActions = { nextPage: () => void } & RefreshAction
export interface Paging {
    /** Defaults to 0 */
    initialOffset?: number
    /** Overrides pageSize for initial page */
    initialSize?: number
    pageSize: number
}
export interface PageComponentProps {
    paging: Paging
}
interface PageState {
    page: number
}

/** TAdditionalParameters is the type passed to `additionalLoaderProps` on the DataProvider */
export class DataLoaderResources<TAdditionalParameters> {
    private resources: Resources = {}

    /**
     * When using parameterised resources you cannot have multiple instances of the returned data loader
     * with the same resourceId.
     */
    registerResource<TData, TResourceParameters>(
        resourceType: string,
        loadResource: LoadResource<TData, TResourceParameters & TAdditionalParameters>
    ): React.ComponentClass<Props<TData, RefreshAction> & TResourceParameters> {
        if (this.resources[resourceType]) {
            throw new Error(`The resource type ${resourceType} has already been registered`)
        }

        type ActionsThis = ActionContext<TData, TResourceParameters, {}>
        const actions = {
            update(this: ActionsThis) {
                if (!this.nextProps) {
                    throw new Error(
                        'Check the componentWillUpdate function of the data-loader, nextProps should not be undefined'
                    )
                }

                const { renderData: _, ...others } = this.nextProps
                const { renderData: __, ...prevOthers } = this.props

                if (shallowEqual(others, prevOthers)) {
                    return
                }

                // This is a double dispatch, so nextProps will never be undefined
                ensureContext(this.context).update(this.actionMeta(this.nextProps))
            },
            refresh(this: ActionsThis) {
                return ensureContext(this.context).refresh(this.actionMeta(this.props))
            }
        }
        const typedDataLoader = createTypedDataLoader<
            TData,
            TResourceParameters,
            {},
            RefreshAction
        >(resourceType, {}, actions)
        this.resources[resourceType] = loadResource

        return typedDataLoader
    }

    /** Page numbers start at 1 */
    registerPagedResource<TParams, TData>(
        resourceType: string,
        loadResource: (params: TParams, paging: Paging, page: number) => Promise<TData>
    ): React.ComponentClass<Props<PagedData<TData> & TParams, PageActions> & PageComponentProps> {
        if (this.resources[resourceType]) {
            throw new Error(`The resource type ${resourceType} has already been registered`)
        }

        type ActionsThis = ActionContext<TData, PageComponentProps, PageState>
        const actions = {
            update(this: ActionsThis) {
                if (!this.nextProps) {
                    throw new Error(
                        'Check the componentWillUpdate function of the data-loader, nextProps should not be undefined'
                    )
                }

                const { renderData: _, paging, ...others } = this.nextProps
                const { renderData: __, paging: prevPaging, ...prevOthers } = this.props

                if (shallowEqual(paging, prevPaging) && shallowEqual(others, prevOthers)) {
                    return
                }

                const resourceLoadParams = {
                    paging: {
                        ...this.nextProps.paging
                    }
                }
                ensureContext(this.context).update({
                    resourceType,
                    resourceLoadParamsHash: objectHash(resourceLoadParams),
                    resourceLoadParams,
                    internalState: { page: 1 }
                })
            },
            refresh(this: ActionsThis) {
                return ensureContext(this.context).refresh({
                    resourceType,
                    resourceLoadParams: {
                        paging: {
                            ...this.props.paging
                        }
                    },
                    internalState: { page: 1 }
                })
            },
            // Loads next page
            nextPage(this: ActionsThis) {
                return ensureContext(this.context).nextPage({
                    resourceType,
                    resourceLoadParams: {
                        paging: this.props.paging
                    },
                    internalState: { page: this.internalState().page + 1 }
                })
            }
        }
        const typedDataLoader = createTypedDataLoader<
            PagedData<TData>,
            PageComponentProps,
            PageState,
            PageActions
        >(resourceType, { page: 1 }, actions)

        // This async function performs the loading of the paged data
        // it takes care of passing the correct params to the loadResource function
        // then merging the new data when it comes back
        this.resources[resourceType] = async (
            pageInfo: PageComponentProps & { page: number } & TParams
        ): Promise<PagedData<TData>> => {
            const pageNumber = pageInfo && pageInfo.page ? pageInfo.page : 1
            const data = await loadResource(pageInfo, pageInfo.paging, pageNumber)

            return {
                pageNumber,
                data
            }
        }

        return typedDataLoader
    }

    getResourceLoader(dataType: any): LoadResource<any, any> {
        return this.resources[dataType]
    }
}
