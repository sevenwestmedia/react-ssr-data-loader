import * as React from 'react'
import { INIT } from './data-loader-actions'
import reducer from './data-loader-reducer'
import { DataLoaderResources } from './data-loader-resources'
import * as PropTypes from 'prop-types'
import { DataProviderEvents } from './events'
import { DataLoaderContext } from './data-loader-context'
import { DataLoaderState, ResourceLoadInfo } from './data-loader-state'

export interface Props {
    initialState?: DataLoaderState
    onEvent?: (event: DataProviderEvents) => void | Promise<any>
    isServerSideRender?: boolean
    resources: DataLoaderResources<any>
    additionalLoaderProps?: object
}

export type State = DataLoaderState

export class DataProvider extends React.Component<Props, {}> {
    static childContextTypes = {
        dataLoader: PropTypes.object
    }

    state: State = reducer(undefined, { type: INIT })
    private dataLoader: DataLoaderContext

    constructor(props: Props, context: any) {
        super(props, context)

        this.dataLoader = new DataLoaderContext(
            // tslint:disable-next-line:no-empty
            this.props.onEvent || (() => {}),
            this.props.initialState,
            this.loadData,
            this.props.isServerSideRender || false
        )
    }

    getChildContext = (): { dataLoader: DataLoaderContext } => ({ dataLoader: this.dataLoader })

    render() {
        return React.Children.only(this.props.children)
    }

    private loadData = (metadata: ResourceLoadInfo<any, any>, existingData: any): Promise<any> => {
        const dataLoader = this.props.resources.getResourceLoader(metadata.resourceType)
        if (!dataLoader) {
            return Promise.reject(`No data loader present for ${metadata.resourceType}`)
        }

        return dataLoader(
            metadata.resourceId,
            {
                ...metadata.resourceLoadParams,
                ...metadata.internalState,
                ...this.props.additionalLoaderProps
            },
            existingData
        )
    }
}
