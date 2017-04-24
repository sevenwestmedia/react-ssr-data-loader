import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { createStore, combineReducers, Store } from 'redux'
import { Provider } from 'react-redux'
import { Props, LoadedState } from '../../src/data-loader'
import DataProvider from '../../src/data-provider'
import DataLoaderResources, { PageActions } from '../../src/data-loader-resources'
import { ReduxStoreState, reducer } from '../../src/data-loader.redux'
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

    constructor(store: Store<ReduxStoreState>, dataKey: string, isServerSideRender: boolean, clientLoadOnly = false) {
        this.testDataPromise = new PromiseCompletionSource<DataResource[]>()
        this.resources = new DataLoaderResources()
        const TestDataLoader = this.resources.registerPagedResource<DataResource>('testDataType', (dataKey, page) => {
            this.loadDataCount++
            return this.testDataPromise.promise
        })

        const TestComponent: React.SFC<{ dataKey: string }> = ({ dataKey }) => (
            <Provider store={store}>
                <DataProvider
                    isServerSideRender={isServerSideRender}
                    resources={this.resources}
                    loadAllCompleted={() => this.loadAllCompletedCalled++}
                >
                    <TestDataLoader
                        dataKey={dataKey}
                        clientLoadOnly={clientLoadOnly}
                        renderData={(props) => {
                            this.lastRenderProps = props
                            return (
                                <Verifier {...props} renderCount={++this.renderCount} />
                            )}
                        }
                    />
                </DataProvider>
            </Provider>
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

    resetPromise() {
        this.testDataPromise = new PromiseCompletionSource<DataResource>()
    }

    unmount = async() => {
        this.root.unmount()

        return new Promise((resolve) => setTimeout(resolve))
    }
}