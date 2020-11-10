# react-ssr-data-loader

## 2.0.0-next.4

### Patch Changes

-   6b228ea: Fixed possible error when a data loader is unmounted while a new data loader is still mounting which has the same data loader params

## 2.0.0-next.3

### Patch Changes

-   ac0db16: Upgrade dependencies

## 2.0.0-next.2

### Patch Changes

-   8e5f9c4: Fixed peerDependency versions

## 2.0.0-next.1

### Patch Changes

-   8707912: Upgraded dependencies

## 2.0.0-next.0

### Major Changes

-   576e31d: Converted usage from component with render prop to react hook

    ### Migration

    #### Before

    ```ts
    const TestDataLoader = this.resources.registerResource<DataResource, { id: string }>(
        'testDataType',
        () => loadData(),
    )
    ```

    #### After

    ```ts
    const useDataLoader = this.resources.registerResource<Data, { id: string }>(
        'testDataType',
        () => loadData(),
    )
    ```
