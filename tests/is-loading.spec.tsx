import { IsLoadingFixture } from './helpers/is-loading-fixture'
import { IsLoadingWithMultipleLoadersFixture } from './helpers/is-loading-with-multiple-loaders-fixture'
import Adapter from 'enzyme-adapter-react-16'
import { configure } from 'enzyme'

configure({ adapter: new Adapter() })

describe('Is loading component', () => {
    it('should be loading if any data loaders are loading', () => {
        const sut = new IsLoadingFixture()

        sut.assertState()
    })

    it('should be loading if one of two have finished loading', async () => {
        const sut = new IsLoadingWithMultipleLoadersFixture()
        await sut.testDataPromise.resolve({
            result: 'Foo!'
        })

        sut.assertState()
    })

    it('should not be loading once all data loaders have completed', async () => {
        const sut = new IsLoadingWithMultipleLoadersFixture()
        await sut.testDataPromise.resolve({
            result: 'Foo!'
        })
        await sut.testDataPromise2.resolve({
            result: 'Foo2!'
        })

        sut.assertState()
    })
})
