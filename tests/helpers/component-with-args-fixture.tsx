import * as React from 'react'
import { mount, ReactWrapper } from 'enzyme'
import { Props } from '../../src/data-loader'
import DataProvider from '../../src/data-provider'
import DataLoaderResources, { RefreshAction } from '../../src/data-loader-resources'
import { DataLoaderState, LoaderState } from '../../src/data-loader-actions'
import PromiseCompletionSource from './promise-completion-source'
import { Data, resourceType } from './test-data'

export default class ComponentFixture<T extends object> {
    loadAllCompletedCalled = 0
    loadDataCount = 0
    renderCount = 0
    testDataPromise: PromiseCompletionSource<Data>
    root: ReactWrapper<{ resourceId: string } & T, any>
    component: ReactWrapper<Props<Data, {}>, any>
    resources: DataLoaderResources<any>
    passedParams: T
    currentState: DataLoaderState | undefined
    lastRenderProps: LoaderState<Data>
    lastRenderActions: RefreshAction
    existingData: Data

    constructor(
        initialState: DataLoaderState | undefined, resourceId: string,
        args: T,
        isServerSideRender: boolean,
        // For some reason the typescript compiler is not validating the JSX below properly
        // And is saying this variable is not used
        _clientLoadOnly = false
    ) {
        this.currentState = initialState
        this.testDataPromise = new PromiseCompletionSource<Data>()
        this.resources = new DataLoaderResources()
        
        const TestDataLoader = this.resources.registerResource(resourceType, (_: string, params: T, existingData: Data) => {
            this.loadDataCount++
            this.passedParams = params
            this.existingData = existingData
            return this.testDataPromise.promise
        })

        const TestComponent: React.SFC<{ resourceId: string } & T> = (props) => (
            <DataProvider
                initialState={initialState}
                isServerSideRender={isServerSideRender}
                resources={this.resources}
                onEvent={(event) => {
                    if (event.type === 'data-load-completed') {
                        this.loadAllCompletedCalled++
                    } else if (event.type === 'state-changed') {
                        this.currentState = event.state
                    } else if (event.type === 'load-error') {
                        console.error(event.data.error)
                    }
                }}
            >
                <TestDataLoader
                    {...props as any}
                    clientLoadOnly={_clientLoadOnly}
                    renderData={(props, actions) => {
                        this.renderCount++
                        this.lastRenderProps = props
                        this.lastRenderActions = actions

                        return null
                    }}
                />
            </DataProvider>
        )

        this.root = mount(<TestComponent resourceId={resourceId} {...args as any} />)

        this.component = this.root.find(TestDataLoader)
    }

    assertState() {
        expect({
            renderCount: this.renderCount,
            loadAllCompletedCalled: this.loadAllCompletedCalled,
            renderProps: this.lastRenderProps,
            renderActions: this.lastRenderActions,
            loadDataCount: this.loadDataCount,
            passedParams: this.passedParams
        }).toMatchSnapshot()
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