import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { LoadedState, createTypedDataLoader } from '../src/data-loader'
import { reducer } from '../src/data-loader-actions'
import PromiseCompletionSource from './helpers/promise-completion-source'
import ComponentFixture from './helpers/component-fixture'
import Verifier from './helpers/verifier'

describe('Client side render', () => {
    it('should start loading data if not loaded', () => {
        const sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: false })

        const verifier = sut.component.find(Verifier)

        expect(verifier.props()).toMatchSnapshot()
        expect(sut.currentState).toMatchSnapshot()
        expect(sut.loadDataCount).toBe(1)
    })

    it('should pass loaded data once promise resolves', async() => {
        const sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: false })

        const verifier = sut.component.find(Verifier)

        await sut.testDataPromise.resolve({
            result: 'Success!'
        })

        expect(verifier.props()).toMatchSnapshot()
        expect(sut.currentState).toMatchSnapshot()
        expect(sut.loadDataCount).toBe(1)
    })

    it('loads data when props change', async () => {
        const sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: false })

        const verifier = sut.component.find(Verifier)
        await sut.testDataPromise.resolve({ result: 'Success!' })
        sut.resetPromise()
        sut.root.setProps({ dataKey: "newData" })
        await sut.testDataPromise.resolve({ result: 'Success2!' })

        expect(verifier.props()).toMatchSnapshot()
        expect(sut.currentState).toMatchSnapshot()
        expect(sut.loadDataCount).toBe(2)
    })

    it('should pass failure when data load fails', async() => {
        const sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: false })

        const verifier = sut.component.find(Verifier)

        await sut.testDataPromise.reject(new Error('Boom!'))

        expect(verifier.props()).toMatchSnapshot()
        expect(sut.currentState).toMatchSnapshot()
        expect(sut.loadDataCount).toBe(1)
    })

    it('client render after SSR with data should not fetch data', async() => {
        let sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: true })
        const verifier = sut.component.find(Verifier)
        await sut.testDataPromise.resolve({ result: 'Success!' })

        sut = new ComponentFixture(sut.currentState, "testKey", { isServerSideRender: false })

        expect(sut.loadDataCount).toBe(0)
        expect(verifier.props()).toMatchSnapshot()
        expect(sut.currentState).toMatchSnapshot()
    })

    it('should remove data from redux when unmounted', async() => {
        let sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: false })
        await sut.testDataPromise.resolve({ result: 'Success!' })

        await sut.unmount()

        expect(sut.currentState).toMatchSnapshot()
    })

    it('should ignore completion once component is unmounted', async() => {
        let sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: false })

        await sut.unmount()
        await sut.testDataPromise.resolve({ result: 'Success!' })

        expect(sut.currentState).toMatchSnapshot()
    })
})