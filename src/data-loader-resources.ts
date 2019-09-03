import { createTypedDataLoader, DataLoaderActions } from './data-loader'
import { LoaderStatus } from './data-loader-state'
import { ObjectHash } from './data-loader-store-and-loader'

export type LoadResource<TData, TResourceParameters, TInternalState, TGlobalParameters> = (
    params: {
        resourceType: string
        /** This is the key the data loader uses for looking up the data */
        paramsCacheKey: string
    } & TResourceParameters &
        TInternalState &
        TGlobalParameters,
) => Promise<TData> | TData

export interface RegisteredResource {
    loadResource: LoadResource<any, any, any, any>
    cacheKeyProperties?: string[]
}

interface Resources {
    [dataType: string]: RegisteredResource
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

    constructor(
        /** Override the object hashing function */
        private objectHash: ObjectHash = require('hash-sum'),
    ) {}

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
        >(resourceType, {}, actions)
        this.resources[resourceType] = {
            loadResource,
            cacheKeyProperties,
        }

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
        >(resourceType, { page: 1 }, actions)
        this.resources[resourceType] = {
            loadResource,
            cacheKeyProperties,
        }

        return typedDataLoader
    }

    getResourceLoader(dataType: string): RegisteredResource {
        return this.resources[dataType]
    }

    generateCacheKey(resourceType: string, dataLoadParams: object): string {
        const { cacheKeyProperties } = this.resources[resourceType]
        const cacheObj = { ...dataLoadParams, resourceType }

        const cacheParams = cacheKeyProperties
            ? // ensure resourceType is always included in the cache key
              cacheKeyProperties.concat('resourceType').reduce<any>((acc, val) => {
                  acc[val] = (cacheObj as any)[val]
                  return acc
              }, {})
            : cacheObj

        return this.objectHash(cacheParams)
    }
}
