---
'react-ssr-data-loader': major
---

Converted usage from component with render prop to react hook

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
const useDataLoader = this.resources.registerResource<Data, { id: string }>('testDataType', () =>
    loadData(),
)
```
