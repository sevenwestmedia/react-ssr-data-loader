import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { Props, LoadedState, createTypedDataLoader } from '../../src/data-loader'
import DataProvider from '../../src/data-provider'
import DataLoaderResources from '../../src/data-loader-resources'
import { DataLoaderState } from '../../src/data-loader-actions'
import PromiseCompletionSource from './promise-completion-source'
import { Data, dataType } from './test-data'
import Verifier from './verifier'

export default class ComponentFixture {
    loadAllCompletedCalled = 0
    loadDataCount = 0
    renderCount = 0
    testDataPromise: PromiseCompletionSource<Data>
    testDataPromise2: PromiseCompletionSource<Data>
    root: ReactWrapper<{ dataKey: string }, any>
    component: ReactWrapper<Props<Data, {}>, any>
    resources: DataLoaderResources
    currentState: DataLoaderState

    constructor(initialState: DataLoaderState, dataKey: string, isServerSideRender: boolean, clientLoadOnly = false) {
        this.currentState = initialState
        this.testDataPromise = new PromiseCompletionSource<Data>()
        this.resources = new DataLoaderResources()
        const TestDataLoader = this.resources.registerResource(dataType, (dataKey: string) => {
            this.loadDataCount++
            return this.testDataPromise.promise
        })

        const TestComponent: React.SFC<{ dataKey: string }> = ({ dataKey }) => (
            <DataProvider
                initialState={initialState}
                isServerSideRender={isServerSideRender}
                resources={this.resources}
                loadAllCompleted={() => this.loadAllCompletedCalled++}
                stateChanged={state => this.currentState = state}
                onError={err => console.error(err)}
            >
                <div>
                    <TestDataLoader
                        dataKey={dataKey}
                        clientLoadOnly={clientLoadOnly}
                        renderData={(props) => (
                            <Verifier {...props} renderCount={++this.renderCount} />
                        )}
                    />
                    <TestDataLoader
                        dataKey={dataKey}
                        clientLoadOnly={clientLoadOnly}
                        renderData={(props) => (
                            <Verifier {...props} renderCount={++this.renderCount} />
                        )}
                    />
                </div>
            </DataProvider>
        )

        this.root = mount(<TestComponent dataKey={dataKey} />)

        this.component = this.root.find(TestDataLoader)
    }

    resetPromise() {
        this.testDataPromise = new PromiseCompletionSource<Data>()
    }

    unmount = async() => {
        this.root.unmount()

        return new Promise((resolve) => setTimeout(resolve))
    }
}