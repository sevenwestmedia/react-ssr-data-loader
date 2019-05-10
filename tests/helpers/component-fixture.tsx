import React from 'react'
import { Props, UserActions } from '../../src/data-loader'
import { DataLoaderProvider } from '../../src/data-provider'
import { DataLoaderResources } from '../../src/data-loader-resources'
import { LoaderState } from '../../src/data-loader-state'
import { DataProviderEvents } from '../../src/events'
import { Data, resourceType } from './test-data'

// tslint:disable-next-line:no-implicit-dependencies
import { mount, ReactWrapper } from 'enzyme'
import { PromiseCompletionSource } from 'promise-completion-source'
import { DataLoaderState } from '../../src/data-loader-store-and-loader'

export interface FixtureOptions<T> {
    isServerSideRender: boolean
    clientLoadOnly?: boolean
    unloadDataOnUnmount?: boolean
    syncResult?: T
    onEvent?: (event: DataProviderEvents) => void
}

export class ComponentFixture {
    private root: ReactWrapper<{ id: string }, any>

    loadAllCompletedCalled = 0
    loadDataCount = 0
    renderCount = 0
    /** Used instead of the promise to trigger sync data load */
    testDataResult?: Data
    testDataPromise: PromiseCompletionSource<Data>
    component: ReactWrapper<Props<Data, any, { id: string }> & { id: string }, any>
    resources: DataLoaderResources<any>
    currentState: DataLoaderState | undefined
    lastRenderProps!: LoaderState<Data>
    lastRenderActions!: UserActions<any>
    events: any[] = []

    constructor(
        initialState: DataLoaderState | undefined,
        initialId: string,
        options: FixtureOptions<Data>,
    ) {
        this.currentState = initialState
        this.testDataResult = options.syncResult
        this.testDataPromise = new PromiseCompletionSource<Data>()
        this.resources = new DataLoaderResources()
        const TestDataLoader = this.resources.registerResource<Data, { id: string }>(
            resourceType,
            () => {
                this.loadDataCount++
                if (this.testDataResult) {
                    return this.testDataResult
                }
                return this.testDataPromise.promise
            },
        )

        interface State {
            id: string
        }

        // tslint:disable-next-line:no-this-assignment
        const fixture = this

        // tslint:disable-next-line:max-classes-per-file
        class TestComponent extends React.Component<{}, State> {
            state: State = { id: initialId }

            render() {
                return (
                    <DataLoaderProvider
                        initialState={initialState}
                        isServerSideRender={options.isServerSideRender}
                        resources={fixture.resources}
                        // tslint:disable-next-line:jsx-no-lambda
                        onEvent={event => {
                            fixture.events.push(event)
                            if (options.onEvent) {
                                options.onEvent(event)
                            }
                            if (event.type === 'data-load-completed') {
                                fixture.loadAllCompletedCalled++
                            } else if (event.type === 'state-changed') {
                                fixture.currentState = event.state
                            }
                        }}
                    >
                        <TestDataLoader
                            id={this.state.id}
                            clientLoadOnly={options.clientLoadOnly}
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

        this.root = mount(<TestComponent />)

        this.component = this.root.find(TestDataLoader)
    }

    setId = (id: string) => {
        this.root.setState({
            id,
        })
    }

    assertState = () => {
        expect(this.getState()).toMatchSnapshot()
    }

    getState = () => {
        return {
            renderCount: this.renderCount,
            loadAllCompletedCalled: this.loadAllCompletedCalled,
            renderProps: this.lastRenderProps,
            renderActions: this.lastRenderActions,
            loadDataCount: this.loadDataCount,
            events: this.events,
        }
    }

    refreshData = () => {
        this.resetPromise()
        this.lastRenderActions.refresh()
    }

    resetPromise = () => {
        this.testDataPromise = new PromiseCompletionSource<Data>()
    }

    unmount = async () => {
        this.root.unmount()

        return new Promise(resolve => setTimeout(resolve))
    }
}
