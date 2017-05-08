import ComponentFixture from './helpers/component-fixture'
import MultipleComponentFixture from './helpers/different-keys-data-component-fixture'

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

    it('calling refresh when already refreshing ignores the action', async () => {
        const sut = new ComponentFixture(undefined, "testKey", { isServerSideRender: false })

        await sut.testDataPromise.resolve({ result: 'Test' })
        sut.refreshData()
        sut.refreshData()
        sut.assertState()
    })

    it('refresh action is called with the correct context', async () => {
        const sut = new MultipleComponentFixture(undefined, 'testKey', 'testKey2', false, false)

        await sut.testDataPromise.resolve({ result: 'Test1_1' })
        await sut.testDataPromise2.resolve({ result: 'Test2_1' })
        sut.refreshData2()

        expect(sut.loadDataCount1).toBe(1)
        expect(sut.loadDataCount2).toBe(2)
    })
})