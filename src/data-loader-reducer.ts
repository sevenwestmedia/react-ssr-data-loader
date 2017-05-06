import {
    LoaderState, LoaderStatus, ResourceLoadInfo, DataLoaderState,
    FailedAction, Actions, LOAD_DATA, DataKeyMap,
    NEXT_PAGE, REFRESH_DATA, LOAD_DATA_COMPLETED,
    LOAD_DATA_FAILED, UNLOAD_DATA
} from './data-loader-actions'

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

export default (state: DataLoaderState = {
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
