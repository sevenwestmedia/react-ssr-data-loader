import Adapter from 'enzyme-adapter-react-16'
import { ComponentFixture } from './helpers/component-fixture'
import { configure } from 'enzyme'
import { processEventLoop } from './helpers/event-loop-helpers'
import { act } from 'react-dom/test-utils'

configure({ adapter: new Adapter() })

describe('Client side render', () => {
    it('should start loading data if not loaded', () => {
        const sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: false })

        sut.assertState()
    })

    it('should pass loaded data once promise resolves', async () => {
        const sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: false })

        await act(() =>
            sut.testDataPromise.resolve({
                result: 'Success resolved!',
            }),
        )

        sut.assertState()
    })

    it('loads data when props change', async () => {
        const sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: false })

        await act(async () => {
            await sut.testDataPromise.resolve({ result: 'Success props change!' })
            sut.resetPromise()
            sut.setId('newData')
            await processEventLoop()
            await sut.testDataPromise.resolve({ result: 'Success props change 2!' })
        })

        sut.assertState()
    })

    it('should pass failure when data load fails', async () => {
        const sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: false })

        await act(() => sut.testDataPromise.reject(new Error('Boom!')))

        const lastAction = sut.getState().renderProps.lastAction
        expect(lastAction.success).toBe(false)
        expect(lastAction.type).toBe('fetch')
        if (!lastAction.success) {
            expect(() => {
                throw lastAction.error
            }).toThrowError('Boom!')
        }
    })

    it('client render after SSR with data should not fetch data', async () => {
        let sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: true })

        await act(() => sut.testDataPromise.resolve({ result: 'Success from server!' }))

        sut = new ComponentFixture(sut.currentState, 'testKey', { isServerSideRender: false })

        sut.assertState()
    })

    it('should remove data from redux when unmounted', async () => {
        const sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: false })

        await act(async () => {
            await sut.testDataPromise.resolve({ result: 'Success removed!' })
            await sut.unmount()
        })

        const lastEvent = sut.events[sut.events.length - 1]
        expect(lastEvent).toEqual({ state: {}, type: 'state-changed' })
    })

    it('should ignore completion once component is unmounted', async () => {
        const sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: false })

        await act(async () => {
            await sut.unmount()
            await sut.testDataPromise.resolve({ result: 'Success unmounted!' })
        })

        expect(sut.events).toEqual([
            { state: {}, type: 'state-changed' },
            expect.objectContaining({ type: 'state-changed' }),
            expect.objectContaining({ type: 'begin-loading-event' }),
            { state: {}, type: 'state-changed' },
            expect.objectContaining({ type: 'end-loading-event' }),
            expect.objectContaining({ type: 'data-load-completed' }),
        ])
    })
})
