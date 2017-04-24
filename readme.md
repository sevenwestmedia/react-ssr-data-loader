# React-Redux Data Loader
Redux is great for storing data which lives for the lifetime of the application but falls down 
when the site is page based and redux is being used to transfer data for server side renders.

This component is a child as function component which takes care of correctly loading data, including:

 - Ensuring data is not loaded again directly after server side rendering
 - Removing the data from Redux once the component is unmounted
 - Track loading states so you can focus on rendering based on the status
 - Refreshing data

## Notes
* Data loading arguments are not taken into account when checking to see if the data is already loaded
    * This means if you use two data loaders with the same type and key but different arguments the second data loader will still use the data from the first.
    * This will change in a future version
* Is currently tied to redux, in the future this will be pluggable

## Usage
The samples below are for TypeScript

First you need a data provider at the top level

``` tsx
import { reducer as dataLoader, createTypedDataLoader, ReduxStoreState, DataProvider } from 'redux-data-loder'

// Create redux store
const store = createStore(combineReducers<ReduxStoreState>({ dataLoader }))

// Initialise the resources, you pass this to the DataProvider
const resources = new DataLoaderResources()

// Step 1, register a resource, this will return you a data loader React Component
export const TestDataLoader = this.resources.registerResource(
    'testDataType',
    (dataKey: string) => Promise.resolve(['data']
)

const Root: React.SFC<{ dataKey: string }> = ({ dataKey }) => (
    <Provider store={store}>
        <DataProvider resources={this.resources}>
            <App />
        </DataProvider>
    </Provider>
)
```


``` tsx
import { TestDataLoader } from './root'

// Use it
<TestDataLoader
    dataKey={dataKey}
    clientLoadOnly={clientLoadOnly}
    renderData={(props) => {
        // Props has properties like isLoaded, isError and when loaded successfully
        // It will have the data and additional actions
    }
/>
```

### Paged data
Just register a paged resource, you will get type safety the whole way down.

To load the next page just use `props.actions.nextPage()` in the renderData callback
``` tsx
export const TestDataLoader = this.resources.registerPagedResource(
    'testDataType',
    (dataKey: string, pageNumber: number) => Promise.resolve([`page${pageNumber}`]
)
```

### TODOS
 - Error handling hooks
 - Gracefully handle if no data loader keys are present