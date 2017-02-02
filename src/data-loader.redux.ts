import { Action } from 'redux'

export interface LoaderDataState {
    completed: boolean
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
    loadingCount: number
    data: { [dataType: string]: DataKeyMap }
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
            return {
                loadingCount: state.loadingCount + 1,
                data: {
                    ...state.data,
                    [action.meta.dataType]: <DataKeyMap>{
                        ...state[action.meta.dataType],
                        [action.meta.dataKey]: {
                            serverSideRender: action.meta.isServerSideRender,
                            completed: false,
                            loading: true,
                            failed: false,
                        }
                    }
                }
            }
        }
        case LOAD_DATA_COMPLETED: {
            return {
                loadingCount: state.loadingCount - 1,
                data: {
                    ...state.data,
                    [action.meta.dataType]: <DataKeyMap>{
                        ...state.data[action.meta.dataType],
                        [action.meta.dataKey]: {
                            serverSideRender: action.meta.isServerSideRender,
                            completed: true,
                            loading: false,
                            failed: false,
                            data: action.payload
                        }
                    }
                }
            }
        }
        case LOAD_DATA_FAILED: {
            return {
                loadingCount: state.loadingCount - 1,
                data: {
                    ...state.data,
                    [action.meta.dataType]: <DataKeyMap>{
                        ...state.data[action.meta.dataType],
                        [action.meta.dataKey]: {
                            serverSideRender: action.meta.isServerSideRender,
                            completed: false,
                            loading: false,
                            failed: true,
                            error: action.payload,
                        }
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
