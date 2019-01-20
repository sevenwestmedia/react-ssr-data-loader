import { ComponentWithArgsFixture } from './helpers/component-with-args-fixture'
import Adapter from 'enzyme-adapter-react-16'
import { configure } from 'enzyme'

configure({ adapter: new Adapter() })

describe('data-loader', () => {
    it('can specify arguments for data loader', async () => {
        const args = { bar: 1 }
        const sut = new ComponentWithArgsFixture(undefined, 'testKey', args, false)

        await sut.testDataPromise.resolve({ result: 'Test' })

        expect(sut.passedParams).toEqual(args)
        sut.assertState()
    })
})
