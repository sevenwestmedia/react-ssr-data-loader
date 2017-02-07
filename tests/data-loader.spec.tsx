import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { createStore, combineReducers, applyMiddleware, Store } from 'redux'
import { Provider } from 'react-redux'
import { OwnProps, LoadedState, createTypedDataLoader } from '../src/data-loader'
import { ReduxStoreState, reducer } from '../src/data-loader.redux'
import PromiseCompletionSource from './helpers/promise-completion-source'
import ComponentFixture from './helpers/component-fixture'
import Verifier from './helpers/verifier'

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

describe('data-loader', () => {
    it('supports multiple loaders using the same key when data loading', async () => {
        const sut = new ComponentFixture(store, "testKey", false)
        const sut2 = new ComponentFixture(store, "testKey", false)
        await sut.unmount()

        const verifier = sut2.component.find(Verifier)

        expect(verifier.props()).toMatchSnapshot()
        expect(store.getState()).toMatchSnapshot()
    })

    it('supports multiple loaders using the same key when data already loaded', async () => {
        const sut = new ComponentFixture(store, "testKey", false)
        await sut.testDataPromise.resolve({ result: 'Test' })
        const sut2 = new ComponentFixture(store, "testKey", false)
        await sut.unmount()

        const verifier = sut2.component.find(Verifier)

        expect(verifier.props()).toMatchSnapshot()
        expect(store.getState()).toMatchSnapshot()
    })

    it('ignores completion if unmounted first', async () => {
        const sut = new ComponentFixture(store, "testKey", false)
        await sut.unmount()
        await sut.testDataPromise.resolve({ result: 'Test' })

        expect(store.getState()).toMatchSnapshot()
    })
})
