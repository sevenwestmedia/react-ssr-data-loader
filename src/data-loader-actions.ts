import { ResourceLoadInfo } from './data-loader-state'

// tslint:disable:class-name
export const INIT = 'resource-data-loader/INIT'
export interface INIT {
    type: typeof INIT
}

export const REFRESH_DATA = 'resource-data-loader/REFRESH_DATA'
export interface REFRESH_DATA {
    type: typeof REFRESH_DATA
    meta: ResourceLoadInfo<any, any>
}

export const UPDATE_DATA = 'resource-data-loader/UPDATE_DATA'
export interface UPDATE_DATA {
    type: typeof UPDATE_DATA
    meta: ResourceLoadInfo<any, any>
}

export const NEXT_PAGE = 'resource-data-loader/NEXT_PAGE'
export interface NEXT_PAGE {
    type: typeof NEXT_PAGE
    meta: ResourceLoadInfo<any, any>
    payload: { existingData: any }
}

export const LOAD_DATA = 'resource-data-loader/LOAD_DATA'
export interface LOAD_DATA {
    type: 'resource-data-loader/LOAD_DATA'
    meta: ResourceLoadInfo<any, any>
}

export const LOAD_DATA_COMPLETED = 'resource-data-loader/LOAD_DATA_COMPLETED'
export interface LOAD_DATA_COMPLETED {
    type: 'resource-data-loader/LOAD_DATA_COMPLETED'
    meta: ResourceLoadInfo<any, any>
    payload: {
        data: any
        dataFromServerSideRender: boolean
    }
}

export const LOAD_DATA_FAILED = 'resource-data-loader/LOAD_DATA_FAILED'
export interface LOAD_DATA_FAILED {
    type: typeof LOAD_DATA_FAILED
    meta: ResourceLoadInfo<any, any>
    payload: string
}

export const UNLOAD_DATA = 'resource-data-loader/UNLOAD_DATA'
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
