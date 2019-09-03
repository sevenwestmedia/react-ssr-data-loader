import React from 'react'
import { DataLoaderResources } from './data-loader-resources'
import { DataProviderEvents } from './events'
import { DataLoaderContextComponent } from './data-loader-context'
import { DataLoaderStoreAndLoader, DataLoaderState } from './data-loader-store-and-loader'

export interface Props {
    initialState?: DataLoaderState
    onEvent?: (event: DataProviderEvents) => void | Promise<any>
    isServerSideRender?: boolean
    resources: DataLoaderResources<any>
    globalProps?: object
}

export const DataLoaderProvider: React.FC<Props> = props => {
    const [dataLoader] = React.useState(() => {
        return new DataLoaderStoreAndLoader(
            // tslint:disable-next-line:no-empty
            props.onEvent || (() => {}),
            props.initialState,
            params => {
                const dataLoader = props.resources.getResourceLoader(params.resourceType)
                if (!dataLoader) {
                    return Promise.reject(`No data loader present for ${params.resourceType}`)
                }

                return dataLoader.loadResource({
                    ...props.globalProps,
                    ...params,
                })
            },
            (resourceType, dataLoadParams) => {
                return props.resources.generateCacheKey(resourceType, dataLoadParams)
            },
            props.isServerSideRender || false,
        )
    })

    return (
        <DataLoaderContextComponent.Provider value={dataLoader}>
            {props.children}
        </DataLoaderContextComponent.Provider>
    )
}
DataLoaderProvider.displayName = 'DataLoaderProvider'
