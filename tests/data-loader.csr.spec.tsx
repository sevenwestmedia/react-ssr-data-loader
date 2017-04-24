import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { createStore, combineReducers, applyMiddleware, Store } from 'redux'
import { Provider } from 'react-redux'
import { LoadedState, createTypedDataLoader } from '../src/data-loader'
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

describe('Client side render', () => {
    it('should start loading data if not loaded', () => {
        const sut = new ComponentFixture(store, "testKey", { isServerSideRender: false })

        const verifier = sut.component.find(Verifier)

        expect(verifier.props()).toMatchSnapshot()
        expect(store.getState()).toMatchSnapshot()
        expect(sut.loadDataCount).toBe(1)
    })

    it('should pass loaded data once promise resolves', async() => {
        const sut = new ComponentFixture(store, "testKey", { isServerSideRender: false })

        const verifier = sut.component.find(Verifier)

        await sut.testDataPromise.resolve({
            result: 'Success!'
        })

        expect(verifier.props()).toMatchSnapshot()
        expect(store.getState()).toMatchSnapshot()
        expect(sut.loadDataCount).toBe(1)
    })

    it('loads data when props change', async () => {
        const sut = new ComponentFixture(store, "testKey", { isServerSideRender: false })

        const verifier = sut.component.find(Verifier)
        await sut.testDataPromise.resolve({ result: 'Success!' })
        sut.resetPromise()
        sut.root.setProps({ dataKey: "newData" })
        await sut.testDataPromise.resolve({ result: 'Success2!' })

        expect(verifier.props()).toMatchSnapshot()
        expect(store.getState()).toMatchSnapshot()
        expect(sut.loadDataCount).toBe(2)
    })

    it('should pass failure when data load fails', async() => {
        const sut = new ComponentFixture(store, "testKey", { isServerSideRender: false })

        const verifier = sut.component.find(Verifier)

        await sut.testDataPromise.reject(new Error('Boom!'))

        expect(verifier.props()).toMatchSnapshot()
        expect(store.getState()).toMatchSnapshot()
        expect(sut.loadDataCount).toBe(1)
    })

    it('client render after SSR with data should not fetch data', async() => {
        let sut = new ComponentFixture(store, "testKey", { isServerSideRender: true })
        const verifier = sut.component.find(Verifier)
        await sut.testDataPromise.resolve({ result: 'Success!' })

        sut = new ComponentFixture(store, "testKey", { isServerSideRender: false })

        expect(sut.loadDataCount).toBe(0)
        expect(verifier.props()).toMatchSnapshot()
        expect(store.getState()).toMatchSnapshot()
    })

    it('should remove data from redux when unmounted', async() => {
        let sut = new ComponentFixture(store, "testKey", { isServerSideRender: false })
        await sut.testDataPromise.resolve({ result: 'Success!' })

        await sut.unmount()

        expect(store.getState()).toMatchSnapshot()
    })

    it('should ignore completion once component is unmounted', async() => {
        let sut = new ComponentFixture(store, "testKey", { isServerSideRender: false })

        await sut.unmount()
        await sut.testDataPromise.resolve({ result: 'Success!' })

        expect(store.getState()).toMatchSnapshot()
    })
})