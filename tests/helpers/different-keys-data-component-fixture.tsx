import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { createStore, combineReducers, Store } from 'redux'
import { Provider } from 'react-redux'
import { Props, LoadedState, createTypedDataLoader } from '../../src/data-loader'
import DataProvider from '../../src/data-provider'
import { ReduxStoreState, reducer } from '../../src/data-loader.redux'
import PromiseCompletionSource from './promise-completion-source'
import { Data, TestDataLoader, dataType } from './test-data'
import Verifier from './verifier'

export default class ComponentFixture {
    loadAllCompletedCalled = 0
    loadDataCount = 0
    renderCount = 0
    testDataPromise: PromiseCompletionSource<Data>
    testDataPromise2: PromiseCompletionSource<Data>
    root: ReactWrapper<{ dataKey: string }, any>
    component: ReactWrapper<Props<Data>, any>

    constructor(store: Store<ReduxStoreState>, dataKey: string, dataKey2: string, isServerSideRender: boolean, clientLoadOnly = false) {
        this.testDataPromise = new PromiseCompletionSource<Data>()
        this.testDataPromise2 = new PromiseCompletionSource<Data>()
        const TestComponent: React.SFC<{ dataKey: string }> = ({ dataKey }) => (
            <Provider store={store}>
                <DataProvider
                    isServerSideRender={isServerSideRender}
                    loadData={{
                        [dataType]: (key: string) => {
                            this.loadDataCount++
                            if (key === dataKey) {
                                return this.testDataPromise.promise
                            } else if (key === dataKey2) {
                                return this.testDataPromise2.promise
                            }

                            return Promise.reject('Key doesn\'t match?')
                        },
                    }}
                    loadAllCompleted={() => this.loadAllCompletedCalled++}
                >
                    <div>
                        <TestDataLoader
                            dataKey={dataKey}
                            clientLoadOnly={clientLoadOnly}
                            renderData={(props) => (
                                <Verifier {...props} renderCount={++this.renderCount} />
                            )}
                        />
                        <TestDataLoader
                            dataKey={dataKey2}
                            clientLoadOnly={clientLoadOnly}
                            renderData={(props) => (
                                <Verifier {...props} renderCount={++this.renderCount} />
                            )}
                        />
                    </div>
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