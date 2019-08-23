import { LoadParams } from './data-loader-store-and-loader'

export function getError(metadata: LoadParams, err: any, fallbackMsg?: string): Error {
    if (err instanceof Error) {
        ;(err as any).dataLoadContext = `${metadata.resourceType}`

        return err
    }
    if (typeof err === 'string') {
        const error = new Error(err)
        ;(error as any).dataLoadContext = `${metadata.resourceType}`
        return error
    }

    const fallbackEror = new Error((err || fallbackMsg).toString())
    ;(fallbackEror as any).dataLoadContext = `${metadata.resourceType}`
    return fallbackEror
}
