import React from 'react'
import { DataLoaderResources } from './data-loader-resources'
import { DataProviderEvents } from './events'
import { DataLoaderContextComponent } from './data-loader-context'
import {
    DataLoaderStoreAndLoader,
    DataLoaderState,
    ObjectHash,
} from './data-loader-store-and-loader'

export interface Props {
    initialState?: DataLoaderState
    onEvent?: (event: DataProviderEvents) => void | Promise<any>
    isServerSideRender?: boolean
    resources: DataLoaderResources<any>
    globalProps?: object
    /** Override the object hasing function */
    objectHash?: ObjectHash
}

export class DataLoaderProvider extends React.Component<Props> {
    private dataLoader: DataLoaderStoreAndLoader

    constructor(props: Props) {
        super(props)

        this.dataLoader = new DataLoaderStoreAndLoader(
            // tslint:disable-next-line:no-empty
            this.props.onEvent || (() => {}),
            this.props.initialState,
            params => {
                const dataLoader = this.props.resources.getResourceLoader(params.resourceType)
                if (!dataLoader) {
                    return Promise.reject(`No data loader present for ${params.resourceType}`)
                }

                return dataLoader({
                    ...this.props.globalProps,
                    ...params,
                })
            },
            this.props.objectHash || require('hash-sum'),
            this.props.isServerSideRender || false,
        )
    }

    render() {
        return (
            <DataLoaderContextComponent.Provider value={this.dataLoader}>
                {this.props.children}
            </DataLoaderContextComponent.Provider>
        )
    }
}
