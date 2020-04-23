import React from 'react'
import { mount, ReactWrapper } from 'enzyme'
import { PromiseCompletionSource } from 'promise-completion-source'

import { DataProvider } from '../../src/data-provider'
import { DataLoaderResources } from '../../src/data-loader-resources'
import { LoaderState } from '../../src/data-loader-state'
import { DataLoaderState } from '../../src/data-loader-store-and-loader'

import { TestDataType, resourceType } from './test-data'

export class SharedDataComponentFixture {
    loadAllCompletedCalled = 0
    loadDataCount = 0
    renderCount = 0
    renderCount2 = 0
    testDataPromise: PromiseCompletionSource<TestDataType>
    testDataPromise2!: PromiseCompletionSource<TestDataType>
    root: ReactWrapper<
        {
            id: string
            unmountLastDataLoader: boolean
            renderAdditionalDataLoader: boolean
        },
        any
    >
    resources: DataLoaderResources<any>
    currentState: DataLoaderState | undefined
    lastRenderProps!: LoaderState<TestDataType>
    lastRenderProps2!: LoaderState<TestDataType>

    constructor(
        initialState: DataLoaderState | undefined,
        id: string,
        isServerSideRender: boolean,
        clientLoadOnly = false,
        additionalDataLoader = false,
    ) {
        this.currentState = initialState
        this.testDataPromise = new PromiseCompletionSource<TestDataType>()
        this.resources = new DataLoaderResources()
        const useDataLoader = this.resources.registerResource<TestDataType, { id: string }>(
            resourceType,
            () => {
                this.loadDataCount++
                return this.testDataPromise.promise
            },
        )

        const ComponentWithData1: React.FC<{ id: string }> = ({ id }) => {
            const { actions, params, ...props } = useDataLoader({ id }, { clientLoadOnly })
            this.renderCount++
            this.lastRenderProps = props
            return null
        }
        const ComponentWithData2: React.FC<{ id: string }> = ({ id }) => {
            const { actions, params, ...props } = useDataLoader({ id }, { clientLoadOnly })
            this.renderCount2++
            this.lastRenderProps2 = props
            return null
        }
        const ExtraWithData: React.FC<{ id: string }> = ({ id }) => {
            useDataLoader({ id }, { clientLoadOnly })
            return null
        }
        const TestComponent: React.FC<{
            id: string
            renderAdditionalDataLoader: boolean
            unmountLastDataLoader: boolean
        }> = ({ id: testId, renderAdditionalDataLoader, unmountLastDataLoader }) => {
            return (
                <div>
                    <ComponentWithData1 id={testId} />
                    {renderAdditionalDataLoader && <ExtraWithData id={testId} />}
                    {!unmountLastDataLoader && <ComponentWithData2 id={testId} />}
                </div>
            )
        }

        const Root = (props: { id: string }) => {
            return (
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
                    <TestComponent
                        id={props.id}
                        unmountLastDataLoader={false}
                        renderAdditionalDataLoader={additionalDataLoader}
                    />
                </DataProvider>
            )
        }

        this.root = mount(<Root id={id} />)
    }

    assertState() {
        expect({
            renderCount: this.renderCount,
            renderCount2: this.renderCount2,
            loadAllCompletedCalled: this.loadAllCompletedCalled,
            renderProps1: this.lastRenderProps,
            renderProps2: this.lastRenderProps2,
            loadDataCount: this.loadDataCount,
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
