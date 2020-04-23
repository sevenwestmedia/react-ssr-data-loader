import React from 'react'
import Adapter from 'enzyme-adapter-react-16'
import { mount, configure } from 'enzyme'
import { act } from 'react-dom/test-utils'
import { ComponentFixture } from './helpers/component-fixture'
import { SharedDataComponentFixture } from './helpers/shared-data-component-fixture'
import { DifferentKeysDataComponentFixture } from './helpers/different-keys-data-component-fixture'
import { DataProvider } from '../src/data-provider'
import { DataLoaderResources } from '../src/index'
import { processEventLoop } from './helpers/event-loop-helpers'

configure({ adapter: new Adapter() })

describe('data-loader', () => {
    it('supports multiple loaders using the same key when data loading', async () => {
        const sut = new SharedDataComponentFixture(undefined, 'testKey', false)

        sut.assertState()
    })

    it('can resolve data from multiple components', async () => {
        const sut = new SharedDataComponentFixture(undefined, 'testKey', false)

        await act(() => sut.testDataPromise.resolve({ result: 'Test' }))

        sut.assertState()
    })

    it('can load multiple dataloaders with different keys', async () => {
        const sut = new DifferentKeysDataComponentFixture(undefined, 'testKey', 'testKey2', false)

        await act(() => sut.testDataPromise.resolve({ result: 'Test' }))

        sut.assertState()
    })

    it('multiple components load data once when props change', async () => {
        const sut = new SharedDataComponentFixture(undefined, 'testKey', false)

        await act(async () => {
            await sut.testDataPromise.resolve({ result: 'Success!' })
            sut.resetPromise()
            sut.root.setProps({ id: 'newData' })
            await sut.testDataPromise.resolve({ result: 'Success2!' })
        })

        sut.assertState()
    })

    it('data is not unloaded until the last attached data-loader is unmounted', async () => {
        const sut = new SharedDataComponentFixture(undefined, 'testKey', false, false, true)

        await act(async () => {
            await sut.testDataPromise.resolve({ result: 'Success!' })
            sut.root.unmount()
            await processEventLoop()
        })

        sut.assertState()
    })

    it('handles onEvent throwing gracefully', async () => {
        const errors: string[] = []
        console.error = jest.fn((...err: any[]) => {
            errors.push(JSON.stringify(err))
        })
        const sut = new ComponentFixture(undefined, 'testKey', {
            isServerSideRender: false,
            onEvent: () => {
                throw new Error('Boom')
            },
        })

        await act(async () => {
            await sut.testDataPromise.resolve({ result: 'Test' })
        })

        sut.assertState()
        expect(errors).toMatchSnapshot()
    })

    it('ignores completion if unmounted first', async () => {
        const sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: false })

        await act(async () => {
            await sut.unmount()
            await sut.testDataPromise.resolve({ result: 'Test' })
        })

        sut.assertState()
    })

    it('notifies when all work is completed', async () => {
        const sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: false })

        expect(sut.loadAllCompletedCalled).toBe(0)
        await sut.testDataPromise.resolve({ result: 'Test' })
        expect(sut.loadAllCompletedCalled).toBe(1)
    })

    it('throws when the same resource is registered multiple times', () => {
        const resources = new DataLoaderResources()

        resources.registerResource('test', () => Promise.resolve('test'))
        expect(() => resources.registerResource('test', () => Promise.resolve('test'))).toThrow()
    })

    it('throws when the same paged resource is registered multiple times', () => {
        const resources = new DataLoaderResources()

        resources.registerResource('test', () => Promise.resolve('test'))
        expect(() => resources.registerResource('test', () => Promise.resolve('test'))).toThrow()
    })

    it('resource can resolve synchronously', async () => {
        const resources = new DataLoaderResources()

        const useLoadData = resources.registerResource<string, { id: string }>(
            'test',
            () => 'Result!',
        )
        let loadCount = 0

        const LoadTest: React.FC = () => {
            const { data } = useLoadData({ id: 'Test!' })
            loadCount++

            if (data.hasData) {
                return <div>{data.result}</div>
            }

            return <div>No data!</div>
        }
        const wrapper = mount(
            <DataProvider resources={resources}>
                <LoadTest />
            </DataProvider>,
        )

        expect(wrapper.html()).toMatchSnapshot()
        await processEventLoop()

        expect(loadCount).toBe(1)
    })

    it('data loader handles synchronous throw', async () => {
        const resources = new DataLoaderResources()

        const useLoadData = resources.registerResource<string, { id: string }>('test', () => {
            throw new Error('Synchronous fail')
        })
        let loadCount = 0

        const LoadTest: React.FC = () => {
            const { data, lastAction } = useLoadData({ id: 'Test!' })
            loadCount++
            if (!lastAction.success) {
                return <div>{lastAction.error.message}</div>
            }
            if (data.hasData) {
                return <div>{data.result}</div>
            }

            return <div>No data!</div>
        }

        const wrapper = mount(
            <DataProvider resources={resources}>
                <LoadTest />
            </DataProvider>,
        )

        expect(wrapper.html()).toMatchSnapshot()
        await processEventLoop()

        expect(loadCount).toBe(1)
    })

    it('resource can resolve synchronously when resource changes', async () => {
        const sut = new ComponentFixture(undefined, 'testKey', {
            isServerSideRender: false,
            unloadDataOnUnmount: false,
            syncResult: {
                result: 'Result!',
            },
        })

        sut.testDataResult = {
            result: 'Result2!',
        }
        sut.setId('newData')

        sut.assertState()
    })
})
