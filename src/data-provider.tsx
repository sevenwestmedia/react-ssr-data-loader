import React from 'react'
import { DataLoaderResources } from './data-loader-resources'
import { DataProviderEvents } from './events'
import { DataLoaderContextComponent } from './data-loader-context'
import { DataLoaderStoreAndLoader, DataLoaderState } from './data-loader-store-and-loader'

export interface DataProviderProps {
    initialState?: DataLoaderState
    onEvent?: (event: DataProviderEvents) => void | Promise<any>
    isServerSideRender?: boolean
    resources: DataLoaderResources<any>
    globalProps?: Record<string, unknown>
}

export const DataProvider: React.FC<DataProviderProps> = (props) => {
    const [dataLoader] = React.useState(() => {
        return new DataLoaderStoreAndLoader(
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            props.onEvent || (() => {}),
            props.initialState,
            (params) => {
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
DataProvider.displayName = 'DataLoaderProvider'
