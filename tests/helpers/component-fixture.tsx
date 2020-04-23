import React, { useState } from 'react'
import { UserActions } from '../../src/data-loader'
import { DataProvider } from '../../src/data-provider'
import { DataLoaderResources } from '../../src/data-loader-resources'
import { LoaderState } from '../../src/data-loader-state'
import { DataProviderEvents } from '../../src/events'
import { TestDataType, resourceType } from './test-data'

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
    testDataResult?: TestDataType
    testDataPromise: PromiseCompletionSource<TestDataType>
    resources: DataLoaderResources<any>
    currentState: DataLoaderState | undefined
    lastRenderProps!: LoaderState<TestDataType>
    lastRenderActions!: UserActions<any>
    events: any[] = []

    constructor(
        initialState: DataLoaderState | undefined,
        initialId: string,
        options: FixtureOptions<TestDataType>,
    ) {
        this.currentState = initialState
        this.testDataResult = options.syncResult
        this.testDataPromise = new PromiseCompletionSource<TestDataType>()
        this.resources = new DataLoaderResources()
        const useDataLoader = this.resources.registerResource<TestDataType, { id: string }>(
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

        const TestComponent: React.FC<{}> = () => {
            const [state, setState] = useState<State>({ id: initialId })
            const { params, actions, ...props } = useDataLoader(
                { id: state.id },
                { clientLoadOnly: options.clientLoadOnly },
            )
            this.renderCount++
            this.lastRenderProps = props
            this.lastRenderActions = actions
            this.setId = (id: string) => {
                setState({
                    id,
                })
            }
            return null
        }

        this.root = mount(
            <DataProvider
                initialState={initialState}
                isServerSideRender={options.isServerSideRender}
                resources={this.resources}
                onEvent={(event) => {
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
                <TestComponent />
            </DataProvider>,
        )
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setId = (_id: string) => {}

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
        this.testDataPromise = new PromiseCompletionSource<TestDataType>()
    }

    unmount = async () => {
        this.root.unmount()

        return new Promise((resolve) => setTimeout(resolve))
    }
}
