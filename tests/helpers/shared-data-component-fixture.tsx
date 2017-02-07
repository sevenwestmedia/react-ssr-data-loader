import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { createStore, combineReducers, Store } from 'redux'
import { Provider } from 'react-redux'
import { OwnProps, LoadedState, createTypedDataLoader } from '../../src/data-loader'
import { ReduxStoreState, reducer } from '../../src/data-loader.redux'
import PromiseCompletionSource from './promise-completion-source'
import { Data, TestDataLoader } from './test-data'
import Verifier from './verifier'

export default class ComponentFixture {
    loadDataCount = 0
    renderCount = 0
    testDataPromise: PromiseCompletionSource<Data>
    testDataPromise2: PromiseCompletionSource<Data>
    root: ReactWrapper<{ dataKey: string }, any>
    component: ReactWrapper<OwnProps<Data>, any>

    constructor(store: Store<ReduxStoreState>, dataKey: string, isServerSideRender: boolean, clientLoadOnly = false) {
        this.testDataPromise = new PromiseCompletionSource<Data>()
        this.testDataPromise2 = new PromiseCompletionSource<Data>()
        const TestComponent: React.SFC<{ dataKey: string }> = ({ dataKey }) => (
            <Provider store={store}>
                <div>
                    <TestDataLoader
                        dataType="testDataType"
                        dataKey={dataKey}
                        isServerSideRender={isServerSideRender}
                        clientLoadOnly={clientLoadOnly}
                        loadData={() => {
                            this.loadDataCount++
                            return this.testDataPromise.promise
                        }}
                        renderData={(props) => (
                            <Verifier {...props} renderCount={++this.renderCount} />
                        )}
                    />
                    <TestDataLoader
                        dataType="testDataType"
                        dataKey={dataKey}
                        isServerSideRender={isServerSideRender}
                        clientLoadOnly={clientLoadOnly}
                        loadData={() => {
                            this.loadDataCount++
                            return this.testDataPromise2.promise
                        }}
                        renderData={(props) => (
                            <Verifier {...props} renderCount={++this.renderCount} />
                        )}
                    />
                </div>
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