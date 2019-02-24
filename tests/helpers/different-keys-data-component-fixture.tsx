import React from 'react'
import { Props, UserActions } from '../../src/data-loader'
import { DataLoaderProvider } from '../../src/data-provider'
import { DataLoaderResources } from '../../src/data-loader-resources'
import { LoaderState } from '../../src/data-loader-state'
import { Data, resourceType } from './test-data'

// tslint:disable-next-line:no-implicit-dependencies
import { mount, ReactWrapper } from 'enzyme'
import { PromiseCompletionSource } from 'promise-completion-source'
import { DataLoaderState } from '../../src/data-loader-store-and-loader'

export class DifferentKeysDataComponentFixture {
    loadAllCompletedCalled = 0
    loadDataCount1 = 0
    loadDataCount2 = 0
    renderCount = 0
    testDataPromise: PromiseCompletionSource<Data>
    testDataPromise2: PromiseCompletionSource<Data>
    root: ReactWrapper<{ id: string }, any>
    component: ReactWrapper<Props<Data, any, any>, any>
    resources: DataLoaderResources<any>
    currentState: DataLoaderState | undefined
    lastRenderProps!: LoaderState<Data, any>
    lastRenderProps2!: LoaderState<Data, any>
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
        this.testDataPromise = new PromiseCompletionSource<Data>()
        this.testDataPromise2 = new PromiseCompletionSource<Data>()
        this.resources = new DataLoaderResources()

        const TestDataLoader = this.resources.registerResource<Data, { id: string }>(
            resourceType,
            params => {
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

        const TestComponent: React.SFC<{ id: string; id2: string }> = testProp => (
            <DataLoaderProvider
                initialState={initialState}
                isServerSideRender={isServerSideRender}
                resources={this.resources}
                // tslint:disable-next-line:jsx-no-lambda
                onEvent={event => {
                    if (event.type === 'data-load-completed') {
                        this.loadAllCompletedCalled++
                    } else if (event.type === 'state-changed') {
                        this.currentState = event.state
                    } else if (event.type === 'load-error') {
                        // tslint:disable-next-line:no-console
                        console.info(event.data.error)
                    }
                }}
            >
                <div>
                    <TestDataLoader
                        id={testProp.id}
                        clientLoadOnly={clientLoadOnly}
                        // tslint:disable-next-line:jsx-no-lambda
                        renderData={(props, actions) => {
                            this.renderCount++
                            this.lastRenderProps = props
                            this.lastRenderActions1 = actions
                            return null
                        }}
                    />
                    <TestDataLoader
                        id={testProp.id2}
                        clientLoadOnly={clientLoadOnly}
                        // tslint:disable-next-line:jsx-no-lambda
                        renderData={(props, actions) => {
                            this.lastRenderProps2 = props
                            this.lastRenderActions2 = actions
                            return null
                        }}
                    />
                </div>
            </DataLoaderProvider>
        )

        this.root = mount(<TestComponent id={id} id2={id2} />)

        this.component = this.root.find(TestDataLoader)
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
        this.testDataPromise = new PromiseCompletionSource<Data>()
    }

    unmount = async () => {
        this.root.unmount()

        return new Promise(resolve => setTimeout(resolve))
    }
}
