import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { Props } from '../../src/data-loader'
import DataProvider from '../../src/data-provider'
import DataLoaderResources, { PageActions, Paging } from '../../src/data-loader-resources'
import { DataLoaderState, LoaderState, LoaderStatus } from '../../src/data-loader-actions'
import PromiseCompletionSource from './promise-completion-source'

interface DataResource {}

export default class ComponentFixture {
    loadAllCompletedCalled = 0
    loadDataCount = 0
    renderCount = 0
    lastRenderProps: LoaderState<DataResource>
    testDataPromise: PromiseCompletionSource<DataResource[]>
    root: ReactWrapper<{ resourceId: string }, any>
    component: ReactWrapper<Props<DataResource, PageActions>, any>
    resources: DataLoaderResources
    currentState: DataLoaderState
    lastRenderActions: PageActions

    constructor(initialState: DataLoaderState, resourceId: string, isServerSideRender: boolean, clientLoadOnly = false) {
        this.currentState = initialState
        this.testDataPromise = new PromiseCompletionSource<DataResource[]>()
        this.resources = new DataLoaderResources()
        const paging: Paging = {
            pageSize: 10,
        }
        const TestDataLoader = this.resources.registerPagedResource<DataResource>(
            'testDataType',
            (resourceId, paging, page) => {
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
        if (this.lastRenderProps.status === LoaderStatus.Idle) {
            this.resetPromise()
            this.lastRenderActions.refresh()
        } else {
            throw new Error('Not in success state, can\'t refresh')
        }
    }

    nextPage() {
        if (this.lastRenderProps.status === LoaderStatus.Idle) {
            this.resetPromise()
            this.lastRenderActions.nextPage()
        } else {
            throw new Error('Not in success state, can\'t refresh')
        }
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
        this.testDataPromise = new PromiseCompletionSource<DataResource>()
    }

    unmount = async() => {
        this.root.unmount()

        return new Promise((resolve) => setTimeout(resolve))
    }
}