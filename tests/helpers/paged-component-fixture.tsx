import React from 'react'
import { Props, UserActions } from '../../src/data-loader'
import { DataLoaderProvider } from '../../src/data-provider'
import {
    DataLoaderResources,
    PagedData,
    PageComponentProps,
    PageState,
} from '../../src/data-loader-resources'
import { LoaderState } from '../../src/data-loader-state'

// tslint:disable-next-line:no-implicit-dependencies
import { mount, ReactWrapper } from 'enzyme'
import { PromiseCompletionSource } from 'promise-completion-source'
import { DataLoaderState } from '../../src/data-loader-store-and-loader'

// tslint:disable-next-line:no-empty-interface
export interface DataResource {}

export class PagedComponentFixture {
    loadAllCompletedCalled = 0
    loadDataCount = 0
    renderCount = 0
    lastRenderProps!: LoaderState<DataResource>
    testDataPromise: PromiseCompletionSource<DataResource[]>
    root: ReactWrapper<{ id: string }, any>
    component: ReactWrapper<
        Props<PagedData<DataResource>, any, PageComponentProps & { id: string } & PageState> &
            PageComponentProps & { id: string },
        any
    >
    resources: DataLoaderResources<any>
    currentState: DataLoaderState | undefined
    lastRenderActions!: UserActions<'nextPage' | 'refresh'>
    lastRenderParams?: any

    constructor(
        initialState: DataLoaderState | undefined,
        id: string,
        isServerSideRender: boolean,
        clientLoadOnly = false,
    ) {
        this.currentState = initialState
        this.testDataPromise = new PromiseCompletionSource<DataResource[]>()
        this.resources = new DataLoaderResources()
        const TestDataLoader = this.resources.registerPagedResource<DataResource, { id: string }>(
            'testDataType',
            () => {
                this.loadDataCount++
                return this.testDataPromise.promise
            },
        )

        const TestComponent: React.SFC<{ id: string }> = testComponentProps => (
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
                <TestDataLoader
                    id={testComponentProps.id}
                    paging={{ pageSize: 10 }}
                    clientLoadOnly={clientLoadOnly}
                    // tslint:disable-next-line:jsx-no-lambda
                    renderData={(props, actions, params) => {
                        this.renderCount++
                        this.lastRenderProps = props
                        this.lastRenderActions = actions
                        this.lastRenderParams = params
                        return null
                    }}
                />
            </DataLoaderProvider>
        )

        this.root = mount(<TestComponent id={id} />)

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
            renderParams: this.lastRenderParams,
            loadDataCount: this.loadDataCount,
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
