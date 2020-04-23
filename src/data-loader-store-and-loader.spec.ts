import { DataLoaderStoreAndLoader } from './data-loader-store-and-loader'
import { LoaderStatus, LoaderState } from './data-loader-state'
import { PromiseCompletionSource } from 'promise-completion-source'
import hashSum from 'hash-sum'

// These are internal tests, if implementation changes they can be deleted

describe('get data loader state for asynchronous data load', () => {
    const dataLoaderOneId = '1'
    const registeredResourceType = 'data'
    let promiseCompletionSource: Array<PromiseCompletionSource<number>>
    let events: any[]
    let loader: DataLoaderStoreAndLoader
    let state: LoaderState<any>

    beforeEach(() => {
        promiseCompletionSource = []
        events = []
        loader = new DataLoaderStoreAndLoader(
            (event) => {
                events.push(event)
            },
            undefined,
            () => {
                const pcs = new PromiseCompletionSource<number>()
                promiseCompletionSource.push(pcs)
                return pcs.promise
            },
            hashSum,
            false,
        )
        state = loader.getDataLoaderState(
            dataLoaderOneId,
            registeredResourceType,
            { id: 1 },
            undefined,
        )
    })

    describe('when not mounted yet', () => {
        it('triggers data loading once', () => {
            expect(promiseCompletionSource.length).toBe(1)
            expect(state.status).toBe(LoaderStatus.Fetching)
        })

        it('has a successful last action of type none', () => {
            expect(state.lastAction.success).toBe(true)
            expect(state.lastAction.type).toBe('none')
        })

        it('raises begin data loading event', () => {
            expect(events).toEqual([
                expect.objectContaining({ type: 'state-changed' }),
                expect.objectContaining({ type: 'state-changed' }),
                expect.objectContaining({ type: 'begin-loading-event' }),
            ])
        })
    })

    describe('when data loads between inital render and mount', () => {
        let updateCalled = 0

        it('it calls update on mount', async () => {
            promiseCompletionSource[0].resolve(0)
            await clearEventLoop()
            loader.attach(dataLoaderOneId, registeredResourceType, { id: 1 }, () => updateCalled++)

            expect(updateCalled).toBe(1)
        })
    })

    describe('when data loader mounted', () => {
        let updateCalled = 0
        beforeEach(() => {
            loader.attach(dataLoaderOneId, registeredResourceType, { id: 1 }, () => updateCalled++)
        })

        it('update should not be called', () => {
            expect(updateCalled).toBe(0)
        })

        it('calls update when data loads', async () => {
            promiseCompletionSource[0].resolve(0)
            await clearEventLoop()

            expect(updateCalled).toBe(1)
        })

        describe('then unmounts', () => {
            beforeEach(() => {
                loader.detach(dataLoaderOneId, registeredResourceType, { id: 1 })
            })

            it('should remove the state', () => {
                expect(events[events.length - 1]).toEqual({
                    type: 'state-changed',
                    state: {},
                })
            })
        })

        describe('and data finished loading', () => {
            beforeEach(async () => {
                promiseCompletionSource[0].resolve(42)
                await clearEventLoop()
                state = loader.getDataLoaderState(
                    dataLoaderOneId,
                    registeredResourceType,
                    {
                        id: 1,
                    },
                    undefined,
                )
            })

            it('is in an idle state', () => {
                expect(state.status).toBe(LoaderStatus.Idle)
            })

            it('has the resolved result', () => {
                expect(state.data.hasData).toBe(true)
                if (state.data.hasData) {
                    expect(state.data.result).toBe(42)
                }
            })

            it('raises end and completed events', () => {
                expect(events).toEqual([
                    expect.objectContaining({ type: 'state-changed' }),
                    expect.objectContaining({ type: 'state-changed' }),
                    expect.objectContaining({ type: 'begin-loading-event' }),
                    expect.objectContaining({ type: 'state-changed' }),
                    expect.objectContaining({ type: 'end-loading-event' }),
                    expect.objectContaining({ type: 'data-load-completed' }),
                ])
            })

            describe('then refreshes data', () => {
                beforeEach(async () => {
                    loader.getDataLoaderState(
                        dataLoaderOneId,
                        registeredResourceType,
                        { id: 1 },
                        true,
                        true,
                    )
                    await clearEventLoop()
                    state = loader.getDataLoaderState(
                        dataLoaderOneId,
                        registeredResourceType,
                        {
                            id: 1,
                        },
                        undefined,
                    )
                })

                it('is in an fetching state', () => {
                    expect(state.status).toBe(LoaderStatus.Fetching)
                })

                it('it still has data', () => {
                    expect(state.data.hasData).toBe(true)
                    if (state.data.hasData) {
                        expect(state.data.result).toBe(42)
                    }
                })

                it('raises end and completed events', () => {
                    expect(events).toEqual([
                        expect.objectContaining({ type: 'state-changed' }),
                        expect.objectContaining({ type: 'state-changed' }),
                        expect.objectContaining({ type: 'begin-loading-event' }),
                        expect.objectContaining({ type: 'state-changed' }),
                        expect.objectContaining({ type: 'end-loading-event' }),
                        expect.objectContaining({ type: 'data-load-completed' }),
                        expect.objectContaining({ type: 'state-changed' }),
                        expect.objectContaining({ type: 'begin-loading-event' }),
                    ])
                })
            })
        })

        describe('and data load failed', () => {
            beforeEach(async () => {
                promiseCompletionSource[0].reject(new Error('async boom'))
                await clearEventLoop()
                state = loader.getDataLoaderState(
                    dataLoaderOneId,
                    registeredResourceType,
                    {
                        id: 1,
                    },
                    undefined,
                )
            })

            it('is in an idle state', () => {
                expect(state.status).toBe(LoaderStatus.Idle)
            })

            it("it's last action failed", () => {
                expect(state.lastAction.success).toBe(false)
                if (!state.lastAction.success) {
                    const err = state.lastAction.error
                    expect(() => {
                        throw err
                    }).toThrowError('async boom')
                }
            })

            it('raises end and completed events', () => {
                expect(events).toEqual([
                    expect.objectContaining({ type: 'state-changed' }),
                    expect.objectContaining({ type: 'state-changed' }),
                    expect.objectContaining({ type: 'begin-loading-event' }),
                    expect.objectContaining({ type: 'state-changed' }),
                    expect.objectContaining({ type: 'load-error' }),
                    expect.objectContaining({ type: 'end-loading-event' }),
                    expect.objectContaining({ type: 'data-load-completed' }),
                ])
            })
        })
    })

    describe('when data loader unmounts before data finishes loading', () => {
        beforeEach(() => {
            loader.detach(dataLoaderOneId, registeredResourceType, { id: 1 })
        })

        it('should remove the state', () => {
            expect(events[events.length - 1]).toEqual({
                type: 'state-changed',
                state: {},
            })
        })

        it('should raise a state change events', () => {
            expect(events).toEqual([
                expect.objectContaining({ type: 'state-changed' }),
                expect.objectContaining({ type: 'state-changed' }),
                expect.objectContaining({ type: 'begin-loading-event' }),
                expect.objectContaining({ type: 'state-changed' }),
            ])
        })

        describe('then data finishes loading', () => {
            beforeEach(() => {
                promiseCompletionSource[0].resolve(0)
            })

            it('should raise data load complete events without state changed event', () => {
                expect(events).toEqual([
                    expect.objectContaining({ type: 'state-changed' }),
                    expect.objectContaining({ type: 'state-changed' }),
                    expect.objectContaining({ type: 'begin-loading-event' }),
                    expect.objectContaining({ type: 'state-changed' }),
                    expect.objectContaining({ type: 'end-loading-event' }),
                    expect.objectContaining({ type: 'data-load-completed' }),
                ])
            })
        })
    })
})

describe('get data loader state for synchronous data load', () => {
    const dataLoaderOneId = '1'
    const registeredResourceType = 'data'
    let events: any[]
    let loader: DataLoaderStoreAndLoader
    let state: LoaderState<any>

    describe('and data load will be successful', () => {
        beforeEach(() => {
            events = []
            loader = new DataLoaderStoreAndLoader(
                (event) => {
                    events.push(event)
                },
                undefined,
                () => {
                    return 42
                },
                hashSum,
                false,
            )
            state = loader.getDataLoaderState(
                dataLoaderOneId,
                registeredResourceType,
                { id: 1 },
                undefined,
            )
        })

        describe('when not mounted yet', () => {
            it('enters a Idle state immediately', () => {
                expect(state.status).toBe(LoaderStatus.Idle)
                expect(state.data.hasData).toBe(true)
                if (state.data.hasData) {
                    expect(state.data.result).toBe(42)
                }
            })

            it('has a successful last action', () => {
                expect(state.lastAction.success).toBe(true)
                expect(state.lastAction.type).toBe('fetch')
            })

            it('raises state changed event', () => {
                expect(events).toEqual([
                    expect.objectContaining({ type: 'state-changed' }),
                    expect.objectContaining({ type: 'state-changed' }),
                ])
            })
        })
    })

    describe('and data load will fail', () => {
        beforeEach(() => {
            events = []
            loader = new DataLoaderStoreAndLoader(
                (event) => {
                    events.push(event)
                },
                undefined,
                () => {
                    throw new Error('sync data load fail')
                },
                hashSum,
                false,
            )
            state = loader.getDataLoaderState(
                dataLoaderOneId,
                registeredResourceType,
                { id: 1 },
                undefined,
            )
        })

        it('enters a Idle state immediately', () => {
            expect(state.status).toBe(LoaderStatus.Idle)
            expect(state.data.hasData).toBe(false)
        })

        it('has a failed last action', () => {
            expect(state.lastAction.success).toBe(false)
            expect(state.lastAction.type).toBe('fetch')
            if (!state.lastAction.success) {
                expect(state.lastAction.error).toMatchObject({
                    message: 'sync data load fail',
                })
            }
        })

        it('raises state changed event', () => {
            expect(events).toEqual([
                expect.objectContaining({ type: 'state-changed' }),
                expect.objectContaining({ type: 'state-changed' }),
            ])
        })
    })
})

function clearEventLoop() {
    return new Promise((resolve) => setTimeout(resolve, 1))
}
