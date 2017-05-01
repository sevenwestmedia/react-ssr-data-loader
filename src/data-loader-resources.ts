import * as React from 'react'
import { Props, createTypedDataLoader } from './data-loader'

export type LoadResource = (resourceId: string, resourceParameters?: any, existingData?: any) => Promise<any>
interface Resources {
    [dataType: string]: LoadResource
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
}
export type PageProps = { page: number, paging: Paging }

export default class DataLoaderResources {
    private resources: Resources = {}

    /**
     * When using parameterised resources you cannot have multiple instances of the returned data loader
     * with the same resourceId.
     */
    registerResourceWithParameters<TData, TResourceParameters>(
        resourceType: string, loadResource: (resourceId: string, resourceParameters: TResourceParameters, existingData: TData) => Promise<TData>
    ): React.ComponentClass<Props<TData, RefreshAction> & TResourceParameters> {
        const typedDataLoader = createTypedDataLoader<TData, TResourceParameters, RefreshAction>(
            resourceType, 
            (dataLoaderContext, props) => {
                return {
                    refresh: () => dataLoaderContext.refresh({
                        resourceType,
                        resourceId: props.resourceId,
                    })
                }
            })
        this.resources[resourceType] = loadResource

        return typedDataLoader
    }

    registerResource<TData>(
        resourceType: string, loadResource: (resourceId: string) => Promise<TData>
    ): React.ComponentClass<Props<TData, RefreshAction>> {
        return this.registerResourceWithParameters(resourceType, loadResource)
    }

    /** Page numbers start at 1 */
    registerPagedResource<TData>(
        resourceType: string, loadResource: (resourceId: string, paging: Paging, page: number) => Promise<TData[]>
    ): React.ComponentClass<Props<PagedData<TData>, PageActions> & { paging: Paging }> {
        const typedDataLoader = createTypedDataLoader<PagedData<TData>, PageProps, PageActions>(
            resourceType,
            (dataLoaderContext, props) => {
                return {
                    refresh: () => dataLoaderContext.refresh({
                        resourceType,
                        resourceId: props.resourceId,
                        resourceLoadParams: { paging: props.paging, page: 1 },
                    }),
                    // Loads next page
                    nextPage: () => dataLoaderContext.nextPage({
                        resourceType,
                        resourceId: props.resourceId,
                        resourceLoadParams: { paging: props.paging, page: props.page },
                    }),
                }
            }
        )

        // This async function performs the loading of the paged data
        // it takes care of passing the correct params to the loadResource function
        // then merging the new data when it comes back
        this.resources[resourceType] = async (dataKey, pageInfo: PageProps, existingData: PagedData<TData>): Promise<PagedData<TData>> => {
            const pageNumber = pageInfo && pageInfo.page ? pageInfo.page : 1
            const data = await loadResource(dataKey, pageInfo.paging, pageNumber)
            if (existingData && existingData.data) {
                return {
                    pageNumber,
                    data: [...existingData.data, ...data]
                }
            }

            return {
                pageNumber,
                data,
            }
        }

        return typedDataLoader
    }

    getResourceLoader(dataType: any): LoadResource {
        return this.resources[dataType]
    }
}