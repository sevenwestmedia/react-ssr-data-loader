import { createTypedDataLoader } from '../../src/data-loader'

export interface Data {
    result: string
}

export const TestDataLoader = createTypedDataLoader<Data>()