import { createUseRegisteredResourceHook, DataLoaderActions, UserActions } from './data-loader'
import { LoaderStatus, LoaderState } from './data-loader-state'
import { ObjectHash } from './data-loader-store-and-loader'

interface LoadResourceParams {
    resourceType: string
    /** This is the key the data loader uses for looking up the data */
    paramsCacheKey: string
}

export type LoadResource<
    TData,
    TResourceParameters extends Record<string, unknown>,
    TInternalState extends Record<string, unknown>,
    TGlobalParameters extends Record<string, unknown>
> = (
    params: LoadResourceParams & TResourceParameters & TInternalState & TGlobalParameters,
) => Promise<TData> | TData

export interface RegisteredResource {
    loadResource: LoadResource<any, any, any, any>
    cacheKeyProperties?: Array<keyof any>
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
export class DataLoaderResources<
    TGlobalParameters extends Record<string, unknown> = Record<string, unknown>
> {
    private resources: Record<keyof any, RegisteredResource> = {}

    constructor(
        /** Override the object hashing function */
        private objectHash: ObjectHash = require('hash-sum'),
    ) {}

    /**
     * @returns data load hook
     */
    registerResource<TData, TResourceParameters extends Record<string, unknown>>(
        resourceType: string,
        loadResource: LoadResource<
            TData,
            TResourceParameters,
            Record<string, unknown>,
            TGlobalParameters
        >,
        cacheKeyProperties?: Array<keyof TResourceParameters>,
    ): (
        dataLoadParams: TResourceParameters,
        options?: {
            clientLoadOnly?: boolean | undefined
        },
    ) => LoaderState<TData> & {
        actions: UserActions<'refresh'>
        params: TResourceParameters
    } {
        if (this.resources[resourceType]) {
            throw new Error(`The resource type ${resourceType} has already been registered`)
        }

        const actions: DataLoaderActions<'refresh', Record<string, unknown>, TData> = {
            refresh(internalState) {
                return {
                    newInternalState: internalState,
                    refresh: true,
                    keepData: true,
                }
            },
        }

        const useRegisteredResource = createUseRegisteredResourceHook<
            TData,
            TResourceParameters,
            Record<string, unknown>,
            'refresh'
        >(resourceType, {}, actions)
        this.resources[resourceType] = {
            loadResource,
            cacheKeyProperties,
        }

        return useRegisteredResource
    }

    /** Page numbers start at 1 */
    registerPagedResource<TData, TResourceParameters extends Record<string, unknown>>(
        resourceType: string,
        loadResource: LoadResource<
            TData,
            TResourceParameters & PageComponentProps,
            PageState & Record<string, unknown>,
            TGlobalParameters
        >,
        cacheKeyProperties?: Array<keyof TResourceParameters & string>,
    ): (
        dataLoadParams: PageComponentProps & TResourceParameters,
        options?: {
            clientLoadOnly?: boolean | undefined
        },
    ) => LoaderState<PagedData<TData>> & {
        actions: UserActions<'nextPage' | 'refresh'>
        params: TResourceParameters
    } {
        if (this.resources[resourceType]) {
            throw new Error(`The resource type ${resourceType} has already been registered`)
        }

        const actions: DataLoaderActions<
            'refresh' | 'nextPage',
            PageState & Record<string, unknown>,
            PagedData<TData>
        > = {
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

        const usePagedResource = createUseRegisteredResourceHook<
            PagedData<TData>,
            PageComponentProps & TResourceParameters,
            PageState & Record<string, unknown>,
            'refresh' | 'nextPage'
        >(resourceType, { page: 1 }, actions)
        this.resources[resourceType] = {
            loadResource,
            cacheKeyProperties,
        }

        return usePagedResource
    }

    getResourceLoader(dataType: string): RegisteredResource {
        return this.resources[dataType]
    }

    generateCacheKey(resourceType: string, dataLoadParams: Record<string, unknown>): string {
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
