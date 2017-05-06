export type SuccessAction = {
    type: 'none' | 'initial-fetch' | 'refresh' | 'page'
    success: true,
}

export type FailedAction = {
    type: 'initial-fetch' | 'refresh' | 'page'
    success: false
    error: string,
}

export enum LoaderStatus { // The loader is ________ (the data/resource)
    /**
     * The loader is inactive -- not performing any action
     */
    Idle = 0,

    /**
     * The loader has been instantiated and is fetching the resource for the first time
     */
    Fetching = 1,

    /**
     * The loader is re-fetching the resource
     */
    Refreshing = 2,

    /**
     * The loader is fetching the next page of a resurce
     */
    Paging = 3,
}

export type LoaderState<TData> = {
    status: LoaderStatus
    lastAction: SuccessAction | FailedAction
    /**
     * Some kind of sentinel value so that the object doesn't become top heavy ???
     */

    data: Data<TData>,
}

// @ TODO Should we drop dataFromServerSideRender? How do we model not fetching on client
export type Data<TData> =
    | { hasData: true, data: TData, dataFromServerSideRender: boolean }
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
        dataFromServerSideRender: boolean,
    }
}

export const LOAD_DATA_FAILED = 'resource-data-loader/LOAD_DATA_FAILED'
// tslint:disable-next-line:class-name
export interface LOAD_DATA_FAILED {
    type: typeof LOAD_DATA_FAILED
    meta: ResourceLoadInfo<any, any>
    payload: string
}

export const UNLOAD_DATA = 'resource-data-loader/UNLOAD_DATA'
// tslint:disable-next-line:class-name
export interface UNLOAD_DATA {
    type: typeof UNLOAD_DATA
    meta: ResourceLoadInfo<any, any>
}

export type Actions = LOAD_DATA | LOAD_DATA_COMPLETED
    | LOAD_DATA_FAILED | UNLOAD_DATA
    | REFRESH_DATA | NEXT_PAGE | INIT

const defaultState: LoaderState<any> = {
    data: { hasData: false },
    status: LoaderStatus.Idle,
    lastAction: { type: 'none', success: true },
}

const currentDataOrDefault = (
    meta: ResourceLoadInfo<any, any>, state: DataLoaderState,
): LoaderState<any> => {
    const resourceTypeData = state.data[meta.resourceType]
    if (!resourceTypeData) { return defaultState }

    const keyData = resourceTypeData[meta.resourceId]
    if (!keyData) { return defaultState }

    return keyData
}

const statusMap: { [key: number]: FailedAction['type'] } = {
    [LoaderStatus.Paging]: 'page',
    [LoaderStatus.Refreshing]: 'refresh',
    [LoaderStatus.Fetching]: 'initial-fetch',
}

export const reducer = (state: DataLoaderState = {
    data: {},
    loadingCount: 0,
}, action: Actions): DataLoaderState => {
    switch (action.type) {
        case LOAD_DATA: {
            const currentOrDefault = currentDataOrDefault(action.meta, state)
            const loading: LoaderState<any> = {
                status: LoaderStatus.Fetching,
                lastAction: currentOrDefault.lastAction, // TODO Should we always go back to idle?
                data: currentOrDefault.data,
            }
            return {
                loadingCount: state.loadingCount + 1,
                data: {
                    ...state.data,
                    [action.meta.resourceType]: {
                        ...state.data[action.meta.resourceType],
                        [action.meta.resourceId]: loading,
                    } as DataKeyMap,
                },
            }
        }
        // tslint:disable-next-line:no-switch-case-fall-through
        case NEXT_PAGE: {
            const currentState = currentDataOrDefault(action.meta, state)
            const loading: LoaderState<any> = {
                status: LoaderStatus.Paging,
                lastAction: { type: 'none', success: true },
                data: currentState.data,
            }
            return {
                loadingCount: state.loadingCount + 1,
                data: {
                    ...state.data,
                    [action.meta.resourceType]: {
                        ...state.data[action.meta.resourceType],
                        [action.meta.resourceId]: loading,
                    } as DataKeyMap,
                },
            }
        }
        // tslint:disable-next-line:no-switch-case-fall-through
        case REFRESH_DATA: {
            const currentState = currentDataOrDefault(action.meta, state)
            const loading: LoaderState<any> = {
                status: LoaderStatus.Refreshing,
                lastAction: { type: 'none', success: true },
                data: currentState.data,
            }
            return {
                loadingCount: state.loadingCount + 1,
                data: {
                    ...state.data,
                    [action.meta.resourceType]: {
                        ...state.data[action.meta.resourceType],
                        [action.meta.resourceId]: loading,
                    } as DataKeyMap,
                },
            }
        }
        // tslint:disable-next-line:no-switch-case-fall-through
        case LOAD_DATA_COMPLETED: {
            const currentState = currentDataOrDefault(action.meta, state)
            const lastAction = statusMap[currentState.status]

            const completed: LoaderState<any> = {
                status: LoaderStatus.Idle,
                lastAction: { type: lastAction, success: true },
                data: {
                    hasData: true,
                    data: action.payload.data,
                    dataFromServerSideRender: action.payload.dataFromServerSideRender,
                },
            }
            return {
                loadingCount: state.loadingCount - 1,
                data: {
                    ...state.data,
                    [action.meta.resourceType]: {
                        ...state.data[action.meta.resourceType],
                        [action.meta.resourceId]: completed,
                    } as DataKeyMap,
                },
            }
        }
        // tslint:disable-next-line:no-switch-case-fall-through
        case LOAD_DATA_FAILED: {
            const currentState = currentDataOrDefault(action.meta, state)
            const lastAction = statusMap[currentState.status]

            const failed: LoaderState<any> = {
                status: LoaderStatus.Idle,
                lastAction: { type: lastAction, success: false, error: action.payload },
                data: currentState.data,
            }
            return {
                loadingCount: state.loadingCount - 1,
                data: {
                    ...state.data,
                    [action.meta.resourceType]: {
                        ...state.data[action.meta.resourceType],
                        [action.meta.resourceId]: failed,
                    } as DataKeyMap,
                },
            }
        }
        // tslint:disable-next-line:no-switch-case-fall-through
        case UNLOAD_DATA: {
            const newState = { loadingCount: state.loadingCount, data: { ...state.data } }
            const dataType = newState.data[action.meta.resourceType]
            delete dataType[action.meta.resourceId]

            if (Object.keys(dataType).length === 0) {
                delete newState.data[action.meta.resourceType]
            } else {
                newState.data[action.meta.resourceType] = dataType
            }

            return newState
        }

        // tslint:disable-next-line:no-switch-case-fall-through
        default:
            return state
    }
}
