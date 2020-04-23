import React from 'react'
import { mount, ReactWrapper } from 'enzyme'
import { PromiseCompletionSource } from 'promise-completion-source'

import { UserActions } from '../../src/data-loader'
import { DataProvider } from '../../src/data-provider'
import { DataLoaderResources } from '../../src/data-loader-resources'
import { LoaderState } from '../../src/data-loader-state'

import { DataLoaderState } from '../../src/data-loader-store-and-loader'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataResource {}

export class PagedComponentFixture {
    loadAllCompletedCalled = 0
    loadDataCount = 0
    renderCount = 0
    lastRenderProps!: LoaderState<DataResource>
    testDataPromise: PromiseCompletionSource<DataResource[]>
    root: ReactWrapper<{ id: string }, any>
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
        const usePagedDataLoader = this.resources.registerPagedResource<
            DataResource,
            { id: string }
        >('testDataType', () => {
            this.loadDataCount++
            return this.testDataPromise.promise
        })

        const TestComponent: React.SFC<{ id: string }> = (testComponentProps) => {
            const { actions, params, ...props } = usePagedDataLoader(
                { id: testComponentProps.id, paging: { pageSize: 10 } },
                { clientLoadOnly },
            )

            this.renderCount++
            this.lastRenderProps = props
            this.lastRenderActions = actions
            this.lastRenderParams = params
            return null
        }

        this.root = mount(
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
                <TestComponent id={id} />
            </DataProvider>,
        )
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

        return new Promise((resolve) => setTimeout(resolve))
    }
}
