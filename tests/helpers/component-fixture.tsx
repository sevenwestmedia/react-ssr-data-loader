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
    component: ReactWrapper<Props<Data, any>, any>
    resources: DataLoaderResources<any>
    currentState: DataLoaderState | undefined
    lastRenderProps: LoaderState<Data>
    lastRenderActions: RefreshAction
    lastExistingData: Data

    constructor(
        initialState: DataLoaderState | undefined,
        initialResourceId: string,
        options: FixtureOptions
    ) {
        this.currentState = initialState
        this.testDataPromise = new PromiseCompletionSource<Data>()
        this.resources = new DataLoaderResources()
        const TestDataLoader = this.resources.registerResource(
            resourceType,
            (_, __, existingData: Data) => {
                this.lastExistingData = existingData
                this.loadDataCount++
                return this.testDataPromise.promise
            }
        )

        const TestComponent: React.SFC<{ resourceId: string }> = ({ resourceId }) => (
            <DataProvider
                initialState={initialState}
                isServerSideRender={options.isServerSideRender}
                resources={this.resources}
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

        this.root = mount(<TestComponent resourceId={initialResourceId} />)

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

    unmount = async () => {
        this.root.unmount()

        return new Promise(resolve => setTimeout(resolve))
    }
}
