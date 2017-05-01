import * as React from 'react'
import { mount, render, ReactWrapper } from 'enzyme'
import { Props, LoadedState, createTypedDataLoader } from '../../src/data-loader'
import DataProvider from '../../src/data-provider'
import DataLoaderResources from '../../src/data-loader-resources'
import { DataLoaderState } from '../../src/data-loader-actions'
import PromiseCompletionSource from './promise-completion-source'
import { Data, dataType } from './test-data'

export default class ComponentFixture {
    loadAllCompletedCalled = 0
    loadDataCount = 0
    renderCount = 0
    renderCount2 = 0
    testDataPromise: PromiseCompletionSource<Data>
    testDataPromise2: PromiseCompletionSource<Data>
    root: ReactWrapper<{ dataKey: string }, any>
    component: ReactWrapper<Props<Data, {}>, any>
    resources: DataLoaderResources
    currentState: DataLoaderState
    lastRenderProps: LoadedState<Data, {}>
    lastRenderProps2: LoadedState<Data, {}>

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
                        renderData={(props) => {
                            this.renderCount++
                            this.lastRenderProps = props
                            return null
                        }}
                    />
                    <TestDataLoader
                        dataKey={dataKey}
                        clientLoadOnly={clientLoadOnly}
                        renderData={(props) => {
                            this.renderCount2++
                            this.lastRenderProps2 = props
                            return null
                        }}
                    />
                </div>
            </DataProvider>
        )

        this.root = mount(<TestComponent dataKey={dataKey} />)

        this.component = this.root.find(TestDataLoader)
    }

    assertState() {
        expect({
            renderCount: this.renderCount,
            renderCount2: this.renderCount2,
            loadAllCompletedCalled: this.loadAllCompletedCalled,
            renderProps1: this.lastRenderProps,
            renderProps2: this.lastRenderProps2,
            loadDataCount: this.loadDataCount
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