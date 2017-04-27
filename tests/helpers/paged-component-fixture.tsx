import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { Props, LoadedState } from '../../src/data-loader'
import DataProvider from '../../src/data-provider'
import DataLoaderResources, { PageActions, Paging } from '../../src/data-loader-resources'
import { DataLoaderState } from '../../src/data-loader-actions'
import PromiseCompletionSource from './promise-completion-source'
import Verifier from './verifier'

interface DataResource {}

export default class ComponentFixture {
    loadAllCompletedCalled = 0
    loadDataCount = 0
    renderCount = 0
    lastRenderProps: LoadedState<DataResource, PageActions>
    testDataPromise: PromiseCompletionSource<DataResource[]>
    root: ReactWrapper<{ dataKey: string }, any>
    component: ReactWrapper<Props<DataResource, PageActions>, any>
    resources: DataLoaderResources
    currentState: DataLoaderState

    constructor(initialState: DataLoaderState, dataKey: string, isServerSideRender: boolean, clientLoadOnly = false) {
        this.currentState = initialState
        this.testDataPromise = new PromiseCompletionSource<DataResource[]>()
        this.resources = new DataLoaderResources()
        const paging: Paging = {
            pageSize: 10,
        }
        const TestDataLoader = this.resources.registerPagedResource<DataResource>(
            'testDataType',
            (dataKey, paging, page) => {
                this.loadDataCount++
                return this.testDataPromise.promise
            }
        )

        const TestComponent: React.SFC<{ dataKey: string }> = ({ dataKey }) => (
            <DataProvider
                initialState={initialState}
                isServerSideRender={isServerSideRender}
                resources={this.resources}
                loadAllCompleted={() => this.loadAllCompletedCalled++}
                stateChanged={state => this.currentState = state}
                onError={err => console.error(err)}
            >
                <TestDataLoader
                    dataKey={dataKey}
                    paging={{ pageSize: 10 }}
                    clientLoadOnly={clientLoadOnly}
                    renderData={(props) => {
                        this.lastRenderProps = props
                        return (
                            <Verifier {...props} renderCount={++this.renderCount} />
                        )}
                    }
                />
            </DataProvider>
        )

        this.root = mount(<TestComponent dataKey={dataKey} />)

        this.component = this.root.find(TestDataLoader)
    }

    refreshData() {
        if (this.lastRenderProps.isLoaded) {
            this.resetPromise()
            this.lastRenderProps.actions.refresh()
        } else {
            throw new Error('Not in success state, can\'t refresh')
        }
    }

    nextPage() {
        if (this.lastRenderProps.isLoaded) {
            this.resetPromise()
            this.lastRenderProps.actions.nextPage()
        } else {
            throw new Error('Not in success state, can\'t refresh')
        }
    }

    assertState() {
        expect({
            renderCount: this.renderCount,
            loadAllCompletedCalled: this.loadAllCompletedCalled,
            renderProps: this.lastRenderProps,
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