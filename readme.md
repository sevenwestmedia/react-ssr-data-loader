# React-Redux Data Loader
Redux is great for storing data which lives for the lifetime of the application but falls down 
when the site is page based and redux is being used to transfer data for server side renders.

This component is a child as function component which takes care of correctly loading data, including:

 - Ensuring data is not loaded again directly after server side rendering
 - Removing the data from Redux once the component is unmounted
 - Track loading states so you can focus on rendering based on the status
 - Refreshing data
 - Paging data

## Notes
* Data loading arguments are not taken into account when checking to see if the data is already loaded
    * This means if you use two data loaders with the same type and key but different arguments the second data loader will still use the data from the first.
    * This will change in a future version

## Usage
The samples below are for TypeScript

First you need a data provider at the top level

``` tsx
import { DataLoaderResources, DataProvider } from 'redux-data-loader'

// Initialise the resources, you pass this to the DataProvider
const resources = new DataLoaderResources()

// Step 1, register a resource, this will return you a data loader React Component
export const TestDataLoader = this.resources.registerResource(
    'testDataType',
    (dataKey: string) => Promise.resolve(['data']
)

const Root: React.SFC<{ dataKey: string }> = ({ dataKey }) => (
    <DataProvider resources={this.resources}>
        <App />
    </DataProvider>
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

### Transferring data from server to client
In server side rendering scenarios you need to transfer the loaded state to the client

You can do this with a similar approach to when using Redux.

``` tsx
// On server
let state: any

const Root: React.SFC<{ dataKey: string }> = ({ dataKey }) => (
    <DataProvider resources={this.resources} stateChanged={s => state = s}>
        <App />
    </DataProvider>
)

// Serialise state to global in your HTML response

/// On Client
const Root: React.SFC<{ dataKey: string }> = ({ dataKey }) => (
    <DataProvider resources={this.resources} initialState={DATA_LOADER_INITIAL_STATE}>
        <App />
    </DataProvider>
)
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

### How it works
When you register `resources` they return a DataLoader, a fully type-safe React component which allows you to get at that data type.

Multiple of these DataLoaders can be used in a single page, they will take care of only fetching that resource once and sharing the data between the data-loaders.

The `DataProvider` is the component which is responsible for actually fetching the data, when `DataLoader`s are mounted the register themselves with the data provider so it can notify them when any data relevent to them is updated. This means DataLoaders only re-render themselves when the data they are interested in is updated.

### TODOS
 - Error handling hooks
 - Gracefully handle if no data loader keys are present

### Things to consider/discuss
 - Should renderProps/actions be the same object?
    - If so, how do we ensure shallow compare works on state?
 - Should we version the state, making it easy to shallow compare/give react hints