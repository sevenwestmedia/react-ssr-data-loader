# React-Redux Data Loader
Redux is great for storing data which lives for the lifetime of the application but falls down 
when the site is page based and redux is being used to transfer data for server side renders.

This component is a child as function component which takes care of correctly loading data, including:

 - Ensuring data is not loaded again directly after server side rendering
 - Removing the data from Redux once the component is unmounted
 - Track loading states so you can focus on rendering based on the status

## Usage
The samples below are for TypeScript

``` tsx
import { reducer as dataLoader, createTypedDataLoader, ReduxStoreState } from 'redux-data-loader'

// Create redux store
const store = createStore(combineReducers<ReduxStoreState>({ dataLoader }))

// Create Typed Component (Import { DataLoader } to for untyped component)
interface Data {
    result: string
}
const TestDataLoader = createTypedDataLoader<Data>()

// Use it
<TestDataLoader
    dataType="testDataType"
    dataKey="testKey"
    isServerSideRender={isServerSideRender}
    loadData={this.loadData}
    renderData={(props) => (
        <div>
            {props.isLoading ? 'Loading...' : props.data}
        </div>
    )} />
```

### TODOS
 - Error handling hooks
 - Gracefully handle if no data loader keys are present