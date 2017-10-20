# CHANGELOG

## vNext

- `data-provider.ts`
    - simplify error message as full error details are now provided to consumers
- `data-loader-reducer.ts`
    - don't decrement loadingCount on LOAD_DATA_FAILED, this occurs on LOAD_DATA_COMPLETED