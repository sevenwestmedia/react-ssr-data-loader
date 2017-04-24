import * as React from 'react'
import { Props, createTypedDataLoader } from './data-loader'

export type LoadResource = (dataKey: string, resourceParameters?: any) => Promise<any>
interface Resources {
    [dataType: string]: LoadResource
}

export default class DataLoaderResources {
    private resources: Resources = {}

    registerResource<T, TData>(dataType: string, loadResource: (dataKey: string, resourceParameters?: T) => Promise<TData>): React.ComponentClass<Props<TData, {}>> {
        const typedDataLoader = createTypedDataLoader<TData, T, {}>(dataType, {})
        this.resources[dataType] = loadResource

        return typedDataLoader
    }

    getResourceLoader(dataType: any): LoadResource {
        return this.resources[dataType]
    }
}