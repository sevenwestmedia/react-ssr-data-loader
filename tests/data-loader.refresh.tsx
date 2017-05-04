import ComponentFixture from './helpers/component-fixture'

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