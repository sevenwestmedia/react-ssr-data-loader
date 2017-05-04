import PagedComponentFixture from './helpers/paged-component-fixture'

describe('data-loader', () => {
    it('supports paged data', async () => {
        const sut = new PagedComponentFixture(undefined, "testKey", false)

        await sut.testDataPromise.resolve(['Test'])
        sut.assertState()
        sut.nextPage()
        sut.assertState()

        await sut.testDataPromise.resolve(['Test2'])
        sut.assertState()
    })
})