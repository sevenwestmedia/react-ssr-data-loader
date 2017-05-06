import ComponentWithArgsFixture from './helpers/component-with-args-fixture'

describe('data-loader', () => {
    it('can specify arguments for data loader', async () => {
        const args = { bar: 1 }
        const sut = new ComponentWithArgsFixture(undefined, "testKey", args, false)

        await sut.testDataPromise.resolve({ result: 'Test' })

        expect(sut.passedParams).toEqual(args)
        sut.assertState()
    })

    it.only('updates data when params change', async () => {
        const args = { bar: 1 }
        const sut = new ComponentWithArgsFixture(undefined, "testKey", args, false)
        await sut.testDataPromise.resolve({ result: 'Test' })
        sut.resetPromise()

        sut.root.setProps({
            bar: 2
        })
        await sut.testDataPromise.resolve({ result: 'Test2' })

        sut.assertState()
    })
})