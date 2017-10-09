import * as React from 'react'
import { mount, ReactWrapper } from 'enzyme'
import { LoadedState, default as IsLoading } from '../../src/is-loading'
import PromiseCompletionSource from './promise-completion-source'
import DataLoaderResources from '../../src/data-loader-resources'
import { DataLoaderState } from '../../src/data-loader-actions'
import DataProvider from '../../src/data-provider'

export interface Data {
    result: string
}

export default class ComponentFixture {
    renderCount = 0
    testDataPromise: PromiseCompletionSource<Data>
    testDataPromise2: PromiseCompletionSource<Data>
    root: ReactWrapper<any, any>
    component: ReactWrapper<any, any>
    resources: DataLoaderResources<any>
    currentState: DataLoaderState
    lastRenderProps: LoadedState

    constructor() {
        this.testDataPromise = new PromiseCompletionSource<Data>()
        this.testDataPromise2 = new PromiseCompletionSource<Data>()
        this.resources = new DataLoaderResources()
        const TestDataLoader = this.resources.registerResource('dataType', () => {
            return this.testDataPromise.promise
        })
        const TestDataLoader2 = this.resources.registerResource('dataType2', () => {
            return this.testDataPromise2.promise
        })
        const TestComponent: React.SFC<any> = ({ }) => (
            <DataProvider
                initialState={undefined}
                isServerSideRender={false}
                resources={this.resources}
                onEvent={(event) => {
                    if (event.type === 'state-changed') {
                        this.currentState = event.state
                    } else if (event.type === 'load-error') {
                        console.error(event.data.error)
                    }
                }}
            >
                <div>
                    <TestDataLoader
                        resourceId='dataKey'
                        renderData={() => (<div />)}
                    />
                    <TestDataLoader2
                        resourceId='dataKey'
                        renderData={() => (<div />)}
                    />
                    <IsLoading
                        renderData={(props) => {
                            this.renderCount++
                            this.lastRenderProps = props
                            return null
                        }}
                    />
                </div>
            </DataProvider>
        )

        this.root = mount(<TestComponent />)

        this.component = this.root.find(IsLoading)
    }

    assertState() {
        expect({
            renderCount: this.renderCount,
            renderProps: this.lastRenderProps,
        }).toMatchSnapshot()
    }

    resetPromise() {
        this.testDataPromise = new PromiseCompletionSource<Data>()
    }

    unmount = async() => {
        this.root.unmount()

        return new Promise((resolve) => setTimeout(resolve))
    }
}