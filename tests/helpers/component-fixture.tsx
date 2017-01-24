import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { createStore, combineReducers, Store } from 'redux'
import { Provider } from 'react-redux'
import { OwnProps, LoadedState, createTypedDataLoader } from '../../src/data-loader'
import { ReduxStoreState, reducer } from '../../src/data-loader.redux'
import PromiseCompletionSource from './promise-completion-source'

export interface Data {
    result: string
}

export const TestDataLoader = createTypedDataLoader<Data>()

export const Verifier: React.SFC<LoadedState<Data> & {
    renderCount: number
}> = (loadedState) => (<noscript />)

export default class ComponentFixture {
    loadDataCount = 0
    renderCount = 0
    testDataPromise: PromiseCompletionSource<Data>
    root: ReactWrapper<any, any>
    component: ReactWrapper<OwnProps<Data>, any>

    constructor(store: Store<ReduxStoreState>, isServerSideRender: boolean) {
        this.testDataPromise = new PromiseCompletionSource<Data>()
        const testComponent = (
            <Provider store={store}>
                <TestDataLoader
                    dataType="testDataType"
                    dataKey="testKey"
                    isServerSideRender={isServerSideRender}
                    loadData={() => {
                        this.loadDataCount++
                        return this.testDataPromise.promise
                    }}
                    renderData={(props) => (
                        <Verifier {...props} renderCount={++this.renderCount} />
                    )}
                />
            </Provider>
        )

        this.root = mount(testComponent)

        this.component = this.root.find(TestDataLoader)
    }

    unmount = async() => {
        this.root.unmount()

        return new Promise((resolve) => setTimeout(resolve))
    }
}