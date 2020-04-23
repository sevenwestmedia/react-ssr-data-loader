import React from 'react'
import Adapter from 'enzyme-adapter-react-16'
import { DataLoaderResources, DataProvider } from '../src'
import { TestDataType, resourceType } from './helpers/test-data'
import { mount, configure } from 'enzyme'

configure({ adapter: new Adapter() })

test('check type', () => {
    const resources = new DataLoaderResources()
    const useDataLoader = resources.registerResource<TestDataType, { id: string }>(
        resourceType,
        ({ id, paramsCacheKey, resourceType }) => {
            // $ExpectType string
            id
            // $ExpectType string
            paramsCacheKey
            // $ExpectType string
            resourceType

            // eslint-disable-next-line @typescript-eslint/no-empty-function
            return new Promise<TestDataType>(() => {})
        },
    )

    const TestComponent = () => {
        const { lastAction, actions, data, params, status } = useDataLoader({ id: 'id to load' })

        // $ExpectType SuccessAction | FailedAction
        lastAction
        // $ExpectType UserActions<"refresh">
        actions
        // $ExpectType Data<TestDataType>
        data
        // $ExpectType { id: string; }
        params
        // $ExpectType LoaderStatus
        status

        return null
    }

    mount(
        <DataProvider resources={resources}>
            <TestComponent />
        </DataProvider>,
    )
})
