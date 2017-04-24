import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { LoadedState, createTypedDataLoader } from '../src/data-loader'
import PromiseCompletionSource from './helpers/promise-completion-source'
import ComponentFixture from './helpers/component-fixture'
import SharedDataComponentFixture from './helpers/shared-data-component-fixture'
import Verifier from './helpers/verifier'

describe('server side render', () => {
    it('should start loading data if not loaded', () => {
        const sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: true })

        const verifier = sut.component.find(Verifier)

        expect(verifier.props()).toMatchSnapshot()
        expect(sut.currentState).toMatchSnapshot()
        expect(sut.loadDataCount).toBe(1)
    })

    it('multiple data loaders with same key should not load data multiple times', () => {
        const sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: true })
        const sut2 = new ComponentFixture(undefined, "testKey", { isServerSideRender: true })

        const verifier = sut.component.find(Verifier)

        expect(verifier.props()).toMatchSnapshot()
        expect(sut.currentState).toMatchSnapshot()
        expect(sut.loadDataCount).toBe(1)
    })

    it('should pass loaded data once promise resolves', async() => {
        const sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: true })

        const verifier = sut.component.find(Verifier)

        await sut.testDataPromise.resolve({
            result: 'Success!'
        })

        expect(verifier.props()).toMatchSnapshot()
        expect(sut.currentState).toMatchSnapshot()
        expect(sut.loadDataCount).toBe(1)
    })

    it('should pass failure when data load fails', async() => {
        const sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: true })

        const verifier = sut.component.find(Verifier)

        await sut.testDataPromise.reject(new Error('Boom!'))

        expect(verifier.props()).toMatchSnapshot()
        expect(sut.currentState).toMatchSnapshot()
        expect(sut.loadDataCount).toBe(1)
    })

    it('second SSR when data loaded should not reload data', async() => {
        let sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: true })
        const verifier = sut.component.find(Verifier)
        await sut.testDataPromise.resolve({ result: 'Success!' })

        sut = new ComponentFixture(sut.currentState, "testKey", { isServerSideRender: true })

        expect(sut.loadDataCount).toBe(0)
    })

    it('second SSR when data load failed should not reload data', async() => {
        let sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: true })
        const verifier = sut.component.find(Verifier)
        await sut.testDataPromise.reject(new Error('Boom'))

        sut = new ComponentFixture(sut.currentState, "testKey", { isServerSideRender: true })

        expect(sut.loadDataCount).toBe(0)
    })

    it('does not render on the server if clientLoadOnlySet', async () => {
        let sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: true, clientLoadOnly: true })

        expect(sut.component.find(Verifier).exists()).toBe(false)
        expect(sut.loadDataCount).toBe(0)
        expect(sut.currentState).toMatchSnapshot()
    })

    it('can have two components in the same render tree', async () => {
        let sut = new SharedDataComponentFixture(undefined, "testKey", true)

        const verifier = sut.component.find(Verifier)

        expect(verifier.at(0).props()).toMatchSnapshot()
        expect(verifier.at(1).props()).toMatchSnapshot()
        expect(sut.currentState).toMatchSnapshot()
        expect(sut.loadDataCount).toBe(1)
    })

    it('second SSR with two components in same tree uses data', async () => {
        let sut = new SharedDataComponentFixture(undefined, "testKey", true)
        await sut.testDataPromise.resolve({ result: 'Success!' })
        let sut2 = new SharedDataComponentFixture(undefined, "testKey", true)

        const verifier = sut2.component.find(Verifier)

        expect(verifier.at(0).props()).toMatchSnapshot()
        expect(verifier.at(1).props()).toMatchSnapshot()
        expect(sut.currentState).toMatchSnapshot()
        expect(sut.loadDataCount).toBe(1)
    })
})
