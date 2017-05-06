import ComponentWithArgsFixture from './helpers/component-with-args-fixture'

describe('data-loader', () => {
    it('can specify arguments for data loader', async () => {
        const foo = { bar: 1 }
        const sut = new ComponentWithArgsFixture(undefined, "testKey", foo, false)

        await sut.testDataPromise.resolve({ result: 'Test' })

        expect(sut.passedParams).toEqual(foo)
        sut.assertState()
    })
})