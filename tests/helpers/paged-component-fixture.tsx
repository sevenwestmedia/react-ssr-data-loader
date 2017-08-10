import * as React from 'react'
import { mount, ReactWrapper } from 'enzyme'
import { Props } from '../../src/data-loader'
import DataProvider from '../../src/data-provider'
import DataLoaderResources, { PageActions } from '../../src/data-loader-resources'
import { DataLoaderState, LoaderState } from '../../src/data-loader-actions'
import PromiseCompletionSource from './promise-completion-source'

export interface DataResource {}

export default class ComponentFixture {
    loadAllCompletedCalled = 0
    loadDataCount = 0
    renderCount = 0
    lastRenderProps: LoaderState<DataResource>
    testDataPromise: PromiseCompletionSource<DataResource[]>
    root: ReactWrapper<{ resourceId: string }, any>
    component: ReactWrapper<Props<DataResource, PageActions>, any>
    resources: DataLoaderResources<any>
    currentState: DataLoaderState | undefined
    lastRenderActions: PageActions

    constructor(initialState: DataLoaderState | undefined, resourceId: string, isServerSideRender: boolean, clientLoadOnly = false) {
        this.currentState = initialState
        this.testDataPromise = new PromiseCompletionSource<DataResource[]>()
        this.resources = new DataLoaderResources()
        const TestDataLoader = this.resources.registerPagedResource<DataResource>(
            'testDataType',
            () => {
                this.loadDataCount++
                return this.testDataPromise.promise
            }
        )

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
                    resourceId={resourceId}
                    paging={{ pageSize: 10 }}
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

    refreshData() {
        this.resetPromise()
        this.lastRenderActions.refresh()
    }

    nextPage() {
        this.resetPromise()
        this.lastRenderActions.nextPage()
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
        this.testDataPromise = new PromiseCompletionSource<DataResource[]>()
    }

    unmount = async() => {
        this.root.unmount()

        return new Promise((resolve) => setTimeout(resolve))
    }
}