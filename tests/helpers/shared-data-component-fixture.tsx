import React from 'react'
import { Props } from '../../src/data-loader'
import { DataLoaderProvider } from '../../src/data-provider'
import { DataLoaderResources } from '../../src/data-loader-resources'
import { DataLoaderState, LoaderState } from '../../src/data-loader-state'
import { Data, resourceType } from './test-data'

// tslint:disable-next-line:no-implicit-dependencies
import { mount, ReactWrapper } from 'enzyme'
import { PromiseCompletionSource } from 'promise-completion-source'

export class SharedDataComponentFixture {
    loadAllCompletedCalled = 0
    loadDataCount = 0
    renderCount = 0
    renderCount2 = 0
    testDataPromise: PromiseCompletionSource<Data>
    testDataPromise2!: PromiseCompletionSource<Data>
    root: ReactWrapper<
        {
            resourceId: string
            unmountLastDataLoader: boolean
            renderAdditionalDataLoader: boolean
        },
        any
    >
    component: ReactWrapper<Props<Data, any>, any>
    resources: DataLoaderResources<any>
    currentState: DataLoaderState | undefined
    lastRenderProps!: LoaderState<Data>
    lastRenderProps2!: LoaderState<Data>

    constructor(
        initialState: DataLoaderState | undefined,
        resourceId: string,
        isServerSideRender: boolean,
        clientLoadOnly = false,
        additionalDataLoader = false
    ) {
        this.currentState = initialState
        this.testDataPromise = new PromiseCompletionSource<Data>()
        this.resources = new DataLoaderResources()
        const TestDataLoader = this.resources.registerResource(resourceType, () => {
            this.loadDataCount++
            return this.testDataPromise.promise
        })

        const TestComponent: React.SFC<{
            resourceId: string
            renderAdditionalDataLoader: boolean
            unmountLastDataLoader: boolean
        }> = ({
            resourceId: testResourceId,
            renderAdditionalDataLoader,
            unmountLastDataLoader
        }) => {
            return (
                <React.StrictMode>
                    <DataLoaderProvider
                        initialState={initialState}
                        isServerSideRender={isServerSideRender}
                        resources={this.resources}
                        // tslint:disable-next-line:jsx-no-lambda
                        onEvent={event => {
                            if (event.type === 'data-load-completed') {
                                this.loadAllCompletedCalled++
                            } else if (event.type === 'state-changed') {
                                this.currentState = event.state
                            } else if (event.type === 'load-error') {
                                // tslint:disable-next-line:no-console
                                console.info(event.data.error)
                            }
                        }}
                    >
                        <div>
                            <TestDataLoader
                                resourceId={testResourceId}
                                clientLoadOnly={clientLoadOnly}
                                // tslint:disable-next-line:jsx-no-lambda
                                renderData={props => {
                                    this.renderCount++
                                    this.lastRenderProps = props
                                    return null
                                }}
                            />

                            {renderAdditionalDataLoader && (
                                <TestDataLoader
                                    resourceId={testResourceId}
                                    clientLoadOnly={clientLoadOnly}
                                    // tslint:disable-next-line:jsx-no-lambda
                                    renderData={() => {
                                        return null
                                    }}
                                />
                            )}
                            {!unmountLastDataLoader && (
                                <TestDataLoader
                                    resourceId={testResourceId}
                                    clientLoadOnly={clientLoadOnly}
                                    // tslint:disable-next-line:jsx-no-lambda
                                    renderData={props => {
                                        this.renderCount2++
                                        this.lastRenderProps2 = props
                                        return null
                                    }}
                                />
                            )}
                        </div>
                    </DataLoaderProvider>
                </React.StrictMode>
            )
        }

        this.root = mount(
            <TestComponent
                resourceId={resourceId}
                unmountLastDataLoader={false}
                renderAdditionalDataLoader={additionalDataLoader}
            />
        )

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

    unmount = async () => {
        this.root.unmount()

        return new Promise(resolve => setTimeout(resolve))
    }
}
