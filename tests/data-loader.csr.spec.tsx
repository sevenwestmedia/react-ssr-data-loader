import { ComponentFixture } from './helpers/component-fixture'
import Adapter from 'enzyme-adapter-react-16'
import { configure } from 'enzyme'

configure({ adapter: new Adapter() })

describe('Client side render', () => {
    it('should start loading data if not loaded', () => {
        const sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: false })

        sut.assertState()
    })

    it('should pass loaded data once promise resolves', async () => {
        const sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: false })

        await sut.testDataPromise.resolve({
            result: 'Success!',
        })

        sut.assertState()
    })

    it('loads data when props change', async () => {
        const sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: false })

        await sut.testDataPromise.resolve({ result: 'Success!' })
        sut.resetPromise()
        sut.root.setProps({ id: 'newData' })
        await sut.testDataPromise.resolve({ result: 'Success2!' })

        sut.assertState()
    })

    it('should pass failure when data load fails', async () => {
        const sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: false })

        await sut.testDataPromise.reject(new Error('Boom!'))

        sut.assertState()
    })

    it('client render after SSR with data should not fetch data', async () => {
        let sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: true })
        await sut.testDataPromise.resolve({ result: 'Success!' })

        sut = new ComponentFixture(sut.currentState, 'testKey', { isServerSideRender: false })

        sut.assertState()
    })

    // TODO Rename once snapshots are stable
    it('should remove data from redux when unmounted', async () => {
        const sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: false })
        await sut.testDataPromise.resolve({ result: 'Success!' })

        await sut.unmount()

        sut.assertState()
    })

    it('should ignore completion once component is unmounted', async () => {
        const sut = new ComponentFixture(undefined, 'testKey', { isServerSideRender: false })

        await sut.unmount()
        await sut.testDataPromise.resolve({ result: 'Success!' })

        sut.assertState()
    })
})
