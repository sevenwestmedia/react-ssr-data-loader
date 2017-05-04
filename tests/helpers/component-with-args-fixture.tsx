import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { Props } from '../../src/data-loader'
import DataProvider from '../../src/data-provider'
import DataLoaderResources, { RefreshAction } from '../../src/data-loader-resources'
import { reducer, DataLoaderState, LoaderState } from '../../src/data-loader-actions'
import PromiseCompletionSource from './promise-completion-source'
import { Data, resourceType } from './test-data'

export default class ComponentFixture<T extends object> {
    loadAllCompletedCalled = 0
    loadDataCount = 0
    renderCount = 0
    testDataPromise: PromiseCompletionSource<Data>
    root: ReactWrapper<{ resourceId: string }, any>
    component: ReactWrapper<Props<Data, {}>, any>
    resources: DataLoaderResources
    passedParams: T
    currentState: DataLoaderState
    lastRenderProps: LoaderState<Data>
    lastRenderActions: RefreshAction

    constructor(initialState: DataLoaderState, resourceId: string, args: T, isServerSideRender: boolean, clientLoadOnly = false) {
        this.currentState = initialState
        this.testDataPromise = new PromiseCompletionSource<Data>()
        this.resources = new DataLoaderResources()
        
        const TestDataLoader = this.resources.registerResource(resourceType, (resourceId: string, params: T) => {
            this.loadDataCount++
            this.passedParams = params
            return this.testDataPromise.promise
        })

        const TestComponent: React.SFC<{ resourceId: string }> = ({ resourceId }) => (
            <DataProvider
                initialState={initialState}
                isServerSideRender={isServerSideRender}
                resources={this.resources}
                loadAllCompleted={() => this.loadAllCompletedCalled++}
                stateChanged={state => this.currentState = state}
                onError={err => console.error(err)}
            >
                <TestDataLoader
                    {...args}
                    resourceId={resourceId}
                    clientLoadOnly={clientLoadOnly}
                    renderData={(props, actions) => {
                        this.renderCount++
                        this.lastRenderProps = props
                        this.lastRenderActions = actions

                        return null
                    }}
                />
            </DataProvider>
        )

        this.root = mount(<TestComponent resourceId={resourceId} />)

        this.component = this.root.find(TestDataLoader)
    }

    assertState() {
        expect({
            renderCount: this.renderCount,
            loadAllCompletedCalled: this.loadAllCompletedCalled,
            renderProps: this.lastRenderProps,
            renderActions: this.lastRenderActions,
            loadDataCount: this.loadDataCount
        }).toMatchSnapshot()
    }

    resetPromise() {
        this.testDataPromise = new PromiseCompletionSource<Data>()
    }

    getState = () => this.currentState

    unmount = async() => {
        this.root.unmount()

        return new Promise((resolve) => setTimeout(resolve))
    }
}