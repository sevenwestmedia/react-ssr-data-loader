import React from 'react'
import { Props, UserActions } from '../../src/data-loader'
import { DataLoaderProvider } from '../../src/data-provider'
import { DataLoaderResources } from '../../src/data-loader-resources'
import { LoaderState } from '../../src/data-loader-state'
import { Data, resourceType } from './test-data'

// tslint:disable-next-line:no-implicit-dependencies
import { mount, ReactWrapper } from 'enzyme'
import { PromiseCompletionSource } from 'promise-completion-source'
import { DataLoaderState } from '../../src/data-loader-store-and-loader'

export class ComponentWithArgsFixture<T extends object> {
    loadAllCompletedCalled = 0
    loadDataCount = 0
    renderCount = 0
    testDataPromise: PromiseCompletionSource<Data>
    root: ReactWrapper<{ id: string } & T, any>
    component: ReactWrapper<Props<Data, any, any>, any>
    resources: DataLoaderResources<any>
    passedParams!: T
    currentState: DataLoaderState | undefined
    lastRenderProps!: LoaderState<Data>
    lastRenderActions!: UserActions<any>

    constructor(
        initialState: DataLoaderState | undefined,
        id: string,
        args: T,
        cacheKeyProperties: Array<keyof T & string> | undefined,
        isServerSideRender: boolean,
        // For some reason the typescript compiler is not validating the JSX below properly
        // And is saying this variable is not used
        // tslint:disable-next-line:variable-name
        _clientLoadOnly = false,
    ) {
        this.currentState = initialState
        this.testDataPromise = new PromiseCompletionSource<Data>()
        this.resources = new DataLoaderResources()
        // tslint:disable-next-line:no-this-assignment
        const fixture = this

        const TestDataLoader = this.resources.registerResource(
            resourceType,
            params => {
                this.loadDataCount++
                this.passedParams = params
                return this.testDataPromise.promise
            },
            cacheKeyProperties,
        )

        // tslint:disable-next-line:max-classes-per-file
        class TestComponent extends React.Component<{}, T> {
            state: T = args

            render() {
                return (
                    <DataLoaderProvider
                        initialState={initialState}
                        isServerSideRender={isServerSideRender}
                        resources={fixture.resources}
                        // tslint:disable-next-line:jsx-no-lambda
                        onEvent={event => {
                            if (event.type === 'data-load-completed') {
                                fixture.loadAllCompletedCalled++
                            } else if (event.type === 'state-changed') {
                                fixture.currentState = event.state
                            }
                        }}
                    >
                        <TestDataLoader
                            {...this.state as any}
                            // tslint:disable-next-line:jsx-no-lambda
                            renderData={(props, actions) => {
                                fixture.renderCount++
                                fixture.lastRenderProps = props
                                fixture.lastRenderActions = actions
                                return null
                            }}
                        />
                    </DataLoaderProvider>
                )
            }
        }

        this.root = mount(<TestComponent id={id} {...args as any} />)

        this.component = this.root.find(TestDataLoader)
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
        this.testDataPromise = new PromiseCompletionSource<Data>()
    }

    getState = () => this.currentState

    unmount = async () => {
        this.root.unmount()

        return new Promise(resolve => setTimeout(resolve))
    }
}
