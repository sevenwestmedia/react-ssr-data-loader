import { DataLoaderState } from './data-loader-actions'

export interface BeginLoadingEvent {
    type: 'begin-loading-event'
    data: {
        numberLoading: number
        resourceType: string
        resourceId: string
    }
}
export interface EndLoadingEvent {
    type: 'end-loading-event'

    data: {
        numberLoading: number
        resourceType: string
        resourceId: string
    }
}
export interface DataLoadCompletedEvent {
    type: 'data-load-completed'

    data: {
        numberLoading: number
        resourceType: string
        resourceId: string
    }
}
export interface StateChangedEvent {
    type: 'state-changed'
    state: DataLoaderState
}
export interface LoadErrorEvent {
    type: 'load-error'

    data: {
        error: Error
        resourceType: string
        resourceId: string
    }
}

export type DataProviderEvents =
    | BeginLoadingEvent
    | EndLoadingEvent
    | DataLoadCompletedEvent
    | StateChangedEvent
    | LoadErrorEvent
