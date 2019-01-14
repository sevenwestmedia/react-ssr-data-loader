import {
    LoaderState,
    LoaderStatus,
    ResourceLoadInfo,
    DataLoaderState,
    FailedAction
} from './data-loader-state'
import * as Actions from './data-loader-actions'

const defaultState: LoaderState<any> = {
    data: { hasData: false },
    status: LoaderStatus.Idle,
    lastAction: { type: 'none', success: true }
}

const currentDataOrDefault = (
    meta: ResourceLoadInfo<any, any>,
    state: DataLoaderState
): LoaderState<any> => {
    const resourceTypeData = state.data[meta.resourceType]
    if (!resourceTypeData) {
        return defaultState
    }

    const keyData = resourceTypeData[meta.resourceLoadParamsHash]
    if (!keyData) {
        return defaultState
    }

    return keyData
}

const statusMap: { [key: string]: FailedAction['type'] } = {
    [LoaderStatus.Paging]: 'page',
    [LoaderStatus.Refreshing]: 'refresh',
    [LoaderStatus.Updating]: 'update',
    [LoaderStatus.Fetching]: 'initial-fetch'
}

export default (
    state: DataLoaderState = {
        data: {},
        loadingCount: 0
    },
    action: Actions.Actions
): DataLoaderState => {
    switch (action.type) {
        case Actions.LOAD_DATA: {
            const currentOrDefault = currentDataOrDefault(action.meta, state)
            const loading: LoaderState<any> = {
                status: LoaderStatus.Fetching,
                lastAction: currentOrDefault.lastAction, // TODO Should we always go back to idle?
                data: currentOrDefault.data
            }
            return {
                loadingCount: state.loadingCount + 1,
                data: {
                    ...state.data,
                    [action.meta.resourceType]: {
                        ...state.data[action.meta.resourceType],
                        [action.meta.resourceLoadParamsHash]: loading
                    }
                }
            }
        }
        case Actions.NEXT_PAGE: {
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
                    [action.meta.resourceType]: {
                        ...state.data[action.meta.resourceType],
                        [action.meta.resourceLoadParamsHash]: loading
                    }
                }
            }
        }
        case Actions.UPDATE_DATA: {
            const currentState = currentDataOrDefault(action.meta, state)
            const loading: LoaderState<any> = {
                status: LoaderStatus.Updating,
                lastAction: { type: 'none', success: true },
                data: currentState.data
            }
            return {
                loadingCount: state.loadingCount + 1,
                data: {
                    ...state.data,
                    [action.meta.resourceType]: {
                        ...state.data[action.meta.resourceType],
                        [action.meta.resourceLoadParamsHash]: loading
                    }
                }
            }
        }
        case Actions.REFRESH_DATA: {
            const currentState = currentDataOrDefault(action.meta, state)
            const loading: LoaderState<any> = {
                status: LoaderStatus.Refreshing,
                lastAction: { type: 'none', success: true },
                data: currentState.data
            }
            return {
                loadingCount: state.loadingCount + 1,
                data: {
                    ...state.data,
                    [action.meta.resourceType]: {
                        ...state.data[action.meta.resourceType],
                        [action.meta.resourceLoadParamsHash]: loading
                    }
                }
            }
        }
        case Actions.LOAD_DATA_COMPLETED: {
            const currentState = currentDataOrDefault(action.meta, state)
            const lastAction = statusMap[currentState.status]

            const completed: LoaderState<any> = {
                status: LoaderStatus.Idle,
                lastAction: { type: lastAction, success: true },
                data: {
                    hasData: true,
                    result: action.payload.data,
                    dataFromServerSideRender: action.payload.dataFromServerSideRender
                }
            }
            return {
                loadingCount: state.loadingCount - 1,
                data: {
                    ...state.data,
                    [action.meta.resourceType]: {
                        ...state.data[action.meta.resourceType],
                        [action.meta.resourceLoadParamsHash]: completed
                    }
                }
            }
        }

        case Actions.LOAD_DATA_FAILED: {
            const currentState = currentDataOrDefault(action.meta, state)
            const lastAction = statusMap[currentState.status]

            const failed: LoaderState<any> = {
                status: LoaderStatus.Idle,
                lastAction: {
                    type: lastAction,
                    success: false,
                    error: action.payload
                },
                data: currentState.data
            }
            return {
                // this should always occur alongside a LOAD_DATA_COMPLETED so we decrement loadingCount there
                loadingCount: state.loadingCount,
                data: {
                    ...state.data,
                    [action.meta.resourceType]: {
                        ...state.data[action.meta.resourceType],
                        [action.meta.resourceLoadParamsHash]: failed
                    }
                }
            }
        }
        case Actions.UNLOAD_DATA: {
            const newState = {
                loadingCount: state.loadingCount,
                data: { ...state.data }
            }
            const dataType = newState.data[action.meta.resourceType]
            delete dataType[action.meta.resourceLoadParamsHash]

            if (Object.keys(dataType).length === 0) {
                delete newState.data[action.meta.resourceType]
            } else {
                newState.data[action.meta.resourceType] = dataType
            }

            return newState
        }

        default:
            return state
    }
}
