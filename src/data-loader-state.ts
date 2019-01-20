export interface SuccessAction {
    type: 'none' | 'fetch'
    success: true
}

export interface FailedAction {
    type: 'fetch'
    success: false
    error: Error
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
