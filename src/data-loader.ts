import * as React from 'react'
import { Dispatch } from 'redux'
import { connect } from 'react-redux'
import {
    ReduxStoreState, DataTypeMap, LoaderDataState,
    LOAD_DATA, LOAD_DATA_FAILED, LOAD_DATA_COMPLETED,
    UNLOAD_DATA, LOAD_NEXT_DATA, ATTACH_TO_DATA,
    DETACH_FROM_DATA
} from './data-loader.redux'

export interface SuccessLoadedState<T> {
    isCompleted: true
    isLoaded: true
    isLoading: false
    isError: false
    data: T
}
export interface ErrorLoadedState {
    isCompleted: true
    isLoaded: false
    isLoading: false
    isError: true
    errorMessage: string
}
export interface BeforeLoadingState {
    isCompleted: false
    isLoaded: false
    isLoading: false
    isError: false
}
export interface LoadingState {
    isCompleted: false
    isLoaded: false
    isLoading: true
    isError: false
}

export type LoadedState<T> = SuccessLoadedState<T> | BeforeLoadingState| ErrorLoadedState | LoadingState

export interface RenderData<T> {
    (loaderProps: LoadedState<T>): React.ReactElement<any> | null
}
export interface OwnProps<T> {
    dataType: string
    dataKey: string
    loadData: () => Promise<T>
    clientLoadOnly?: boolean
    isServerSideRender: boolean
    renderData: RenderData<T>
}

export interface MappedProps {
    store: DataTypeMap
}
export interface DispatchProps {
    dispatch: Dispatch<ReduxStoreState>
}
export interface Props<T> extends OwnProps<T>, MappedProps, DispatchProps { }

const ssrNeedsData = (state: LoaderDataState) => !state || (!state.completed && !state.loading)
const hasValidData = (state: LoaderDataState) => (
    state && state.completed && !state.failed && (
        state.dataFromServerSideRender || state.attachedComponents > 0
    )
)

export class DataLoader<T> extends React.PureComponent<Props<T>, {}> {
    private _isMounted: boolean

    async componentWillMount(): Promise<void> {
        this._isMounted = true
        const loadedState = this.getLoadedState()

        if (this.props.isServerSideRender && ssrNeedsData(loadedState)) {
            return await this.loadData()
        }
        if (!this.props.isServerSideRender) {
            if (hasValidData(loadedState)) {
                this.props.dispatch<ATTACH_TO_DATA>({
                    type: ATTACH_TO_DATA,
                    meta: this.actionMeta(),
                })
            } else {
                return await this.loadData()
            }
        }
    }

    async componentWillReceiveProps(nextProps: Props<T>) {
        if (
            this.props.dataType !== nextProps.dataType ||
            this.props.dataKey !== nextProps.dataKey ||
            this.props.isServerSideRender !== nextProps.isServerSideRender
        ) {
            this.props.dispatch<LOAD_NEXT_DATA>({
                type: LOAD_NEXT_DATA,
                meta: {
                    current: this.actionMeta(),
                    next: this.actionMeta(nextProps)
                }
            })

            await this.performLoadData()
        }
    }

    componentWillUnmount() {
        this._isMounted = false
        const loadedState = this.getLoadedState()
        if (loadedState.attachedComponents > 1) {
            this.props.dispatch<DETACH_FROM_DATA>({
                type: DETACH_FROM_DATA,
                meta: this.actionMeta(),
            })
        } else {
            this.props.dispatch<UNLOAD_DATA>({
                type: UNLOAD_DATA,
                meta: this.actionMeta(),
            })
        }
    }

    private actionMeta = (props = this.props) => ({
        dataType: props.dataType,
        dataKey: props.dataKey,
        dataFromServerSideRender: props.isServerSideRender
    })

    private loadData = async () => {
        this.props.dispatch<LOAD_DATA>({
            type: LOAD_DATA,
            meta: this.actionMeta(),
        })

        await this.performLoadData()
    }

    private performLoadData = async () => {
        try {
            const data = await this.props.loadData()
            if (!this._isMounted) {
                return
            }

            this.props.dispatch<LOAD_DATA_COMPLETED>({
                type: LOAD_DATA_COMPLETED,
                meta: this.actionMeta(),
                payload: data
            })
        } catch (err) {
            if (!this._isMounted) {
                return
            }

            let payload: string
            if (err instanceof Error) {
                payload = err.message
            } else {
                payload = err ? err.toString() : ''
            }

            this.props.dispatch<LOAD_DATA_FAILED>({
                type: LOAD_DATA_FAILED,
                meta: this.actionMeta(),
                payload: payload
            })
        }
    }

    private getLoadedState = (): LoaderDataState => {
        const dataLookup = this.props.store.data[this.props.dataType]
        if (!dataLookup) {
            return undefined
        }
        return dataLookup[this.props.dataKey]
    }

    private getLoadedProps = (): LoadedState<T> => {
        const loadedState = this.getLoadedState()
        if (!loadedState) {
            return undefined
        }

        if (loadedState.completed && loadedState.failed) {
            return {
                isCompleted: true,
                isLoaded: false,
                isLoading: false,
                isError: true,
                errorMessage: loadedState.error,
            }
        } 
        if (loadedState.completed && loadedState.failed === false) {
            return {
                isCompleted: true,
                isLoaded: true,
                isLoading: false,
                isError: false,
                data: loadedState.data
            }
        }
        return {
            isCompleted: false,
            isLoaded: false,
            isLoading: true,
            isError: false,
        }
    }

    render() {
        const loadedProps = this.getLoadedProps() || {
            isCompleted: false,
            isLoading: false,
            isLoaded: false,
            isError: false
        }

        return this.props.renderData(loadedProps)
    }
}

export function createTypedDataLoader<T>() {
    const ConnectedDataLoader = connect<MappedProps, {}, OwnProps<T>>(
        (state: ReduxStoreState) => ({ store: state.dataLoader })
    )(DataLoader)
    return ConnectedDataLoader
}

export default createTypedDataLoader<any>()
