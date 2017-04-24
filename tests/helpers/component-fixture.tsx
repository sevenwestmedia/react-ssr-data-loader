import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { createStore, combineReducers, Store } from 'redux'
import { Provider } from 'react-redux'
import { Props, LoadedState } from '../../src/data-loader'
import DataProvider from '../../src/data-provider'
import DataLoaderResources from '../../src/data-loader-resources'
import { ReduxStoreState, reducer } from '../../src/data-loader.redux'
import PromiseCompletionSource from './promise-completion-source'
import { Data, dataType } from './test-data'
import Verifier from './verifier'

export default class ComponentFixture {
    loadAllCompletedCalled = 0
    loadDataCount = 0
    renderCount = 0
    testDataPromise: PromiseCompletionSource<Data>
    root: ReactWrapper<{ dataKey: string }, any>
    component: ReactWrapper<Props<Data>, any>
    resources: DataLoaderResources

    constructor(store: Store<ReduxStoreState>, dataKey: string, isServerSideRender: boolean, clientLoadOnly = false) {
        this.testDataPromise = new PromiseCompletionSource<Data>()
        this.resources = new DataLoaderResources()
        const TestDataLoader = this.resources.registerResource(dataType, (dataKey: string) => {
            this.loadDataCount++
            return this.testDataPromise.promise
        })

        const TestComponent: React.SFC<{ dataKey: string }> = ({ dataKey }) => (
            <Provider store={store}>
                <DataProvider
                    isServerSideRender={isServerSideRender}
                    loadData={this.resources}
                    loadAllCompleted={() => this.loadAllCompletedCalled++}
                >
                    <TestDataLoader
                        dataKey={dataKey}
                        clientLoadOnly={clientLoadOnly}
                        renderData={(props) => (
                            <Verifier {...props} renderCount={++this.renderCount} />
                        )}
                    />
                </DataProvider>
            </Provider>
        )

        this.root = mount(<TestComponent dataKey={dataKey} />)

        this.component = this.root.find(TestDataLoader)
    }

    resetPromise() {
        this.testDataPromise = new PromiseCompletionSource<Data>()
    }

    unmount = async() => {
        this.root.unmount()

        return new Promise((resolve) => setTimeout(resolve))
    }
}