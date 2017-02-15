import * as React from 'react'
import { Data } from './test-data'
import { LoadedState } from '../../src/data-loader'

const Verifier: React.SFC<LoadedState<Data> & {
    renderCount: number
}> = (loadedState) => (<noscript />)

export default Verifier
