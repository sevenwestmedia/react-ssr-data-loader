import { Action } from 'redux'

export interface CompletedSuccessfullyLoaderDataState {
    attachedComponents: number
    completed: true
    loading: false
    failed: false
    dataFromServerSideRender: boolean
    data: any
}

export interface FailedLoaderDataState {
    attachedComponents: number
    completed: true
    loading: false
    failed: true
    error: string
    dataFromServerSideRender: boolean
}

export interface LoadingLoaderDataState {
    attachedComponents: number
    completed: false
    loading: true
    failed: false
    dataFromServerSideRender: boolean
}

export type LoaderDataState = (
    CompletedSuccessfullyLoaderDataState |
    FailedLoaderDataState |
    LoadingLoaderDataState
)

export interface DataKeyMap {
    [dataKey: string]: LoaderDataState
}

export interface DataTypeMap {
    loadingCount: number
    data: { [dataType: string]: DataKeyMap }
}

export interface ReduxStoreState {
    dataLoader: DataTypeMap
}

export interface Meta {
    dataType: string
    dataKey: string
    dataFromServerSideRender: boolean
}

export const LOAD_DATA = 'redux-data-loader/LOAD_DATA'
export interface LOAD_DATA extends Action {
    type: 'redux-data-loader/LOAD_DATA'
    meta: Meta
}

// Used when a component attaches to already loaded data
// this enables us to only remove the data once all attached
// components are unmounted
export const ATTACH_TO_DATA = 'redux-data-loader/ATTACH_TO_DATA'
export interface ATTACH_TO_DATA extends Action {
    type: 'redux-data-loader/ATTACH_TO_DATA'
    meta: Meta
}
export const DETACH_FROM_DATA = 'redux-data-loader/DETACH_FROM_DATA'
export interface DETACH_FROM_DATA extends Action {
    type: 'redux-data-loader/DETACH_FROM_DATA'
    meta: Meta
}

export const LOAD_DATA_COMPLETED = 'redux-data-loader/LOAD_DATA_COMPLETED'
export interface LOAD_DATA_COMPLETED extends Action {
    type: 'redux-data-loader/LOAD_DATA_COMPLETED'
    meta: Meta
    payload: any
}

export const LOAD_DATA_FAILED = 'redux-data-loader/LOAD_DATA_FAILED'
export interface LOAD_DATA_FAILED extends Action {
    type: 'redux-data-loader/LOAD_DATA_FAILED'
    meta: Meta
    payload: string
}

export const UNLOAD_DATA = 'redux-data-loader/UNLOAD_DATA'
export interface UNLOAD_DATA extends Action {
    type: 'redux-data-loader/UNLOAD_DATA'
    meta: Meta
}

export const LOAD_NEXT_DATA = 'redux-data-loader/LOAD_NEXT_DATA'
export interface LOAD_NEXT_DATA extends Action {
    type: 'redux-data-loader/LOAD_NEXT_DATA'
    meta: {
        current: Meta
        next: Meta
    }
}

type Actions = (
    LOAD_DATA | LOAD_DATA_COMPLETED | LOAD_DATA_FAILED |
    UNLOAD_DATA | LOAD_NEXT_DATA | ATTACH_TO_DATA |
    DETACH_FROM_DATA
)

export const reducer = (state: DataTypeMap = {
    data: {},
    loadingCount: 0,
}, action: Actions) => {
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
            const existingDataType = state.data[action.meta.dataType]
            const existing = existingDataType ? existingDataType[action.meta.dataKey] : undefined
            const increment = action.meta.dataFromServerSideRender ? 0 : 1
            const attachedComponents = existing ? existing.attachedComponents : 0
            const loading: LoadingLoaderDataState = {
                attachedComponents: increment + attachedComponents,
                dataFromServerSideRender: action.meta.dataFromServerSideRender,
                completed: false,
                loading: true,
                failed: false,
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
            const existing = state.data[action.meta.dataType][action.meta.dataKey]
            const completed: CompletedSuccessfullyLoaderDataState = {
                attachedComponents: existing.attachedComponents,
                dataFromServerSideRender: action.meta.dataFromServerSideRender,
                completed: true,
                loading: false,
                failed: false,
                data: action.payload
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
            const existing = state.data[action.meta.dataType][action.meta.dataKey]
            const failed: FailedLoaderDataState = {
                attachedComponents: existing.attachedComponents,
                dataFromServerSideRender: action.meta.dataFromServerSideRender,
                completed: true,
                loading: false,
                failed: true,
                error: action.payload,
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

        case ATTACH_TO_DATA: {
            const existing = state.data[action.meta.dataType][action.meta.dataKey]

            return {
                loadingCount: state.loadingCount,
                data: {
                    ...state.data,
                    [action.meta.dataType]: <DataKeyMap>{
                        ...state[action.meta.dataType],
                        [action.meta.dataKey]: {
                            ...existing,
                            attachedComponents: existing.attachedComponents + 1,
                        }
                    }
                }
            }
        }

        case DETACH_FROM_DATA: {
            const existing = state.data[action.meta.dataType][action.meta.dataKey]

            return {
                loadingCount: state.loadingCount,
                data: {
                    ...state.data,
                    [action.meta.dataType]: <DataKeyMap>{
                        ...state[action.meta.dataType],
                        [action.meta.dataKey]: {
                            ...existing,
                            attachedComponents: existing.attachedComponents - 1,
                        }
                    }
                }
            }
        }
    }

    return state
}
