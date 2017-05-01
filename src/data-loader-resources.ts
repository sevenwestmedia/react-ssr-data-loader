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

    /** WARNING: If you use multiple instances of this data loader
     * the second 
     */
    registerResourceWithParameters<T extends object, TData>(
        dataType: string, loadResource: (dataKey: string, resourceParameters: T, existingData: TData) => Promise<TData>
    ): React.ComponentClass<Props<TData, {}> & T> {
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
        dataType: string, loadResource: (dataKey: string, paging: Paging, page: number) => Promise<TData[]>
    ): React.ComponentClass<Props<PagedData<TData>, PageActions> & { paging: Paging }> {
        const typedDataLoader = createTypedDataLoader<PagedData<TData>, PageProps, PageActions>(
            dataType,
            (dataLoaderContext, props, _handleUpdate) => {
                const metadata = {
                    dataType,
                    dataKey: props.dataKey,
                    dataParams: { paging: props.paging, page: 1 }
                }
                return {
                    // Refresh action needs to reset to 1st page
                    refresh: () => dataLoaderContext.refresh(metadata),
                    // Loads next page
                    nextPage: () => dataLoaderContext.nextPage(metadata),
                }
            }
        )

        this.resources[dataType] = async (dataKey, pageInfo: PageProps, existingData: PagedData<TData>): Promise<PagedData<TData>> => {
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