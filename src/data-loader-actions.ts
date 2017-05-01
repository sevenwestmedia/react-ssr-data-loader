export type SuccessAction = {
    type: 'none' | 'initial-fetch' | 'refresh' | 'page'
    success: true
}

export type FailedAction = {
    type: 'initial-fetch' | 'refresh' | 'page'
    success: false
    error: string
}

export enum LoaderStatus { // The loader is ________ (the data/resource)
    /**
     * The loader has been instantiated and is fetching the resource for the first time
     */
    Fetching = 0,

    /**
     * The loader is inactive -- not performing any action
     */
    Idle = 1,

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

    data: Data<TData>
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
    data: { [dataType: string]: DataKeyMap }
}

export interface Meta {
    dataType: string
    dataKey: string
    dataParams: any
    dataFromServerSideRender: boolean
}

export const INIT = 'resource-data-loader/INIT'
export interface INIT {
    type: 'resource-data-loader/INIT'
}

export const REFRESH_DATA = 'resource-data-loader/REFRESH_DATA'
export interface REFRESH_DATA {
    type: 'resource-data-loader/REFRESH_DATA'
    meta: Meta
}

export const NEXT_PAGE = 'resource-data-loader/NEXT_PAGE'
export interface NEXT_PAGE {
    type: 'resource-data-loader/NEXT_PAGE'
    meta: Meta
    payload: { existingData: any }
}

export const LOAD_DATA = 'resource-data-loader/LOAD_DATA'
export interface LOAD_DATA {
    type: 'resource-data-loader/LOAD_DATA'
    meta: Meta
}

export const LOAD_DATA_COMPLETED = 'resource-data-loader/LOAD_DATA_COMPLETED'
export interface LOAD_DATA_COMPLETED {
    type: 'resource-data-loader/LOAD_DATA_COMPLETED'
    meta: Meta
    payload: any
}

export const LOAD_DATA_FAILED = 'resource-data-loader/LOAD_DATA_FAILED'
export interface LOAD_DATA_FAILED {
    type: 'resource-data-loader/LOAD_DATA_FAILED'
    meta: Meta
    payload: string
}

export const UNLOAD_DATA = 'resource-data-loader/UNLOAD_DATA'
export interface UNLOAD_DATA {
    type: 'resource-data-loader/UNLOAD_DATA'
    meta: Meta
}

export const LOAD_NEXT_DATA = 'resource-data-loader/LOAD_NEXT_DATA'
export interface LOAD_NEXT_DATA {
    type: 'resource-data-loader/LOAD_NEXT_DATA'
    meta: {
        current: Meta
        next: Meta
    }
}

export type Actions = LOAD_DATA | LOAD_DATA_COMPLETED
    | LOAD_DATA_FAILED | UNLOAD_DATA | LOAD_NEXT_DATA
    | REFRESH_DATA | NEXT_PAGE | INIT

const defaultState: LoaderState<any> = {
    data: { hasData: false },
    status: LoaderStatus.Idle,
    lastAction: { type: 'none', success: true }
}

const currentDataOrDefault = (meta: Meta, state: DataLoaderState): LoaderState<any> => {
    const resourceTypeData = state.data[meta.dataType]
    if (!resourceTypeData) { return defaultState }

    const keyData = resourceTypeData[meta.dataKey]
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
        case LOAD_NEXT_DATA: {
            const stateWithCurrentRemoved = reducer(state, {
                type: UNLOAD_DATA,
                meta: action.meta.current
            })
            const newState = reducer(stateWithCurrentRemoved, {
                type: LOAD_DATA,
                meta: action.meta.next
            })
            return newState
        }
        case LOAD_DATA: {
            const defaultState = currentDataOrDefault(action.meta, state)
            const loading: LoaderState<any> = {
                status: LoaderStatus.Fetching,
                lastAction: defaultState.lastAction, // TODO Should we always go back to idle?
                data: defaultState.data,
            }
            return {
                loadingCount: state.loadingCount + 1,
                data: {
                    ...state.data,
                    [action.meta.dataType]: <DataKeyMap>{
                        ...state.data[action.meta.dataType],
                        [action.meta.dataKey]: loading
                    }
                }
            }
        }
        case NEXT_PAGE: {
            const currentState = currentDataOrDefault(action.meta, state)
            const loading: LoaderState<any> = {
                status: LoaderStatus.Paging,
                lastAction: { type: 'none', success: true },
                data: currentState.data
            }
            return {
                loadingCount: state.loadingCount + 1,
                data: {
                    ...state.data,
                    [action.meta.dataType]: <DataKeyMap>{
                        ...state.data[action.meta.dataType],
                        [action.meta.dataKey]: loading
                    }
                }
            }
        }
        case REFRESH_DATA: {
            const currentState = currentDataOrDefault(action.meta, state)
            const loading: LoaderState<any> = {
                status: LoaderStatus.Paging,
                lastAction: { type: 'none', success: true },
                data: currentState.data
            }
            return {
                loadingCount: state.loadingCount + 1,
                data: {
                    ...state.data,
                    [action.meta.dataType]: <DataKeyMap>{
                        ...state.data[action.meta.dataType],
                        [action.meta.dataKey]: loading
                    }
                }
            }
        }
        case LOAD_DATA_COMPLETED: {
            const currentState = currentDataOrDefault(action.meta, state)
            const lastAction = statusMap[currentState.status]

            const completed: LoaderState<any> = {
                status: LoaderStatus.Idle,
                lastAction: { type: lastAction, success: true },
                data: {
                    hasData: true,
                    data: action.payload,
                    dataFromServerSideRender: action.meta.dataFromServerSideRender
                }
            }
            return {
                loadingCount: state.loadingCount - 1,
                data: {
                    ...state.data,
                    [action.meta.dataType]: <DataKeyMap>{
                        ...state.data[action.meta.dataType],
                        [action.meta.dataKey]: completed
                    }
                }
            }
        }
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
                    [action.meta.dataType]: <DataKeyMap>{
                        ...state.data[action.meta.dataType],
                        [action.meta.dataKey]: failed
                    }
                }
            }
        }
        case UNLOAD_DATA: {
            const newState = { loadingCount: state.loadingCount, data: { ...state.data } }
            const dataType = newState.data[action.meta.dataType]
            delete dataType[action.meta.dataKey]

            if (Object.keys(dataType).length === 0) {
                delete newState.data[action.meta.dataType]
            } else {
                newState.data[action.meta.dataType] = dataType
            }

            return newState
        }
    }

    return state
}
