import ComponentFixture from './helpers/component-fixture'
import SharedDataComponentFixture from './helpers/shared-data-component-fixture'

describe('server side render', () => {
    it('should start loading data if not loaded', () => {
        const sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: true })

        sut.assertState()
    })

    it('should pass loaded data once promise resolves', async() => {
        const sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: true })

        await sut.testDataPromise.resolve({
            result: 'Success!'
        })

        sut.assertState()
    })

    it('should pass failure when data load fails', async() => {
        const sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: true })

        await sut.testDataPromise.reject(new Error('Boom!'))

        sut.assertState()
    })

    it('second SSR when data loaded should not reload data', async() => {
        let sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: true })
        await sut.testDataPromise.resolve({ result: 'Success!' })

        sut = new ComponentFixture(sut.currentState, "testKey", { isServerSideRender: true })

        expect(sut.loadDataCount).toBe(0)
    })

    it('second SSR when data load failed should not reload data', async() => {
        let sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: true })
        await sut.testDataPromise.reject(new Error('Boom'))

        sut = new ComponentFixture(sut.currentState, "testKey", { isServerSideRender: true })

        expect(sut.loadDataCount).toBe(0)
    })

    it('does not render on the server if clientLoadOnlySet', async () => {
        let sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: true, clientLoadOnly: true })

        sut.assertState()
    })

    it('can have two components in the same render tree', async () => {
        let sut = new SharedDataComponentFixture(undefined, "testKey", true)

        sut.assertState()
    })

    it('second SSR with two components in same tree uses data', async () => {
        let sut = new SharedDataComponentFixture(undefined, "testKey", true)
        await sut.testDataPromise.resolve({ result: 'Success!' })
        let sut2 = new SharedDataComponentFixture(sut.currentState, "testKey", true)

        sut2.assertState()
    })
})
