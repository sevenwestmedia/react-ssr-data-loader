import { createTypedDataLoader, DataLoaderActions } from './data-loader'
import { LoaderStatus } from './data-loader-state'

export type LoadResource<TData, TResourceParameters, TInternalState, TGlobalParameters> = (
    params: { resourceType: string } & TResourceParameters & TInternalState & TGlobalParameters,
) => Promise<TData> | TData

interface Resources {
    [dataType: string]: LoadResource<any, any, any, any>
}

export interface PagedData<Data> {
    pageNumber: number
    data: Data
}

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
export interface PageState {
    page: number
}

/** TGlobalParameters is provided through the data provider, and accessible in all data load function */
export class DataLoaderResources<TGlobalParameters> {
    private resources: Resources = {}

    registerResource<TData, TResourceParameters>(
        resourceType: string,
        loadResource: LoadResource<TData, TResourceParameters, {}, TGlobalParameters>,
        cacheKeyProperties?: Array<keyof TResourceParameters & string>,
    ) {
        if (this.resources[resourceType]) {
            throw new Error(`The resource type ${resourceType} has already been registered`)
        }

        const actions: DataLoaderActions<{}, TData> = {
            refresh(internalState) {
                return {
                    newInternalState: internalState,
                    refresh: true,
                    keepData: true,
                }
            },
        }
        const typedDataLoader = createTypedDataLoader<
            TData,
            TResourceParameters,
            {},
            typeof actions
        >(resourceType, {}, actions, cacheKeyProperties)
        this.resources[resourceType] = loadResource

        return typedDataLoader
    }

    /** Page numbers start at 1 */
    registerPagedResource<TData, TResourceParameters>(
        resourceType: string,
        loadResource: LoadResource<
            TData,
            TResourceParameters & PageComponentProps,
            PageState,
            TGlobalParameters
        >,
        cacheKeyProperties?: Array<keyof TResourceParameters & string>,
    ) {
        if (this.resources[resourceType]) {
            throw new Error(`The resource type ${resourceType} has already been registered`)
        }

        const actions: DataLoaderActions<PageState, PagedData<TData>> = {
            refresh(internalState) {
                return {
                    newInternalState: internalState,
                    refresh: true,
                    keepData: true,
                }
            },
            // Loads next page of data
            nextPage(internalState, state) {
                if (state.status !== LoaderStatus.Idle) {
                    return null
                }
                return {
                    keepData: false,
                    refresh: false,
                    newInternalState: { page: internalState.page + 1 },
                }
            },
        }

        const typedDataLoader = createTypedDataLoader<
            PagedData<TData>,
            PageComponentProps & TResourceParameters,
            PageState,
            typeof actions
        >(resourceType, { page: 1 }, actions, cacheKeyProperties)
        this.resources[resourceType] = loadResource

        return typedDataLoader
    }

    getResourceLoader(dataType: any): LoadResource<any, any, any, any> {
        return this.resources[dataType]
    }
}
