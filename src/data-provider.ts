import * as React from 'react'
import { Dispatch } from 'redux'
import { connect } from 'react-redux'
import {
    ReduxStoreState, DataTypeMap, LoaderDataState,
    LOAD_DATA, LOAD_DATA_FAILED, LOAD_DATA_COMPLETED,
    UNLOAD_DATA, LOAD_NEXT_DATA, ATTACH_TO_DATA,
    DETACH_FROM_DATA
} from './data-loader.redux'

export interface Props {

}
export interface State {

}

export interface MetaData {
    dataType: string
    dataKey: string
    dataFromServerSideRender: boolean
}
export class DataLoaderContext {
    constructor(private dispatch: Dispatch<ReduxStoreState>) {
    }
    attachToData(metadata: MetaData) {
        this.dispatch<ATTACH_TO_DATA>({
            type: ATTACH_TO_DATA,
            meta: metadata,
        })
    }

    subscribe() {

    }
}

class DataProvider extends React.Component<Props, State> {
    static childContextTypes = {
        dataLoader: React.PropTypes.object
    }

    private dataLoader: DataLoaderContext

    constructor(props) {
        super(props)

        this.dataLoader = new DataLoaderContext()
    }

    getChildContext = () => {

    }

    render() {
        return React.Children.only(this.props.children)
    }
}

export default connect<MappedProps, {}, {}>(
    (state: ReduxStoreState) => ({ store: state.dataLoader })
)(DataProvider)
