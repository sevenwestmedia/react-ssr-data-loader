# React SSR Data Loader

​​This library will help with declarative data loading in React - with full server side rendering support!

## Why?

When you need to load data on the server, transfer it to the client and hydrate it Server Side Rendering becomes a lot more difficult. Many libraries which currently solve this problem are all in (e.g. Next.JS). Our goal was to make a standalone solution that can be dropped into an existing project.

## Getting started

These steps show how you would load a blog post using the data loader.

### 1. Create a `DataLoaderResources`

```ts
import { DataLoaderResources } from 'react-ssr-data-loader'

const resources = new DataLoaderResources()
```

This is the entry point to the library, you can register `resources` (types of data you want to load).

### 2. Register a resource

```ts
// TypeScript

interface Blog {
    id: string

    heading: string

    /** Array of paragraphs */
    content: string[]
}
interface BlogLoadArguments {
    id: string
}

/** Register the resource **/
// Generic arguments are specifying the data type & the load arguments
// The function parameters are the resource type (should be unique for each resource), and a function to load the data
const BlogDataLoader = resources.registerResource<Blog, BlogLoadArguments>('blog', ({ id }) => {
    // Should do error handling etc here
    return fetch(`/api/${id}`)
        .then(checkStatus)
        .then(res => res.json())
})

// JavaScript
const BlogDataLoader = resources.registerResource('blog', ({ id }) =>
    fetch(`/api/${id}`)
        .then(checkStatus)
        .then(res => res.json()),
)
```

### 3. Use the Data loader component

```tsx
import { DataProvider } from 'react-ssr-data-loader'

// Wrap your application in a DataProvider, passing your resources
<DataProvider resources={resources}>

    {/* Example using React router (this is optional, this library is independent) */}
    <Route
        path="/blog/:id"
        component={BlogPage}
    />

</DataProvider>

const BlogPage: React.FC =({ match }) => (
    // The BlogDataLoader props are BlogLoadArguments + a `renderData` function
    <BlogDataLoader
        id={match.params.id}
        renderData={(params) => {
            // Handle rendering failure
            if (!params.lastAction.success) {
                console.log('Failed to load blog', params.lastAction.error)

                return <p>Failed to load</p>
            }

            if (params.data.hasData) {
                // params.data.result is type 'Blog'
                <BlogArticle blog={params.data.result} />
            }

            return <p>Loading...</p>
        }
    />
)
```

That's it, the data loader will take care of loading the data when the params change automatically.

## Server side rendering

To enable server side rendering there are a few components. The implementation will change depending on how you are doing your server side rendering, the data loader exposes events to enable it to work with most other libraries.

### 1. Tracking data loads

This is just one way you could do this, but this approach has worked pretty well for us.

```tsx
import serializeJavaScript from 'serialize-javascript'
import { PromiseCompletionSource } from 'promise-completion-source'
import { DataProvider, DataLoaderState } from 'react-ssr-data-loader'

// This object contains a promise, and ways to trigger completion.
const promiseCompletionSource = new PromiseCompletionSource()
let loadTriggered = false
let state: DataLoaderState | undefined

let rendered = ReactDOMServer.renderToString(
    <DataProvider
        isServerSideRender={true}
        resources={resources}
        onEvent={event => {
            if (event.type === 'begin-loading-event') {
                // A data load event has been triggered
                loadTriggered = true
            }
            if (event.type === 'data-load-completed') {
                // Data loading done, complete the promise
                promiseCompletionSource.resolve()
            }

            // Whenever the internal data loader state changes,
            // capture it, you will need it later (it contains your data!)
            if (event.type === 'state-changed') {
                state = event.state
            }
        }}
    >
        <App />
    </DataProvider>,
)

if (loadTriggered) {
    // Await the promise, it will wait until data loading has completed
    await promiseCompletionSource.promise

    // now all the data has been loaded, just render again
    rendered = ReactDOMServer.renderToString(
        <DataProvider
            // Remember to pass the data from the first render/data load
            initialState={state}
            isServerSideRender={true}
            resources={resources}
        >
            <App />
        </DataProvider>,
    )
}

// Return the rendered result and the loaded server state to the client
// This example doesn't include wrapping the rendered markup with the full index.html

// NOTE: we are using the serialiseJavascript library, because it handles a bunch of scenarios JSON.stringify doesn't
res.send(`
<script>window.INITIAL_STATE = ${serializeJavascript(state)}</script>
<div id="root">${rendered}</div>
`)
```

### 2. Hydrate on the client

The hard part is done, to hydrate on the client we just pass the INITIAL_STATE to the DataProvider

```tsx
import { DataProvider } from 'react-ssr-data-loader'

React.hydrate(
    <DataProvider resources={resources} initialState={window.INITIAL_STATE}>
        <App />
    </DataProvider>,
    document.getElementById('root'),
)
```

This will hydrate your app with all the data that was loaded on the server into the client.

### How it works

When you register `resources` they return a DataLoader, a fully type-safe React component which allows you to get at that data type.

You can load multiple DataLoaders in a single page. Each `DataLoader` will fetch the resource once, sharing the data between data-loaders when the parameters match.

​​The `DataProvider` component is responsible for fetching the data. When `DataLoader`s are mounted they register with the data provider so it can notify the `DataLoader`s when any relevant data is updated. This means DataLoaders only re-render when the data they are interested in is updated.

### Params hashing

Behind the scenes the data loader uses a library called `hash-sum` to create hashes of the parameter object. You can control which of the data loader params are taken into account by specifying the cache keys (similar to React hooks).

You can override the hashing function on the DataProvider if you have issues with the inbuilt library.

## More info

### General approaches to data loading in SSR

There are two main approaches for loading data with server side rendering

1. Walk the React component tree and allow components to statically declare what data they need. The server can then load the data before rendering. This approach is not really idiomatic React because it breaks encapsulation
2. Perform the SSR, then track any data loading requests which are triggered. Once complete, do another SSR with the data loaded.
