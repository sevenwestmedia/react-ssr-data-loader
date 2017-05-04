import * as React from 'react'
import { mount, ReactWrapper } from 'enzyme'
import { Props } from '../../src/data-loader'
import DataProvider from '../../src/data-provider'
import DataLoaderResources, { RefreshAction } from '../../src/data-loader-resources'
import { DataLoaderState, LoaderState } from '../../src/data-loader-actions'
import PromiseCompletionSource from './promise-completion-source'
import { Data, resourceType } from './test-data'

export interface FixtureOptions {
    isServerSideRender: boolean
    clientLoadOnly?: boolean
    unloadDataOnUnmount?: boolean
}

export default class ComponentFixture {
    loadAllCompletedCalled = 0
    loadDataCount = 0
    renderCount = 0
    testDataPromise: PromiseCompletionSource<Data>
    root: ReactWrapper<{ resourceId: string }, any>
    component: ReactWrapper<Props<Data, {}>, any>
    resources: DataLoaderResources
    currentState: DataLoaderState | undefined
    lastRenderProps: LoaderState<Data>
    lastRenderActions: RefreshAction

    constructor(initialState: DataLoaderState | undefined, resourceId: string, options: FixtureOptions) {
        this.currentState = initialState
        this.testDataPromise = new PromiseCompletionSource<Data>()
        this.resources = new DataLoaderResources()
        const TestDataLoader = this.resources.registerResource(resourceType, () => {
            this.loadDataCount++
            return this.testDataPromise.promise
        })

        const TestComponent: React.SFC<{ resourceId: string }> = ({ resourceId }) => (
            <DataProvider
                initialState={initialState}
                isServerSideRender={options.isServerSideRender}
                resources={this.resources}
                loadAllCompleted={() => this.loadAllCompletedCalled++}
                stateChanged={state => this.currentState = state}
                onError={err => console.error(err)}
            >
                <TestDataLoader
                    resourceId={resourceId}
                    clientLoadOnly={options.clientLoadOnly}
                    unloadDataOnUnmount={options.unloadDataOnUnmount}
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

    refreshData() {
        this.resetPromise()
        this.lastRenderActions.refresh()
    }

    resetPromise() {
        this.testDataPromise = new PromiseCompletionSource<Data>()
    }

    unmount = async() => {
        this.root.unmount()

        return new Promise((resolve) => setTimeout(resolve))
    }
}