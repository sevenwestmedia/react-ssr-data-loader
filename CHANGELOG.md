# react-ssr-data-loader

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
