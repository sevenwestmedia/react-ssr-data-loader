import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { Props, LoadedState } from '../../src/data-loader'
import DataProvider from '../../src/data-provider'
import DataLoaderResources from '../../src/data-loader-resources'
import { reducer, DataLoaderState } from '../../src/data-loader-actions'
import PromiseCompletionSource from './promise-completion-source'
import { Data, dataType } from './test-data'
import Verifier from './verifier'

export default class ComponentFixture<T extends object> {
    loadAllCompletedCalled = 0
    loadDataCount = 0
    renderCount = 0
    testDataPromise: PromiseCompletionSource<Data>
    root: ReactWrapper<{ dataKey: string }, any>
    component: ReactWrapper<Props<Data, {}>, any>
    resources: DataLoaderResources
    passedParams: T
    currentState: DataLoaderState

    constructor(initialState: DataLoaderState, dataKey: string, args: T, isServerSideRender: boolean, clientLoadOnly = false) {
        this.testDataPromise = new PromiseCompletionSource<Data>()
        this.resources = new DataLoaderResources()
        
        const TestDataLoader = this.resources.registerResourceWithParameters(dataType, (dataKey: string, params: T) => {
            this.loadDataCount++
            this.passedParams = params
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
                <TestDataLoader
                    {...args}
                    dataKey={dataKey}
                    clientLoadOnly={clientLoadOnly}
                    renderData={(props) => (
                        <Verifier {...props} renderCount={++this.renderCount} />
                    )}
                />
            </DataProvider>
        )

        this.root = mount(<TestComponent dataKey={dataKey} />)

        this.component = this.root.find(TestDataLoader)
    }

    resetPromise() {
        this.testDataPromise = new PromiseCompletionSource<Data>()
    }

    getState = () => this.currentState

    unmount = async() => {
        this.root.unmount()

        return new Promise((resolve) => setTimeout(resolve))
    }
}