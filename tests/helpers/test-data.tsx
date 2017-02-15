import { createTypedDataLoader } from '../../src/data-loader'

export const dataType = 'testDataType'

export interface Data {
    result: string
}

export const TestDataLoader = createTypedDataLoader<Data>(dataType)
