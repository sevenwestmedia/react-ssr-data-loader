import { createTypedDataLoader, DataLoaderActions } from './data-loader'

export type LoadResource<TData, TResourceParameters, TInternalState, TGlobalParameters> = (
    params: TResourceParameters & TInternalState & TGlobalParameters
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
interface PageState {
    page: number
}

/** TGlobalParameters is provided through the data provider, and accessible in all data load function */
export class DataLoaderResources<TGlobalParameters> {
    private resources: Resources = {}

    /**
     * When using parameterised resources you cannot have multiple instances of the returned data loader
     * with the same resourceId.
     */
    registerResource<TData, TResourceParameters>(
        resourceType: string,
        loadResource: LoadResource<TData, TResourceParameters, {}, TGlobalParameters>
    ) {
        if (this.resources[resourceType]) {
            throw new Error(`The resource type ${resourceType} has already been registered`)
        }

        const actions: DataLoaderActions<{}> = {
            refresh(internalState) {
                return {
                    newInternalState: internalState,
                    refresh: true,
                    keepData: true
                }
            }
        }
        const typedDataLoader = createTypedDataLoader<
            TData,
            TResourceParameters,
            {},
            typeof actions
        >(resourceType, {}, actions)
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
        >
    ) {
        if (this.resources[resourceType]) {
            throw new Error(`The resource type ${resourceType} has already been registered`)
        }

        const actions: DataLoaderActions<PageState> = {
            refresh(internalState) {
                return {
                    newInternalState: internalState,
                    refresh: true,
                    keepData: true
                }
            },
            // Loads next page of data
            nextPage(internalState) {
                return {
                    keepData: false,
                    refresh: false,
                    newInternalState: { page: internalState.page + 1 }
                }
            }
        }

        const typedDataLoader = createTypedDataLoader<
            PagedData<TData>,
            PageComponentProps & TResourceParameters,
            PageState,
            typeof actions
        >(resourceType, { page: 1 }, actions)
        this.resources[resourceType] = loadResource

        return typedDataLoader
    }

    getResourceLoader(dataType: any): LoadResource<any, any, any, any> {
        return this.resources[dataType]
    }
}
