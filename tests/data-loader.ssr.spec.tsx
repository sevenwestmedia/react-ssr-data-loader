import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { createStore, combineReducers, applyMiddleware, Store } from 'redux'
import { Provider } from 'react-redux'
import { LoadedState, createTypedDataLoader } from '../src/data-loader'
import { ReduxStoreState, reducer } from '../src/data-loader.redux'
import PromiseCompletionSource from './helpers/promise-completion-source'
import ComponentFixture from './helpers/component-fixture'
import SharedDataComponentFixture from './helpers/shared-data-component-fixture'
import Verifier from './helpers/verifier'

let store: Store<ReduxStoreState>

beforeEach(() => {
    const logger = store => next => action => {
        // console.log('dispatching', action)
        try {
            let result = next(action)
            // console.log('next state', store.getState())
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

describe('server side render', () => {
    it('should start loading data if not loaded', () => {
        const sut = new ComponentFixture(store, "testKey", { isServerSideRender: true })

        const verifier = sut.component.find(Verifier)

        expect(verifier.props()).toMatchSnapshot()
        expect(store.getState()).toMatchSnapshot()
        expect(sut.loadDataCount).toBe(1)
    })

    it('multiple data loaders with same key should not load data multiple times', () => {
        const sut = new ComponentFixture(store, "testKey", { isServerSideRender: true })
        const sut2 = new ComponentFixture(store, "testKey", { isServerSideRender: true })

        const verifier = sut.component.find(Verifier)

        expect(verifier.props()).toMatchSnapshot()
        expect(store.getState()).toMatchSnapshot()
        expect(sut.loadDataCount).toBe(1)
    })

    it('should pass loaded data once promise resolves', async() => {
        const sut = new ComponentFixture(store, "testKey", { isServerSideRender: true })

        const verifier = sut.component.find(Verifier)

        await sut.testDataPromise.resolve({
            result: 'Success!'
        })

        expect(verifier.props()).toMatchSnapshot()
        expect(store.getState()).toMatchSnapshot()
        expect(sut.loadDataCount).toBe(1)
    })

    it('should pass failure when data load fails', async() => {
        const sut = new ComponentFixture(store, "testKey", { isServerSideRender: true })

        const verifier = sut.component.find(Verifier)

        await sut.testDataPromise.reject(new Error('Boom!'))

        expect(verifier.props()).toMatchSnapshot()
        expect(store.getState()).toMatchSnapshot()
        expect(sut.loadDataCount).toBe(1)
    })

    it('second SSR when data loaded should not reload data', async() => {
        let sut = new ComponentFixture(store, "testKey", { isServerSideRender: true })
        const verifier = sut.component.find(Verifier)
        await sut.testDataPromise.resolve({ result: 'Success!' })

        sut = new ComponentFixture(store, "testKey", { isServerSideRender: true })

        expect(sut.loadDataCount).toBe(0)
    })

    it('second SSR when data load failed should not reload data', async() => {
        let sut = new ComponentFixture(store, "testKey", { isServerSideRender: true })
        const verifier = sut.component.find(Verifier)
        await sut.testDataPromise.reject(new Error('Boom'))

        sut = new ComponentFixture(store, "testKey", { isServerSideRender: true })

        expect(sut.loadDataCount).toBe(0)
    })

    it('does not render on the server if clientLoadOnlySet', async () => {
        let sut = new ComponentFixture(store, "testKey", { isServerSideRender: true, clientLoadOnly: true })

        expect(sut.component.find(Verifier).exists()).toBe(false)
        expect(sut.loadDataCount).toBe(0)
        expect(store.getState()).toMatchSnapshot()
    })

    it('can have two components in the same render tree', async () => {
        let sut = new SharedDataComponentFixture(store, "testKey", true)

        const verifier = sut.component.find(Verifier)

        expect(verifier.at(0).props()).toMatchSnapshot()
        expect(verifier.at(1).props()).toMatchSnapshot()
        expect(store.getState()).toMatchSnapshot()
        expect(sut.loadDataCount).toBe(1)
    })

    it('second SSR with two components in same tree uses data', async () => {
        let sut = new SharedDataComponentFixture(store, "testKey", true)
        await sut.testDataPromise.resolve({ result: 'Success!' })
        let sut2 = new SharedDataComponentFixture(store, "testKey", true)

        const verifier = sut2.component.find(Verifier)

        expect(verifier.at(0).props()).toMatchSnapshot()
        expect(verifier.at(1).props()).toMatchSnapshot()
        expect(store.getState()).toMatchSnapshot()
        expect(sut.loadDataCount).toBe(1)
    })
})
