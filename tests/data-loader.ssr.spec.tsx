import { ComponentFixture } from './helpers/component-fixture'
import { SharedDataComponentFixture } from './helpers/shared-data-component-fixture'
import Adapter from 'enzyme-adapter-react-16'
import { configure } from 'enzyme'
import { act } from 'react-dom/test-utils'

configure({ adapter: new Adapter() })

describe('server side render', () => {
    it('should start loading data if not loaded', () => {
        const sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: true })

        sut.assertState()
    })

    it('should pass loaded data once promise resolves', async () => {
        const sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: true })

        await act(() =>
            sut.testDataPromise.resolve({
                result: 'Success!',
            }),
        )

        sut.assertState()
    })

    it('should pass failure when data load fails', async () => {
        const sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: true })

        await act(() => sut.testDataPromise.reject(new Error('Boom!')))

        sut.assertState()
    })

    it('second SSR when data loaded should not reload data', async () => {
        let sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: true })
        await act(() => sut.testDataPromise.resolve({ result: 'Success!' }))

        sut = new ComponentFixture(sut.currentState, 'testKey', { isServerSideRender: true })

        expect(sut.loadDataCount).toBe(0)
    })

    it('second SSR when data load failed should not reload data', async () => {
        let sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: true })
        await act(() => sut.testDataPromise.reject(new Error('Boom')))

        sut = new ComponentFixture(sut.currentState, 'testKey', { isServerSideRender: true })

        expect(sut.loadDataCount).toBe(0)
    })

    it('does not trigger data load on the server if clientLoadOnlySet', async () => {
        const sut = new ComponentFixture(undefined, 'testKey', {
            isServerSideRender: true,
            clientLoadOnly: true,
        })

        sut.assertState()
    })

    it('can have two components in the same render tree', async () => {
        const sut = new SharedDataComponentFixture(undefined, 'testKey', true)

        sut.assertState()
    })

    it('second SSR with two components in same tree uses data', async () => {
        const sut = new SharedDataComponentFixture(undefined, 'testKey', true)
        await act(() => sut.testDataPromise.resolve({ result: 'Success!' }))

        const sut2 = new SharedDataComponentFixture(sut.currentState, 'testKey', true)

        sut2.assertState()
    })
})
