export type SuccessAction = {
    type: 'none' | 'initial-fetch' | 'refresh' | 'page' | 'update'
    success: true
}

export type FailedAction = {
    type: 'initial-fetch' | 'refresh' | 'page' | 'update'
    success: false
    error: string
}

export enum LoaderStatus { // The loader is ________ (the data/resource)
    /**
     * The loader is inactive -- not performing any action
     */
    Idle = 'Idle',

    /**
     * The loader has been instantiated and is fetching the resource for the first time
     */
    Fetching = 'Fetching',

    /**
     * The loader is re-fetching the resource
     */
    Refreshing = 'Refreshing',

    /**
     * The loader is fetching the next page of a resurce
     */
    Paging = 'Paging',

    /**
     * The loader is updating the resource
     */
    Updating = 'Updating'
}

export type LoaderState<TData> = {
    status: LoaderStatus
    lastAction: SuccessAction | FailedAction
    /**
     * Some kind of sentinel value so that the object doesn't become top heavy ???
     */

    data: Data<TData>
}

// @ TODO Should we drop dataFromServerSideRender? How do we model not fetching on client
export type Data<TData> =
    | { hasData: true; data: TData; dataFromServerSideRender: boolean }
    | { hasData: false }

export interface DataKeyMap {
    [dataKey: string]: LoaderState<any>
}

export interface DataLoaderState {
    loadingCount: number
    data: { [resourceType: string]: DataKeyMap }
}

export interface ResourceLoadInfo<TAdditionalParameters, TInternalState> {
    resourceType: string
    resourceId: string
    /** Optional additional parameters required to load resource, i.e paging other */
    resourceLoadParams: TAdditionalParameters
    internalState: TInternalState
}

export const INIT = 'resource-data-loader/INIT'
export interface INIT {
    type: typeof INIT
}

export const REFRESH_DATA = 'resource-data-loader/REFRESH_DATA'
// tslint:disable-next-line:class-name
export interface REFRESH_DATA {
    type: typeof REFRESH_DATA
    meta: ResourceLoadInfo<any, any>
}

export const UPDATE_DATA = 'resource-data-loader/UPDATE_DATA'
// tslint:disable-next-line:class-name
export interface UPDATE_DATA {
    type: typeof UPDATE_DATA
    meta: ResourceLoadInfo<any, any>
}

export const NEXT_PAGE = 'resource-data-loader/NEXT_PAGE'
// tslint:disable-next-line:class-name
export interface NEXT_PAGE {
    type: typeof NEXT_PAGE
    meta: ResourceLoadInfo<any, any>
    payload: { existingData: any }
}

export const LOAD_DATA = 'resource-data-loader/LOAD_DATA'
// tslint:disable-next-line:class-name
export interface LOAD_DATA {
    type: 'resource-data-loader/LOAD_DATA'
    meta: ResourceLoadInfo<any, any>
}

export const LOAD_DATA_COMPLETED = 'resource-data-loader/LOAD_DATA_COMPLETED'
// tslint:disable-next-line:class-name
export interface LOAD_DATA_COMPLETED {
    type: 'resource-data-loader/LOAD_DATA_COMPLETED'
    meta: ResourceLoadInfo<any, any>
    payload: {
        data: any
        dataFromServerSideRender: boolean
    }
}

export const LOAD_DATA_FAILED = 'resource-data-loader/LOAD_DATA_FAILED'
// tslint:disable-next-line:class-name
export interface LOAD_DATA_FAILED {
    type: typeof LOAD_DATA_FAILED
    meta: ResourceLoadInfo<any, any>
    payload: Error | string
}

export const UNLOAD_DATA = 'resource-data-loader/UNLOAD_DATA'
// tslint:disable-next-line:class-name
export interface UNLOAD_DATA {
    type: typeof UNLOAD_DATA
    meta: ResourceLoadInfo<any, any>
}

export type Actions =
    | LOAD_DATA
    | LOAD_DATA_COMPLETED
    | LOAD_DATA_FAILED
    | UNLOAD_DATA
    | REFRESH_DATA
    | NEXT_PAGE
    | INIT
    | UPDATE_DATA
