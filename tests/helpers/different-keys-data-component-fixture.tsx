import React from 'react'
import { mount, ReactWrapper } from 'enzyme'
import { PromiseCompletionSource } from 'promise-completion-source'

import { UserActions } from '../../src/data-loader'
import { DataProvider } from '../../src/data-provider'
import { DataLoaderResources } from '../../src/data-loader-resources'
import { LoaderState } from '../../src/data-loader-state'
import { DataLoaderState } from '../../src/data-loader-store-and-loader'

import { TestDataType, resourceType } from './test-data'

export class DifferentKeysDataComponentFixture {
    loadAllCompletedCalled = 0
    loadDataCount1 = 0
    loadDataCount2 = 0
    renderCount = 0
    testDataPromise: PromiseCompletionSource<TestDataType>
    testDataPromise2: PromiseCompletionSource<TestDataType>
    root: ReactWrapper<{ id: string }, any>
    resources: DataLoaderResources<any>
    currentState: DataLoaderState | undefined
    lastRenderProps!: LoaderState<TestDataType>
    lastRenderProps2!: LoaderState<TestDataType>
    lastRenderActions1!: UserActions<any>
    lastRenderActions2!: UserActions<any>

    constructor(
        initialState: DataLoaderState | undefined,
        id: string,
        id2: string,
        isServerSideRender: boolean,
        clientLoadOnly = false,
    ) {
        this.currentState = initialState
        this.testDataPromise = new PromiseCompletionSource<TestDataType>()
        this.testDataPromise2 = new PromiseCompletionSource<TestDataType>()
        this.resources = new DataLoaderResources()

        const useDataLoader = this.resources.registerResource<TestDataType, { id: string }>(
            resourceType,
            (params) => {
                if (params.id === id) {
                    this.loadDataCount1++
                    return this.testDataPromise.promise
                } else if (params.id === id2) {
                    this.loadDataCount2++
                    return this.testDataPromise2.promise
                }

                return Promise.reject("Key doesn't match?")
            },
        )

        const ComponentWithData1: React.FC<{ id: string }> = ({ id }) => {
            const { params, actions, ...props } = useDataLoader({ id }, { clientLoadOnly })
            this.renderCount++
            this.lastRenderProps = props
            this.lastRenderActions1 = actions
            return null
        }
        const ComponentWithData2: React.FC<{ id: string }> = ({ id }) => {
            const { params, actions, ...props } = useDataLoader({ id }, { clientLoadOnly })
            this.lastRenderProps2 = props
            this.lastRenderActions2 = actions
            return null
        }

        const TestComponent: React.SFC<{ id: string; id2: string }> = (testProp) => (
            <div>
                <ComponentWithData1 id={testProp.id} />
                <ComponentWithData2 id={testProp.id2} />
            </div>
        )

        this.root = mount(
            <DataProvider
                initialState={initialState}
                isServerSideRender={isServerSideRender}
                resources={this.resources}
                onEvent={(event) => {
                    if (event.type === 'data-load-completed') {
                        this.loadAllCompletedCalled++
                    } else if (event.type === 'state-changed') {
                        this.currentState = event.state
                    } else if (event.type === 'load-error') {
                        console.info(event.data.error)
                    }
                }}
            >
                <TestComponent id={id} id2={id2} />
            </DataProvider>,
        )
    }

    refreshData1() {
        this.lastRenderActions1.refresh()
    }

    refreshData2() {
        this.lastRenderActions2.refresh()
    }

    assertState() {
        expect({
            renderCount: this.renderCount,
            loadAllCompletedCalled: this.loadAllCompletedCalled,
            renderProps: this.lastRenderProps,
            renderProps2: this.lastRenderProps2,
            loadDataCount1: this.loadDataCount1,
            loadDataCount2: this.loadDataCount2,
        }).toMatchSnapshot()
    }

    resetPromise() {
        this.testDataPromise = new PromiseCompletionSource<TestDataType>()
    }

    unmount = async () => {
        this.root.unmount()

        return new Promise((resolve) => setTimeout(resolve))
    }
}
