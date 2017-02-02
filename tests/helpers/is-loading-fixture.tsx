import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { createStore, combineReducers, Store } from 'redux'
import { Provider } from 'react-redux'
import { LoadedState, default as IsLoading } from '../../src/is-loading'
import { ReduxStoreState, reducer } from '../../src/data-loader.redux'
import PromiseCompletionSource from './promise-completion-source'

export interface Data {
    result: string
}

export const Verifier: React.SFC<LoadedState & {
    renderCount: number
}> = (loadedState) => (<noscript />)

export default class ComponentFixture {
    renderCount = 0
    testDataPromise: PromiseCompletionSource<Data>
    root: ReactWrapper<any, any>
    component: ReactWrapper<any, any>

    constructor(store: Store<ReduxStoreState>) {
        this.testDataPromise = new PromiseCompletionSource<Data>()
        const TestComponent: React.SFC<any> = ({ }) => (
            <Provider store={store}>
                <IsLoading
                    renderData={(props) => (
                        <Verifier {...props} renderCount={++this.renderCount} />
                    )}
                />
            </Provider>
        )

        this.root = mount(<TestComponent />)

        this.component = this.root.find(IsLoading)
    }

    resetPromise() {
        this.testDataPromise = new PromiseCompletionSource<Data>()
    }

    unmount = async() => {
        this.root.unmount()

        return new Promise((resolve) => setTimeout(resolve))
    }
}