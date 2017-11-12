import * as React from 'react'
import { mount, ReactWrapper } from 'enzyme'
import { Props } from '../../src/data-loader'
import DataProvider from '../../src/data-provider'
import DataLoaderResources, {
    PageActions,
    PagedData,
    PageComponentProps
} from '../../src/data-loader-resources'
import { DataLoaderState, LoaderState } from '../../src/data-loader-actions'
import PromiseCompletionSource from './promise-completion-source'

export type DataResource = {}

export default class ComponentFixture {
    loadAllCompletedCalled = 0
    loadDataCount = 0
    renderCount = 0
    lastRenderProps: LoaderState<DataResource>
    testDataPromise: PromiseCompletionSource<DataResource[]>
    root: ReactWrapper<{ resourceId: string }, any>
    component: ReactWrapper<Props<PagedData<DataResource>, PageActions> & PageComponentProps, any>
    resources: DataLoaderResources<any>
    currentState: DataLoaderState | undefined
    lastRenderActions: PageActions

    constructor(
        initialState: DataLoaderState | undefined,
        resourceId: string,
        isServerSideRender: boolean,
        clientLoadOnly = false
    ) {
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

        const TestComponent: React.SFC<{ resourceId: string }> = testComponentProps => (
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
                        // tslint:disable-next-line:no-console
                        console.info(event.data.error)
                    }
                }}
            >
                <TestDataLoader
                    resourceId={testComponentProps.resourceId}
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

    unmount = async () => {
        this.root.unmount()

        return new Promise(resolve => setTimeout(resolve))
    }
}
