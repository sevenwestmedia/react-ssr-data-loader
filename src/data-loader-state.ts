export interface SuccessAction {
    type: 'none' | 'fetch'
    success: true
}

export interface FailedAction {
    type: 'fetch'
    success: false
    error: Error
}

export const enum LoaderStatus {
    /**
     * The loader is inactive -- not performing any action
     */
    Idle = 'Idle',

    /**
     * The loader is fetching the resource
     */
    Fetching = 'Fetching',
}

export interface LoaderState<TData> {
    status: LoaderStatus
    lastAction: SuccessAction | FailedAction
    data: Data<TData>
}

// @ TODO Should we drop dataFromServerSideRender? How do we model not fetching on client
export type Data<TData> =
    | {
          hasData: true
          result: TData
          dataFromServerSideRender: boolean
      }
    | { hasData: false }
