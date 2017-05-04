import * as React from 'react'
import { Props, createTypedDataLoader } from './data-loader'
import { ResourceLoadInfo } from './data-loader-actions'

export type LoadResource<TData, TResourceParameters> = (
    resourceId: string,
    resourceParameters: TResourceParameters,
    existingData: TData
) => Promise<TData>

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
}
export type PageComponentProps =  { paging: Paging }
type PageState = { page: number }

export default class DataLoaderResources {
    private resources: Resources = {}

    /**
     * When using parameterised resources you cannot have multiple instances of the returned data loader
     * with the same resourceId.
     */
    registerResource<TData, TResourceParameters>(
        resourceType: string,
        loadResource: LoadResource<TData, TResourceParameters>
    ): React.ComponentClass<Props<TData, RefreshAction> & TResourceParameters> {
        const typedDataLoader = createTypedDataLoader<TData, TResourceParameters, {}, RefreshAction>(
            resourceType, 
            {},
            (dataLoaderContext, props, internalState) => {
                return {
                    refresh: () => dataLoaderContext.refresh({
                        resourceType,
                        resourceId: props.resourceId,
                        resourceLoadParams: props,
                        internalState,
                    })
                }
            })
        this.resources[resourceType] = loadResource

        return typedDataLoader
    }

    /** Page numbers start at 1 */
    registerPagedResource<TData>(
        resourceType: string,
        loadResource: (resourceId: string, paging: Paging, page: number) => Promise<TData[]>
    ): React.ComponentClass<Props<PagedData<TData>, PageActions> & PageComponentProps> {
        const typedDataLoader = createTypedDataLoader<PagedData<TData>, PageComponentProps, PageState, PageActions>(
            resourceType,
            { page: 1 },
            (dataLoaderContext, props, internalState) => {
                const getResourceInfo = (): ResourceLoadInfo<PageComponentProps, PageState> => ({
                    resourceType,
                    resourceId: props.resourceId,
                    resourceLoadParams: { paging: props.paging },
                    internalState,
                })
                return {
                    refresh: () => dataLoaderContext.refresh(getResourceInfo()),
                    // Loads next page
                    nextPage: () => dataLoaderContext.nextPage({
                        ...getResourceInfo(),
                        internalState: { page: internalState.page + 1 }
                    }),
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

    getResourceLoader(dataType: any): LoadResource<any, any> {
        return this.resources[dataType]
    }
}