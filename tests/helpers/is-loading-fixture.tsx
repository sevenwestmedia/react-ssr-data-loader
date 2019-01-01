import React from 'react'
import { LoadedState, IsLoading } from '../../src/is-loading'
import { DataLoaderResources } from '../../src/data-loader-resources'
import { DataLoaderState } from '../../src/data-loader-state'
import { DataLoaderProvider } from '../../src/data-provider'

// tslint:disable-next-line:no-implicit-dependencies
import { mount, ReactWrapper } from 'enzyme'
import { PromiseCompletionSource } from 'promise-completion-source'

export interface Data {
    result: string
}

export class IsLoadingFixture {
    renderCount = 0
    testDataPromise: PromiseCompletionSource<Data>
    root: ReactWrapper<any, any>
    component: ReactWrapper<any, any>
    resources: DataLoaderResources<any>
    currentState!: DataLoaderState
    lastRenderProps!: LoadedState

    constructor() {
        this.testDataPromise = new PromiseCompletionSource<Data>()
        this.resources = new DataLoaderResources()
        const TestDataLoader = this.resources.registerResource('dataType', () => {
            return this.testDataPromise.promise
        })
        const TestComponent: React.SFC<any> = ({}) => (
            <DataLoaderProvider
                initialState={undefined}
                isServerSideRender={false}
                resources={this.resources}
                // tslint:disable-next-line:jsx-no-lambda
                onEvent={event => {
                    if (event.type === 'state-changed') {
                        this.currentState = event.state
                    } else if (event.type === 'load-error') {
                        // tslint:disable-next-line:no-console
                        console.info(event.data.error)
                    }
                }}
            >
                <div>
                    {/* tslint:disable-next-line:jsx-no-lambda */}
                    <TestDataLoader resourceId="dataKey" renderData={() => <div />} />
                    <IsLoading
                        // tslint:disable-next-line:jsx-no-lambda
                        renderData={props => {
                            this.lastRenderProps = props
                            ++this.renderCount
                            return null
                        }}
                    />
                </div>
            </DataLoaderProvider>
        )

        this.root = mount(<TestComponent />)

        this.component = this.root.find(IsLoading)
    }

    assertState() {
        expect({
            renderCount: this.renderCount,
            renderProps: this.lastRenderProps
        }).toMatchSnapshot()
    }

    resetPromise() {
        this.testDataPromise = new PromiseCompletionSource<Data>()
    }

    unmount = async () => {
        this.root.unmount()

        return new Promise(resolve => setTimeout(resolve))
    }
}
