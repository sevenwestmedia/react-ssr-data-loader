import { DataLoaderState } from './data-loader-store-and-loader'

export interface BeginLoadingEvent {
    type: 'begin-loading-event'
    data: {
        resourceType: string
        resourceLoadParamsHash: string
    }
}
export interface EndLoadingEvent {
    type: 'end-loading-event'

    data: {
        resourceType: string
        resourceLoadParamsHash: string
    }
}
export interface DataLoadCompletedEvent {
    type: 'data-load-completed'

    data: {
        resourceType: string
        resourceLoadParamsHash: string
    }
}
export interface StateChangedEvent {
    type: 'state-changed'
    state: DataLoaderState
}
export interface LoadErrorEvent {
    type: 'load-error'

    data: {
        error: any
        resourceType: string
        resourceLoadParamsHash: string
    }
}

export type DataProviderEvents =
    | BeginLoadingEvent
    | EndLoadingEvent
    | DataLoadCompletedEvent
    | StateChangedEvent
    | LoadErrorEvent
