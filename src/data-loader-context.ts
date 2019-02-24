import React from 'react'
import { LoaderState } from './data-loader-state'
import { DataLoaderStoreAndLoader } from './data-loader-store-and-loader'

export const DataLoaderContextComponent = React.createContext<DataLoaderStoreAndLoader | undefined>(
    undefined,
)

export function ensureContext(
    context: DataLoaderStoreAndLoader | undefined,
): DataLoaderStoreAndLoader {
    if (!context) {
        throw new Error(
            'Data loader context missing, ensure you have wrapped your application in a DataLoaderProvider',
        )
    }

    return context
}

export function ssrNeedsData(state: LoaderState<any, any> | undefined) {
    return !state || (!state.data.hasData && state.lastAction.success)
}
