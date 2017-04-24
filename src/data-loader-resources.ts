import * as React from 'react'
import { Props, createTypedDataLoader } from './data-loader'

export type LoadResource = (dataKey: string, resourceParameters?: any, existingData?: any) => Promise<any>
interface Resources {
    [dataType: string]: LoadResource
}

export interface PagedData<Datum> {
    pageNumber: number
    data: Datum[]
}
export type PageActions = { nextPage: () => void }

export default class DataLoaderResources {
    private resources: Resources = {}

    /** WARNING: If you use multiple instances of this data loader
     * the second 
     */
    registerResourceWithParameters<T, TData>(
        dataType: string, loadResource: (dataKey: string, resourceParameters?: T) => Promise<TData>
    ): React.ComponentClass<Props<TData, {}>> {
        const typedDataLoader = createTypedDataLoader<TData, T, {}>(dataType, () => ({}))
        this.resources[dataType] = loadResource

        return typedDataLoader
    }


    registerResource<TData>(
        dataType: string, loadResource: (dataKey: string) => Promise<TData>
    ): React.ComponentClass<Props<TData, {}>> {
        const typedDataLoader = createTypedDataLoader<TData, {}, {}>(dataType, () => ({}))
        this.resources[dataType] = loadResource

        return typedDataLoader
    }

    /** Page numbers start at 1 */
    registerPagedResource<TData>(
        dataType: string, loadResource: (dataKey: string, page: number) => Promise<TData[]>
    ): React.ComponentClass<Props<PagedData<TData>, PageActions>> {
        type PageInfo = { page: number }
        const typedDataLoader = createTypedDataLoader<PagedData<TData>, PageInfo, PageActions>(
            dataType,
            (dataLoaderContext, props, handleUpdate) => {
                const metadata = {
                    dataType,
                    dataKey: props.dataKey,
                    dataParams: { page: 1 }
                }
                return {
                    // Refresh action needs to reset to 1st page
                    refresh: () => dataLoaderContext.refresh(metadata),
                    // Loads next page
                    nextPage: () => dataLoaderContext.nextPage(metadata),
                }
            }
        )

        this.resources[dataType] = async (dataKey, pageInfo: PageInfo, existingData: PagedData<TData>): Promise<PagedData<TData>> => {
            const pageNumber = pageInfo && pageInfo.page ? pageInfo.page : 1
            const data = await loadResource(dataKey, pageNumber)
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