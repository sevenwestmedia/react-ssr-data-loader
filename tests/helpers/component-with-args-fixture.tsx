import React, { useState } from 'react'
import { mount, ReactWrapper } from 'enzyme'
import { PromiseCompletionSource } from 'promise-completion-source'

import { UserActions } from '../../src/data-loader'
import { DataProvider } from '../../src/data-provider'
import { DataLoaderResources } from '../../src/data-loader-resources'
import { LoaderState } from '../../src/data-loader-state'
import { DataLoaderState } from '../../src/data-loader-store-and-loader'

import { TestDataType, resourceType } from './test-data'

export class ComponentWithArgsFixture<T extends Record<string, any>> {
    loadAllCompletedCalled = 0
    loadDataCount = 0
    renderCount = 0
    testDataPromise: PromiseCompletionSource<TestDataType>
    root: ReactWrapper<{ id: string } & T, any>
    resources: DataLoaderResources<any>
    passedParams!: T
    currentState: DataLoaderState | undefined
    lastRenderProps!: LoaderState<TestDataType>
    lastRenderActions!: UserActions<any>

    constructor(
        initialState: DataLoaderState | undefined,
        id: string,
        args: T,
        cacheKeyProperties: Array<keyof T> | undefined,
        isServerSideRender: boolean,
        // For some reason the typescript compiler is not validating the JSX below properly
        // And is saying this variable is not used
        _clientLoadOnly = false,
    ) {
        this.currentState = initialState
        this.testDataPromise = new PromiseCompletionSource<TestDataType>()
        this.resources = new DataLoaderResources()

        const useDataLoader = this.resources.registerResource(
            resourceType,
            (params: T) => {
                this.loadDataCount++
                this.passedParams = params
                return this.testDataPromise.promise
            },
            cacheKeyProperties,
        )

        const TestComponent: React.FC<{}> = () => {
            const [state, setState] = useState<T>(args)
            const { actions, params, ...props } = useDataLoader(state)
            this.setState = (val) => setState({ ...state, ...val })
            this.renderCount++
            this.lastRenderProps = props
            this.lastRenderActions = actions
            return null
        }

        this.root = mount(
            <DataProvider
                initialState={initialState}
                isServerSideRender={isServerSideRender}
                resources={this.resources}
                onEvent={(event) => {
                    if (event.type === 'data-load-completed') {
                        this.loadAllCompletedCalled++
                    } else if (event.type === 'state-changed') {
                        this.currentState = event.state
                    }
                }}
            >
                <TestComponent id={id} {...(args as any)} />
            </DataProvider>,
        )
    }

    assertState() {
        expect({
            renderCount: this.renderCount,
            loadAllCompletedCalled: this.loadAllCompletedCalled,
            renderProps: this.lastRenderProps,
            renderActions: this.lastRenderActions,
            loadDataCount: this.loadDataCount,
            passedParams: this.passedParams,
        }).toMatchSnapshot()
    }

    resetPromise() {
        this.testDataPromise = new PromiseCompletionSource<TestDataType>()
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setState = (_args: Partial<T>) => {}

    getLoaderState = () => this.currentState

    unmount = async () => {
        this.root.unmount()

        return new Promise((resolve) => setTimeout(resolve))
    }
}
