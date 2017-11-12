import * as React from 'react'
import { Props, createTypedDataLoader, ActionContext } from './data-loader'

export type LoadResource<TData, TResourceParameters> = (
    resourceId: string,
    resourceParameters: TResourceParameters,
    existingData: TData
) => Promise<TData> | TData

interface Resources {
    [dataType: string]: LoadResource<any, any>
}

export interface PagedData<Datum> {
    pageNumber: number
    data: Datum[]
}
export type RefreshAction = { refresh: () => void }
export type PageActions = { nextPage: () => void } & RefreshAction
export interface Paging {
    /** Defaults to 0 */
    initialOffset?: number
    /** Overrides pageSize for initial page */
    initialSize?: number
    pageSize: number
    /**
     * If true, new page data gets appended to existing data
     * if false, only the current page will be kept
     * Defaults to true
     */
    keepPreviousPagesData?: boolean
}
export type PageComponentProps = { paging: Paging }
type PageState = { page: number }

/** TAdditionalParameters is the type passed to `additionalLoaderProps` on the DataProvider */
export default class DataLoaderResources<TAdditionalParameters> {
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
        const typedDataLoader = createTypedDataLoader<
            TData,
            TResourceParameters,
            {},
            RefreshAction
        >(
            resourceType,
            {},
            {
                refresh(this: ActionsThis) {
                    return this.context.dataLoader.refresh({
                        resourceType,
                        resourceId: this.props.resourceId,
                        resourceLoadParams: this.props,
                        internalState: this.internalState
                    })
                }
            }
        )
        this.resources[resourceType] = loadResource

        return typedDataLoader
    }

    /** Page numbers start at 1 */
    registerPagedResource<TData>(
        resourceType: string,
        loadResource: (resourceId: string, paging: Paging, page: number) => Promise<TData[]>
    ): React.ComponentClass<Props<PagedData<TData>, PageActions> & PageComponentProps> {
        if (this.resources[resourceType]) {
            throw new Error(`The resource type ${resourceType} has already been registered`)
        }

        type ActionsThis = ActionContext<TData, PageComponentProps, PageState>
        const typedDataLoader = createTypedDataLoader<
            PagedData<TData>,
            PageComponentProps,
            PageState,
            PageActions
        >(
            resourceType,
            { page: 1 },
            {
                refresh(this: ActionsThis) {
                    return this.context.dataLoader.refresh({
                        resourceType,
                        resourceId: this.props.resourceId,
                        resourceLoadParams: {
                            paging: { ...this.props.paging, keepPreviousPagesData: false }
                        },
                        internalState: { page: 1 }
                    })
                },
                // Loads next page
                nextPage(this: ActionsThis) {
                    return this.context.dataLoader.nextPage({
                        resourceType,
                        resourceId: this.props.resourceId,
                        resourceLoadParams: {
                            paging: { keepPreviousPagesData: true, ...this.props.paging }
                        },
                        internalState: { page: this.internalState().page + 1 }
                    })
                }
            }
        )

        // This async function performs the loading of the paged data
        // it takes care of passing the correct params to the loadResource function
        // then merging the new data when it comes back
        this.resources[resourceType] = async (
            dataKey,
            pageInfo: PageComponentProps & { page: number },
            existingData: PagedData<TData>
        ): Promise<PagedData<TData>> => {
            const pageNumber = pageInfo && pageInfo.page ? pageInfo.page : 1
            const data = await loadResource(dataKey, pageInfo.paging, pageNumber)
            if (existingData && existingData.data && pageInfo.paging.keepPreviousPagesData) {
                return {
                    pageNumber,
                    data: [...existingData.data, ...data]
                }
            }

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
