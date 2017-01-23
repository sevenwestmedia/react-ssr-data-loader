import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { createStore, combineReducers, Store } from 'redux'
import { Provider } from 'react-redux'
import { OwnProps, LoadedState, createTypedDataLoader } from '../src/data-loader'
import { ReduxStoreState, reducer } from '../src/data-loader.redux'
import PromiseCompletionSource from './helpers/promise-completion-source'

interface Data {
    result: string
}

const TestDataLoader = createTypedDataLoader<Data>()

const Verifier: React.SFC<LoadedState<Data> & {
    renderCount: number
}> = (loadedState) => (<noscript />)

let store: Store<ReduxStoreState>

beforeEach(() => {
    // TODO Investigate keys of syntax for combineReducers
    store = createStore(combineReducers<ReduxStoreState>({ dataLoader: reducer }))
})

let loadDataCount: number
let testDataPromise: PromiseCompletionSource<Data>

const mountComponent = (isServerSideRender: boolean, resetCounters = true) => {
    testDataPromise = new PromiseCompletionSource<Data>()
    let renderCount = 0
    if (resetCounters) {
        loadDataCount = 0
    }
    const testComponent = (
        <Provider store={store}>
            <TestDataLoader
                dataType="testDataType"
                dataKey="testKey"
                isServerSideRender={isServerSideRender}
                loadData={() => {
                    loadDataCount++
                    return testDataPromise.promise
                }}
                renderData={(props) => (
                    <Verifier {...props} renderCount={++renderCount} />
                )}
            />
        </Provider>
    )

    return mount(testComponent).find(TestDataLoader)
}

describe('server side render', () => {
    it('should start loading data if not loaded', () => {
        const sut = mountComponent(true)

        const verifier = sut.find(Verifier)

        expect(verifier.props()).toMatchSnapshot()
        expect(store.getState()).toMatchSnapshot()
        expect(loadDataCount).toBe(1)
    })

    it('should pass loaded data once promise resolves', async() => {
        const sut = mountComponent(true)

        const verifier = sut.find(Verifier)

        await testDataPromise.resolve({
            result: 'Success!'
        })

        expect(verifier.props()).toMatchSnapshot()
        expect(store.getState()).toMatchSnapshot()
        expect(loadDataCount).toBe(1)
    })

    it('should pass failure when data load fails', async() => {
        const sut = mountComponent(true)

        const verifier = sut.find(Verifier)

        await testDataPromise.reject(new Error('Boom!'))

        expect(verifier.props()).toMatchSnapshot()
        expect(store.getState()).toMatchSnapshot()
        expect(loadDataCount).toBe(1)
    })

    it('second SSR when data loaded should not reload data', async() => {
        let sut = mountComponent(true)
        const verifier = sut.find(Verifier)
        await testDataPromise.resolve({ result: 'Success!' })

        sut = mountComponent(true, false)

        expect(loadDataCount).toBe(1)
    })

    it('second SSR when data load failed should not reload data', async() => {
        let sut = mountComponent(true)
        const verifier = sut.find(Verifier)
        await testDataPromise.reject(new Error('Boom'))

        sut = mountComponent(true, false)

        expect(loadDataCount).toBe(1)
    })
})
