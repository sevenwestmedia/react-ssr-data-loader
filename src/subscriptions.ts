import { DataLoaderState, LoaderState, ResourceLoadInfo } from './data-loader-actions'

export type DataUpdateCallback = (newState: LoaderState<any>, internalState: any) => void
export type StateSubscription = (state: DataLoaderState) => void

export class Subscriptions {
    private subscriptions: {
        [resourceType: string]: {
            [resourceId: string]: DataUpdateCallback[]
        }
    } = {}
    private stateSubscriptions: StateSubscription[] = []

    subscribeToStateChanges = (listener: StateSubscription): void => {
        this.stateSubscriptions.push(listener)
    }

    unsubscribeFromStateChanges = (listener: StateSubscription): void => {
        this.stateSubscriptions.splice(this.stateSubscriptions.indexOf(listener), 1)
    }

    hasRegisteredDataLoader = (resourceType: string, resourceId: string) => {
        return (
            this.subscriptions[resourceType] &&
            this.subscriptions[resourceType][resourceId] &&
            this.subscriptions[resourceType][resourceId].length > 0
        )
    }

    /** @returns new number of subscribers */
    registerDataLoader = (
        resourceType: string,
        resourceId: string,
        update: DataUpdateCallback
    ): number => {
        const subscriptions = this.getSubscription(resourceType, resourceId)

        subscriptions.push(update)
        return subscriptions.length
    }

    /** @returns remaining number of subscribers */
    unregisterDataLoader = (
        resourceType: string,
        resourceId: string,
        update: DataUpdateCallback
    ): number => {
        const subscriptions = this.getSubscription(resourceType, resourceId)

        if (subscriptions.length === 1) {
            delete this.subscriptions[resourceType][resourceId]
            if (Object.keys(this.subscriptions[resourceType]).length === 0) {
                delete this.subscriptions[resourceType]
            }

            return 0
        }

        const subscriptionIndex = subscriptions.indexOf(update)
        const without = subscriptions.splice(subscriptionIndex, 1)
        this.subscriptions[resourceType][resourceId] = without
        return without.length
    }

    notifyStateSubscribersAndDataLoaders = (
        state: DataLoaderState,
        metadata: ResourceLoadInfo<any, any>
    ) => {
        const resourceTypeSubscriptions = this.subscriptions[metadata.resourceType]
        if (!resourceTypeSubscriptions) {
            return
        }

        const resourceIdSubscriptions = resourceTypeSubscriptions[metadata.resourceId]
        if (!resourceIdSubscriptions) {
            return
        }

        for (const subscriber of resourceIdSubscriptions) {
            const typeState = state.data[metadata.resourceType]
            if (typeState && typeState[metadata.resourceId]) {
                subscriber(typeState[metadata.resourceId], metadata.internalState)
            }
        }

        // Notify any is-loading components
        for (const stateSubscriber of this.stateSubscriptions) {
            stateSubscriber(state)
        }
    }

    private getSubscription(resourceType: string, resourceId: string) {
        if (!this.subscriptions[resourceType]) {
            this.subscriptions[resourceType] = {}
        }

        if (!this.subscriptions[resourceType][resourceId]) {
            this.subscriptions[resourceType][resourceId] = []
        }

        return this.subscriptions[resourceType][resourceId]
    }
}
