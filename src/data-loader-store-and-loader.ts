import reducer from './data-loader-reducer'
import { DataProviderEvents } from './events'
import { DataLoaderState, ResourceLoadInfo } from './data-loader-state'
import * as Actions from './data-loader-actions'
import objectHash from 'object-hash'

export class DataLoaderStoreAndLoader {
    // We need to track this in two places, one with immediate effect,
    // one tied to reacts lifecycle
    private loadingCount = 0
    private state: DataLoaderState

    // When called, data loader will update
    private registeredDataLoaders: {
        [dataLoaderId: string]: () => void
    }
    constructor(
        private onEvent: (event: DataProviderEvents) => void | Promise<any>,
        initialState: DataLoaderState | undefined,
        private performLoad: (metadata: ResourceLoadInfo<any, any>) => Promise<any> | any,
        public isServerSideRender: boolean
    ) {
        if (initialState) {
            this.state = initialState
        } else {
            this.state = reducer(undefined, { type: Actions.INIT })
            this.raiseEvent({
                type: 'state-changed',
                state: this.state
            })
        }
    }

    attach(componentInstanceId: string, update: () => void): void {
        this.registeredDataLoaders[componentInstanceId] = update
    }

    // Returns true when data needs to be unloaded from redux
    detach(componentInstanceId: string) {
        delete this.registeredDataLoaders[componentInstanceId]
    }

    getDataLoaderState(componentInstanceId: string, resourceType: string, dataLoadParams: object) {
        if (!this.registeredDataLoaders[componentInstanceId]) {
            throw new Error(`Data loader with id ${componentInstanceId}`)
        }

        const paramsObject = {
            resourceType,
            ...dataLoadParams
            // Need to get internal state from somewhere?
        }

        const paramsObjectHash = objectHash(paramsObject)

        const dataCache: any = null // TODO implement this
        const loadingState = dataCache.currentState(paramsObjectHash)
        if (loadingState) {
            return loadingState
        }

        dataCache.performLoad()

        const hasParamsChangedForComponent: any = null
        if (hasParamsChangedForComponent(componentInstanceId, paramsObjectHash)) {
            // cleanup old params cache
        }
    }
}
