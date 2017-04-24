import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { LoadedState, createTypedDataLoader } from '../src/data-loader'
import PromiseCompletionSource from './helpers/promise-completion-source'
import ComponentFixture from './helpers/component-fixture'
import IsLoadingFixture, { Verifier } from './helpers/is-loading-fixture'
import IsLoadingWithMultipleLoadersFixture, { Verifier as MultiLoaderVerifier } from './helpers/is-loading-with-multiple-loaders-fixture'

describe('Is loading component', () => {
    it('should be loading if any data loaders are loading', () => {
        const sut = new IsLoadingFixture()

        const verifier = sut.component.find(Verifier)

        expect(verifier.props()).toMatchSnapshot()
        expect(sut.currentState).toMatchSnapshot()
    })

    it('should be loading if one of two have finished loading', async () => {
        const sut = new IsLoadingWithMultipleLoadersFixture()
        await sut.testDataPromise.resolve({
            result: 'Foo!'
        })

        const verifier = sut.component.find(MultiLoaderVerifier)

        expect(verifier.props()).toMatchSnapshot()
        expect(sut.currentState).toMatchSnapshot()
    })

    it.only('should not be loading once all data loaders have completed', async () => {
        const sut = new IsLoadingWithMultipleLoadersFixture()
        await sut.testDataPromise.resolve({
            result: 'Foo!'
        })
        await sut.testDataPromise2.resolve({
            result: 'Foo2!'
        })

        const verifier = sut.component.find(MultiLoaderVerifier)

        expect(verifier.props()).toMatchSnapshot()
        expect(sut.currentState).toMatchSnapshot()
    })
})