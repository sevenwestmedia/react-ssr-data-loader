import React from 'react'
import { ComponentFixture } from './helpers/component-fixture'
import { SharedDataComponentFixture } from './helpers/shared-data-component-fixture'
import { DifferentKeysDataComponentFixture } from './helpers/different-keys-data-component-fixture'
import { DataLoaderProvider } from '../src/data-provider'
import { DataLoaderResources } from '../src/index'
// tslint:disable-next-line:no-implicit-dependencies
import { mount } from 'enzyme'

describe('data-loader', () => {
    it('supports multiple loaders using the same key when data loading', async () => {
        const sut = new SharedDataComponentFixture(undefined, 'testKey', false)

        sut.assertState()
    })

    it('can resolve data from multiple components', async () => {
        const sut = new SharedDataComponentFixture(undefined, 'testKey', false)
        await sut.testDataPromise.resolve({ result: 'Test' })

        sut.assertState()
    })

    it('can load multiple dataloaders with different keys', async () => {
        const sut = new DifferentKeysDataComponentFixture(undefined, 'testKey', 'testKey2', false)
        await sut.testDataPromise.resolve({ result: 'Test' })

        sut.assertState()
    })

    it('multiple components load data once when props change', async () => {
        const sut = new SharedDataComponentFixture(undefined, 'testKey', false)

        await sut.testDataPromise.resolve({ result: 'Success!' })
        sut.resetPromise()
        sut.root.setProps({ resourceId: 'newData' })
        await sut.testDataPromise.resolve({ result: 'Success2!' })

        sut.assertState()
    })

    it('data is not unloaded until the last attached data-loader is unmounted', async () => {
        const sut = new SharedDataComponentFixture(undefined, 'testKey', false, false, true)

        await sut.testDataPromise.resolve({ result: 'Success!' })
        sut.root.unmount()
        await new Promise(resolve => setTimeout(resolve))

        sut.assertState()
    })

    it('handles onEvent throwing gracefully', async () => {
        const errors: string[] = []
        // tslint:disable-next-line:no-console
        console.error = jest.fn((...err: any[]) => {
            errors.push(JSON.stringify(err))
        })
        const sut = new ComponentFixture(undefined, 'testKey', {
            isServerSideRender: false,
            onEvent: () => {
                throw new Error('Boom')
            }
        })
        await sut.testDataPromise.resolve({ result: 'Test' })

        sut.assertState()
        expect(errors).toMatchSnapshot()
    })

    it('ignores completion if unmounted first', async () => {
        const sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: false })
        await sut.unmount()
        await sut.testDataPromise.resolve({ result: 'Test' })

        sut.assertState()
    })

    it('notifies when all work is completed', async () => {
        const sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: false })

        expect(sut.loadAllCompletedCalled).toBe(0)
        await sut.testDataPromise.resolve({ result: 'Test' })
        expect(sut.loadAllCompletedCalled).toBe(1)
    })

    it('can support preserving data on unmount', async () => {
        let sut = new ComponentFixture(undefined, 'testKey', {
            isServerSideRender: false,
            unloadDataOnUnmount: false
        })
        await sut.testDataPromise.resolve({ result: 'Test' })
        await sut.unmount()

        sut.assertState()
        // Check we can re-mount the existing data
        sut = new ComponentFixture(sut.currentState, 'testKey', {
            isServerSideRender: false,
            unloadDataOnUnmount: false
        })
        sut.assertState()
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

        const LoadTest = resources.registerResource('test', () => 'Result!')
        let loadCount = 0

        const wrapper = mount(
            <DataLoaderProvider resources={resources}>
                <LoadTest
                    resourceId="Test!"
                    // tslint:disable-next-line:jsx-no-lambda
                    renderData={renderProps => {
                        loadCount++
                        if (renderProps.data.hasData) {
                            return <div>{renderProps.data.result}</div>
                        }

                        return <div>No data!</div>
                    }}
                />
            </DataLoaderProvider>
        )

        expect(wrapper.html()).toMatchSnapshot()
        await new Promise(resolve => setTimeout(resolve))

        expect(loadCount).toBe(1)
    })

    it('data loader handles synchronous throw', async () => {
        const resources = new DataLoaderResources()

        const LoadTest = resources.registerResource('test', () => {
            throw new Error('Synchronous fail')
        })
        let loadCount = 0

        const wrapper = mount(
            <DataLoaderProvider resources={resources}>
                <LoadTest
                    resourceId="Test!"
                    // tslint:disable-next-line:jsx-no-lambda
                    renderData={renderProps => {
                        loadCount++
                        if (!renderProps.lastAction.success) {
                            return <div>{renderProps.lastAction.error.message}</div>
                        }
                        if (renderProps.data.hasData) {
                            return <div>{renderProps.data.result}</div>
                        }

                        return <div>No data!</div>
                    }}
                />
            </DataLoaderProvider>
        )

        expect(wrapper.html()).toMatchSnapshot()
        await new Promise(resolve => setTimeout(resolve))

        expect(loadCount).toBe(1)
    })

    it('resource can resolve synchronously when resource changes', async () => {
        const sut = new ComponentFixture(undefined, 'testKey', {
            isServerSideRender: false,
            unloadDataOnUnmount: false,
            syncResult: {
                result: 'Result!'
            }
        })

        sut.testDataResult = {
            result: 'Result2!'
        }
        sut.root.setProps({ resourceId: 'newData' })

        sut.assertState()
    })
})
