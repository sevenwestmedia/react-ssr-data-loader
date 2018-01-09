# CHANGELOG

## vNext

- `data-provider.ts`
    - simplify error message as full error details are now provided to consumers
    - pass through original error un modified
- `data-loader-reducer.ts`
    - don't decrement loadingCount on LOAD_DATA_FAILED, this occurs on LOAD_DATA_COMPLETED
- Fixed issue where data loader can throw when there are over 3 data loaders connecting to the same data on unmount

