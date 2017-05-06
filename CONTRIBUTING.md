## Contributing
### Architecture
The data loader has 3 main components
 - the resource object which allows you to register new resources.
 - the data provider, it stores the loaded state and is responsible for loading data
 - the data loaders, returned when you register a resource. This is a component tied to Reacts lifecycle and calls you back when you need to re-render.

#### Resources
The DataLoaderResources class is the entry point to the library, when you register a resource you can optionally provide additional parameters which will be collected from the data-loader as React props and passed to your load resource function whenever data needs to be loaded.

You can also register paged resources, they can also take additional parameters.

When you register a resource a Data Loader will be returned, this is a React component which allows you to access data anywhere in your application.

**NOTE** Data loaders are designed to share data from the same resource if the ID matches. Parameters are not taken into account for performance and simplicity reasons, if this feature is required you need to change the ID based on the parameters so it is treated as different data.

### Data provider
The data provider can be initialised with data from a server side render or persistent storage, data loaders communicate with the provider whenever they need data, or their props change and in turn the data provider lets the loader know when any state or data related to it's resource has changed.

The data provider must not use React state to store any of it's state, it uses a reducer pattern internally to produce new state when anything happens. The new state must be immediately accessible from other data loaders otherwise additional renders may be required and the state of the application may not match what it should be.

### Data loader
The data loader is tightly tied to Reacts lifecycle, it tries to minimise renders of your components by being a pure component and only calling the renderData callback when state has changed.