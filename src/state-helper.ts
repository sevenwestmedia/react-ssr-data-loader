import { Data } from './data-loader-state'
import { DataLoaderState } from './data-loader-store-and-loader'

export function getDataState(
    keepData: boolean,
    previousRenderParamsHash: string | undefined,
    dataLoaderState: DataLoaderState
): Data<any> {
    if (previousRenderParamsHash && keepData) {
        return dataLoaderState[previousRenderParamsHash].data
    }

    return {
        hasData: false
    }
}
