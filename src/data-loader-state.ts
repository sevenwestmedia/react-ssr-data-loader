export interface SuccessAction<TParams> {
    type: 'none' | 'fetch'
    params: TParams
    success: true
}

export interface FailedAction<TParams> {
    type: 'fetch'
    params: TParams
    success: false
    error: Error
}

export enum LoaderStatus {
    /**
     * The loader is inactive -- not performing any action
     */
    Idle = 'Idle',

    /**
     * The loader is fetching the resource
     */
    Fetching = 'Fetching',
}

export interface LoaderState<TData, TParams> {
    status: LoaderStatus
    lastAction: SuccessAction<TParams> | FailedAction<TParams>
    data: Data<TData, TParams>
}

// @ TODO Should we drop dataFromServerSideRender? How do we model not fetching on client
export type Data<TData, TParams> =
    | {
          hasData: true
          result: TData
          dataFromServerSideRender: boolean
          /** The parameters used to load the data */
          params: TParams
      }
    | { hasData: false }
