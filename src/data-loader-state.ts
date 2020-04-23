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

export interface LoaderState<ResourceDataType> {
    status: LoaderStatus
    lastAction: SuccessAction | FailedAction
    data: Data<ResourceDataType>
}

export type Data<ResourceDataType> =
    | {
          hasData: true
          result: ResourceDataType
          dataFromServerSideRender: boolean
      }
    | { hasData: false }
