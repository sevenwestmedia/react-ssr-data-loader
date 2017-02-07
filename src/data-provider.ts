import * as React from 'react'

export interface Props {

}
export interface State {

}

class DataProvider extends React.Component<Props, State> {
    render() {
        return React.Children.only(this.props.children)
    }
}

export default DataProvider
