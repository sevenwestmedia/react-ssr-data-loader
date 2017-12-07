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

    it('paged component supports being re-rendered', async () => {
        const sut = new PagedComponentFixture(undefined, "testKey", false)

        await sut.testDataPromise.resolve(['Test'])
        sut.nextPage()
        await sut.testDataPromise.resolve(['Test2'])

        sut.root.setProps({ resourceId: 'testKey' })
        sut.assertState()
        await new Promise(resolve => setTimeout(resolve))

        sut.assertState()
    })

    it('calling nextPage when already loading a page ignores the action', async () => {
        const sut = new PagedComponentFixture(undefined, "testKey", false)

        await sut.testDataPromise.resolve(['Test'])
        sut.nextPage()
        sut.nextPage()
        sut.assertState()
    })

    it('refresh causes page to go back to page 1', async () => {
        const sut = new PagedComponentFixture(undefined, "testKey", false)

        await sut.testDataPromise.resolve(['Test'])
        sut.nextPage()
        await sut.testDataPromise.resolve(['Test2'])
        sut.refreshData()
        await sut.testDataPromise.resolve(['Test'])
        sut.assertState()
    })
})