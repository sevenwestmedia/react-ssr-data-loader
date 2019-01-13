import { ResourceLoadInfo } from './data-loader-state'

export function isPromise(value: any): value is Promise<any> {
    return Promise.resolve(value) === value
}

export function getError(
    metadata: ResourceLoadInfo<any, any>,
    err: any,
    fallbackMsg?: string
): Error {
    if (err instanceof Error) {
        ;(err as any).dataLoadContext = `${metadata.resourceType} ${metadata.resourceId}`

        return err
    }
    if (typeof err === 'string') {
        const error = new Error(err)
        ;(error as any).dataLoadContext = `${metadata.resourceType} ${metadata.resourceId}`
        return error
    }

    const fallbackEror = new Error((err || fallbackMsg).toString())
    ;(fallbackEror as any).dataLoadContext = `${metadata.resourceType} ${metadata.resourceId}`
    return fallbackEror
}
