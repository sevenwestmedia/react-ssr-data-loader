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

const Verifier: React.SFC<LoadedState<Data>> = (loadedState) => (<noscript />)

let store: Store<ReduxStoreState>

beforeEach(() => {
    // TODO Investigate keys of syntax for combineReducers
    store = createStore(combineReducers<ReduxStoreState>({ dataLoader: reducer }))
})

describe('server side render', () => {
    let sut: ReactWrapper<OwnProps<Data>, any>
    let testDataPromise: PromiseCompletionSource<Data>
    
    beforeEach(() => {
        testDataPromise = new PromiseCompletionSource<Data>()

        const testComponent = (
            <Provider store={store}>
                <TestDataLoader
                    dataType="testDataType"
                    dataKey="testKey"
                    isServerSideRender={true}
                    loadData={() => testDataPromise.promise}
                    renderData={(props) => (
                        <Verifier {...props} />
                    )}
                />
            </Provider>
        )
        sut = mount(testComponent).find(TestDataLoader)
    })

    it('should start load data if not loaded', () => {
        const verifier = sut.find(Verifier)

        expect(verifier.props()).toMatchSnapshot()
    })

    it('should pass loaded data once promise resolves', async() => {
        const verifier = sut.find(Verifier)

        await testDataPromise.resolve({
            result: 'Success!'
        })

        expect(verifier.props()).toMatchSnapshot()
    })
})
