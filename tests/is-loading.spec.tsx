import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { createStore, combineReducers, applyMiddleware, Store } from 'redux'
import { Provider } from 'react-redux'
import { LoadedState, createTypedDataLoader } from '../src/data-loader'
import { ReduxStoreState, reducer } from '../src/data-loader.redux'
import PromiseCompletionSource from './helpers/promise-completion-source'
import ComponentFixture from './helpers/component-fixture'
import IsLoadingFixture, { Verifier } from './helpers/is-loading-fixture'

let store: Store<ReduxStoreState>

beforeEach(() => {
    const logger = store => next => action => {
        // console.log('dispatching', action)
        try {
            let result = next(action)
            // console.log('next state', JSON.stringify(store.getState()))
            return result
        } catch (err) {
            console.error('REDUX ERROR', err)
            throw err
        }
    }

    // TODO Investigate keys of syntax for combineReducers
    store = createStore(
        combineReducers<ReduxStoreState>({ dataLoader: reducer }),
        applyMiddleware(logger)
    )
})

describe('Is loading component', () => {
    it('should be loading if any data loaders are loading', () => {
        const dataLoaderFixture = new ComponentFixture(store, "testKey", false)
        const sut = new IsLoadingFixture(store)

        const verifier = sut.component.find(Verifier)

        expect(verifier.props()).toMatchSnapshot()
        expect(store.getState()).toMatchSnapshot()
    })

    it('should be loading if one of two have finished loading', async () => {
        const dataLoaderFixture = new ComponentFixture(store, "testKey", false)
        const dataLoaderFixture2 = new ComponentFixture(store, "testKey2", false)
        const sut = new IsLoadingFixture(store)
        await dataLoaderFixture.testDataPromise.resolve({
            result: 'Foo!'
        })

        const verifier = sut.component.find(Verifier)

        expect(verifier.props()).toMatchSnapshot()
        expect(store.getState()).toMatchSnapshot()
    })

    it('should not be loading once all data loaders have completed', async () => {
        const dataLoaderFixture = new ComponentFixture(store, "testKey", false)
        const dataLoaderFixture2 = new ComponentFixture(store, "testKey2", false)
        const sut = new IsLoadingFixture(store)
        await dataLoaderFixture.testDataPromise.resolve({
            result: 'Foo!'
        })
        await dataLoaderFixture2.testDataPromise.resolve({
            result: 'Foo2!'
        })

        const verifier = sut.component.find(Verifier)

        expect(verifier.props()).toMatchSnapshot()
        expect(store.getState()).toMatchSnapshot()
    })
})