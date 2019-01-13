import React from 'react'
import { INIT } from './data-loader-actions'
import reducer from './data-loader-reducer'
import { DataLoaderResources } from './data-loader-resources'
import { DataProviderEvents } from './events'
import { DataLoaderContextComponent } from './data-loader-context'
import { DataLoaderStoreAndLoader } from './data-loader-store-and-loader'
import { DataLoaderState, ResourceLoadInfo } from './data-loader-state'

export interface Props {
    initialState?: DataLoaderState
    onEvent?: (event: DataProviderEvents) => void | Promise<any>
    isServerSideRender?: boolean
    resources: DataLoaderResources<any>
    additionalLoaderProps?: object
}

export type State = DataLoaderState

export class DataLoaderProvider extends React.Component<Props, {}> {
    state: State = reducer(undefined, { type: INIT })
    private dataLoader: DataLoaderStoreAndLoader

    constructor(props: Props, context: any) {
        super(props, context)

        this.dataLoader = new DataLoaderStoreAndLoader(
            // tslint:disable-next-line:no-empty
            this.props.onEvent || (() => {}),
            this.props.initialState,
            this.loadData,
            this.props.isServerSideRender || false
        )
    }

    render() {
        return (
            <DataLoaderContextComponent.Provider value={this.dataLoader}>
                {this.props.children}
            </DataLoaderContextComponent.Provider>
        )
    }

    private loadData = (metadata: ResourceLoadInfo<any, any>, existingData: any): Promise<any> => {
        const dataLoader = this.props.resources.getResourceLoader(metadata.resourceType)
        if (!dataLoader) {
            return Promise.reject(`No data loader present for ${metadata.resourceType}`)
        }

        return dataLoader(
            metadata.resourceId,
            {
                ...metadata.resourceLoadParams,
                ...metadata.internalState,
                ...this.props.additionalLoaderProps
            },
            existingData
        )
    }
}
