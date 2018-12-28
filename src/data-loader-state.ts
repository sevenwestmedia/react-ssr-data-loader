export interface SuccessAction {
    type: 'none' | 'initial-fetch' | 'refresh' | 'page' | 'update'
    success: true
}

export interface FailedAction {
    type: 'initial-fetch' | 'refresh' | 'page' | 'update'
    success: false
    error: Error & { dataLoadContext?: string }
}

export enum LoaderStatus { // The loader is ________ (the data/resource)
    /**
     * The loader is inactive -- not performing any action
     */
    Idle = 'Idle',

    /**
     * The loader has been instantiated and is fetching the resource for the first time
     */
    Fetching = 'Fetching',

    /**
     * The loader is re-fetching the resource
     */
    Refreshing = 'Refreshing',

    /**
     * The loader is fetching the next page of a resurce
     */
    Paging = 'Paging',

    /**
     * The loader is updating the resource
     */
    Updating = 'Updating'
}

export interface LoaderState<TData> {
    status: LoaderStatus
    lastAction: SuccessAction | FailedAction
    /**
     * Some kind of sentinel value so that the object doesn't become top heavy ???
     */

    data: Data<TData>
}

// @ TODO Should we drop dataFromServerSideRender? How do we model not fetching on client
export type Data<TData> =
    | { hasData: true; result: TData; dataFromServerSideRender: boolean }
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
