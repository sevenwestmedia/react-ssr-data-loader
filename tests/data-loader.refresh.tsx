import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { createTypedDataLoader } from '../src/data-loader'
import { DataLoaderState } from '../src/data-loader-actions'
import PromiseCompletionSource from './helpers/promise-completion-source'
import ComponentFixture from './helpers/component-fixture'
import PagedComponentFixture from './helpers/paged-component-fixture'
import ComponentWithArgsFixture from './helpers/component-with-args-fixture'
import SharedDataComponentFixture from './helpers/shared-data-component-fixture'
import DifferentKeysDataComponentFixture from './helpers/different-keys-data-component-fixture'

describe('data-loader', () => {
    it('can refresh data', async () => {
        const sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: false })

        await sut.testDataPromise.resolve({ result: 'Test' })
        sut.assertState()
        sut.refreshData()

        sut.assertState()
        await sut.testDataPromise.resolve({ result: 'Test2' })
        sut.assertState()
    })
})