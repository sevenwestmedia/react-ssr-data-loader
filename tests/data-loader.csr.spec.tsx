import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { createTypedDataLoader } from '../src/data-loader'
import { reducer } from '../src/data-loader-actions'
import PromiseCompletionSource from './helpers/promise-completion-source'
import ComponentFixture from './helpers/component-fixture'

describe('Client side render', () => {
    it('should start loading data if not loaded', () => {
        const sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: false })

        sut.assertState()
    })

    it('should pass loaded data once promise resolves', async() => {
        const sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: false })

        await sut.testDataPromise.resolve({
            result: 'Success!'
        })

        sut.assertState()
    })

    it('loads data when props change', async () => {
        const sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: false })

        await sut.testDataPromise.resolve({ result: 'Success!' })
        sut.resetPromise()
        sut.root.setProps({ resourceId: "newData" })
        await sut.testDataPromise.resolve({ result: 'Success2!' })

        sut.assertState()
    })

    it('should pass failure when data load fails', async() => {
        const sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: false })

        await sut.testDataPromise.reject(new Error('Boom!'))

        sut.assertState()
    })

    it('client render after SSR with data should not fetch data', async() => {
        let sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: true })
        await sut.testDataPromise.resolve({ result: 'Success!' })

        sut = new ComponentFixture(sut.currentState, "testKey", { isServerSideRender: false })

        sut.assertState()
    })

    it('should remove data from redux when unmounted', async() => {
        let sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: false })
        await sut.testDataPromise.resolve({ result: 'Success!' })

        await sut.unmount()

        sut.assertState()
    })

    it('should ignore completion once component is unmounted', async() => {
        let sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: false })

        await sut.unmount()
        await sut.testDataPromise.resolve({ result: 'Success!' })

        sut.assertState()
    })
})