import { PagedComponentFixture } from './helpers/paged-component-fixture'
import Adapter from 'enzyme-adapter-react-16'
import { configure } from 'enzyme'
import { act } from 'react-dom/test-utils'
import { processEventLoop } from './helpers/event-loop-helpers'

configure({ adapter: new Adapter() })
describe('data-loader', () => {
    it('supports paged data', async () => {
        const sut = new PagedComponentFixture(undefined, 'testKey', false)

        await act(() => sut.testDataPromise.resolve(['Test']))
        sut.assertState()

        act(() => sut.nextPage())

        sut.assertState()

        await act(() => sut.testDataPromise.resolve(['Test2']))
        sut.assertState()
    })

    it('paged component supports being re-rendered', async () => {
        const sut = new PagedComponentFixture(undefined, 'testKey', false)

        await act(async () => {
            await sut.testDataPromise.resolve(['Test'])
            sut.nextPage()
            await sut.testDataPromise.resolve(['Test2'])

            sut.root.setProps({ id: 'testKey' })
        })

        sut.assertState()

        await act(() => processEventLoop())

        sut.assertState()
    })

    it('calling nextPage when already loading a page ignores the action', async () => {
        const sut = new PagedComponentFixture(undefined, 'testKey', false)

        await act(async () => {
            await sut.testDataPromise.resolve(['Test'])
            sut.nextPage()
            sut.nextPage()
        })

        sut.assertState()
    })

    it('refresh causes page to go back to page 1', async () => {
        const sut = new PagedComponentFixture(undefined, 'testKey', false)

        await act(async () => {
            await sut.testDataPromise.resolve(['Test'])
            sut.nextPage()
            await sut.testDataPromise.resolve(['Test2'])
            sut.refreshData()
            await sut.testDataPromise.resolve(['Test'])
        })

        sut.assertState()
    })
})
