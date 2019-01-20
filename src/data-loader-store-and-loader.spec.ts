import { DataLoaderStoreAndLoader } from './data-loader-store-and-loader'
import { LoaderStatus, LoaderState } from './data-loader-state'
import { PromiseCompletionSource } from 'promise-completion-source'

// These are internal tests, if implementation changes they can be deleted

// tslint:disable:no-empty
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
            event => {
                events.push(event)
            },
            undefined,
            () => {
                const pcs = new PromiseCompletionSource<number>()
                promiseCompletionSource.push(pcs)
                return pcs.promise
            },
            false,
        )
        state = loader.getDataLoaderState(dataLoaderOneId, registeredResourceType, { id: 1 })
    })

    describe('when not mounted yet', () => {
        it('triggers data loading once', () => {
            expect(promiseCompletionSource.length).toBe(1)
            expect(state.status).toBe(LoaderStatus.Fetching)
        })

        it('raises begin data loading event', () => {
            expect(events).toEqual([
                expect.objectContaining({ type: 'state-changed' }),
                expect.objectContaining({ type: 'state-changed' }),
                expect.objectContaining({ type: 'begin-loading-event' }),
            ])
        })
    })

    describe('when data finishes loading', () => {
        beforeEach(() => {
            promiseCompletionSource[0].resolve(1)
            clearEventLoop()
        })

        it('is in an idle state', () => {
            expect(state.status).toBe(LoaderStatus.Fetching)
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

    beforeEach(() => {
        events = []
        loader = new DataLoaderStoreAndLoader(
            event => {
                events.push(event)
            },
            undefined,
            () => {
                return 42
            },
            false,
        )
        state = loader.getDataLoaderState(dataLoaderOneId, registeredResourceType, { id: 1 })
    })

    describe('when not mounted yet', () => {
        it('enters a loaded state immediately', () => {
            expect(state.status).toBe(LoaderStatus.Idle)
            expect(state.data.hasData).toBe(true)
            if (state.data.hasData) {
                expect(state.data.result).toBe(42)
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
    return new Promise(resolve => setTimeout(resolve, 1))
}
