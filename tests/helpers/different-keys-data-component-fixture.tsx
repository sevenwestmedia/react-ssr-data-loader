import * as React from 'react'
import { mount, ReactWrapper } from 'enzyme'
import { Props } from '../../src/data-loader'
import DataProvider from '../../src/data-provider'
import DataLoaderResources, { RefreshAction } from '../../src/data-loader-resources'
import { DataLoaderState, LoaderState } from '../../src/data-loader-actions'
import PromiseCompletionSource from './promise-completion-source'
import { Data, resourceType } from './test-data'

export default class ComponentFixture {
    loadAllCompletedCalled = 0
    loadDataCount1 = 0
    loadDataCount2 = 0
    renderCount = 0
    testDataPromise: PromiseCompletionSource<Data>
    testDataPromise2: PromiseCompletionSource<Data>
    root: ReactWrapper<{ resourceId: string }, any>
    component: ReactWrapper<Props<Data, any>, any>
    resources: DataLoaderResources<any>
    currentState: DataLoaderState | undefined
    lastRenderProps: LoaderState<Data>
    lastRenderProps2: LoaderState<Data>
    lastRenderActions1: RefreshAction
    lastRenderActions2: RefreshAction

    constructor(
        initialState: DataLoaderState | undefined,
        resourceId: string,
        resourceId2: string,
        isServerSideRender: boolean,
        clientLoadOnly = false
    ) {
        this.currentState = initialState
        this.testDataPromise = new PromiseCompletionSource<Data>()
        this.testDataPromise2 = new PromiseCompletionSource<Data>()
        this.resources = new DataLoaderResources()
        const TestDataLoader = this.resources.registerResource(resourceType, (key: string) => {
            if (key === resourceId) {
                this.loadDataCount1++
                return this.testDataPromise.promise
            } else if (key === resourceId2) {
                this.loadDataCount2++
                return this.testDataPromise2.promise
            }

            return Promise.reject("Key doesn't match?")
        })

        const TestComponent: React.SFC<{ resourceId: string; resourceId2: string }> = testProp => (
            <DataProvider
                initialState={initialState}
                isServerSideRender={isServerSideRender}
                resources={this.resources}
                onEvent={event => {
                    if (event.type === 'data-load-completed') {
                        this.loadAllCompletedCalled++
                    } else if (event.type === 'state-changed') {
                        this.currentState = event.state
                    } else if (event.type === 'load-error') {
                        console.error(event.data.error)
                    }
                }}
            >
                <div>
                    <TestDataLoader
                        resourceId={testProp.resourceId}
                        clientLoadOnly={clientLoadOnly}
                        renderData={(props, actions) => {
                            this.renderCount++
                            this.lastRenderProps = props
                            this.lastRenderActions1 = actions
                            return null
                        }}
                    />
                    <TestDataLoader
                        resourceId={testProp.resourceId2}
                        clientLoadOnly={clientLoadOnly}
                        renderData={(props, actions) => {
                            this.lastRenderProps2 = props
                            this.lastRenderActions2 = actions
                            return null
                        }}
                    />
                </div>
            </DataProvider>
        )

        this.root = mount(<TestComponent resourceId={resourceId} resourceId2={resourceId2} />)

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
            loadDataCount2: this.loadDataCount2
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
