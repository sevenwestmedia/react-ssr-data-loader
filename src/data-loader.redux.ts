import { Action } from 'redux'

export interface LoaderDataState {
    loaded: boolean
    loading: boolean
    failed: boolean
    error?: string
    serverSideRender: boolean
    data?: any
}


export interface DataKeyMap {
    [dataKey: string]: LoaderDataState
}

export interface DataTypeMap {
    [dataType: string]: DataKeyMap
}

export interface ReduxStoreState {
    dataLoader: DataTypeMap
}

export interface Meta {
    dataType: string
    dataKey: string
    isServerSideRender: boolean
}

export const LOAD_DATA = 'redux-data-loader/LOAD_DATA'
export interface LOAD_DATA extends Action {
    type: 'redux-data-loader/LOAD_DATA'
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

type Actions = LOAD_DATA | LOAD_DATA_COMPLETED | LOAD_DATA_FAILED | UNLOAD_DATA | LOAD_NEXT_DATA

export const reducer = (state: DataTypeMap = {}, action: Actions) => {
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
            return {
                ...state,
                [action.meta.dataType]: <DataKeyMap>{
                    ...state[action.meta.dataType],
                    [action.meta.dataKey]: {
                        serverSideRender: action.meta.isServerSideRender,
                        loaded: false,
                        loading: true,
                        failed: false,
                    }
                },
            }
        }
        case LOAD_DATA_COMPLETED: {
            return {
                ...state,
                [action.meta.dataType]: <DataKeyMap>{
                    ...state[action.meta.dataType],
                    [action.meta.dataKey]: {
                        serverSideRender: action.meta.isServerSideRender,
                        loaded: true,
                        loading: false,
                        failed: false,
                        data: action.payload
                    }
                },
            }
        }
        case LOAD_DATA_FAILED: {
            return {
                ...state,
                [action.meta.dataType]: <DataKeyMap>{
                    ...state[action.meta.dataType],
                    [action.meta.dataKey]: {
                        serverSideRender: action.meta.isServerSideRender,
                        loaded: false,
                        loading: false,
                        failed: true,
                        error: action.payload,
                    }
                }
            }
        }
        case UNLOAD_DATA: {
            const newState = { ...state }
            const dataType = newState[action.meta.dataType]
            delete dataType[action.meta.dataKey]

            if (Object.keys(dataType).length === 0) {
                delete newState[action.meta.dataType]
            } else {
                newState[action.meta.dataType] = dataType
            }

            return newState
        }
    }

    return state
}
