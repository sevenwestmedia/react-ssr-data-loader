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
    loadAllCompletedCalled = 0
    loadDataCount = 0
    renderCount = 0
    /** Used instead of the promise to trigger sync data load */
    testDataResult?: Data
    testDataPromise: PromiseCompletionSource<Data>
    root: ReactWrapper<{ resourceId: string }, any>
    component: ReactWrapper<Props<Data, any>, any>
    resources: DataLoaderResources<any>
    currentState: DataLoaderState | undefined
    lastRenderProps!: LoaderState<Data>
    lastRenderActions!: UserActions<any>
    events: any[] = []

    constructor(
        initialState: DataLoaderState | undefined,
        initialId: string,
        options: FixtureOptions<Data>
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
            }
        )

        const TestComponent: React.SFC<{ id: string }> = ({ id }) => (
            <DataLoaderProvider
                initialState={initialState}
                isServerSideRender={options.isServerSideRender}
                resources={this.resources}
                // tslint:disable-next-line:jsx-no-lambda
                onEvent={event => {
                    this.events.push(event)
                    if (options.onEvent) {
                        options.onEvent(event)
                    }
                    if (event.type === 'data-load-completed') {
                        this.loadAllCompletedCalled++
                    } else if (event.type === 'state-changed') {
                        this.currentState = event.state
                    }
                }}
            >
                <TestDataLoader
                    id={id}
                    clientLoadOnly={options.clientLoadOnly}
                    // tslint:disable-next-line:jsx-no-lambda
                    renderData={(props, actions) => {
                        this.renderCount++
                        this.lastRenderProps = props
                        this.lastRenderActions = actions
                        return null
                    }}
                />
            </DataLoaderProvider>
        )

        this.root = mount(<TestComponent id={initialId} />)

        this.component = this.root.find(TestDataLoader)
    }

    assertState() {
        expect({
            renderCount: this.renderCount,
            loadAllCompletedCalled: this.loadAllCompletedCalled,
            renderProps: this.lastRenderProps,
            renderActions: this.lastRenderActions,
            loadDataCount: this.loadDataCount,
            events: this.events
        }).toMatchSnapshot()
    }

    refreshData() {
        this.resetPromise()
        this.lastRenderActions.refresh()
    }

    resetPromise() {
        this.testDataPromise = new PromiseCompletionSource<Data>()
    }

    unmount = async () => {
        this.root.unmount()

        return new Promise(resolve => setTimeout(resolve))
    }
}
