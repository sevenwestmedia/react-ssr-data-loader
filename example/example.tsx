import React from 'react'
import { DataLoaderResources, DataProvider, DataLoaderState,  } from '../src'

const resources = new DataLoaderResources()

interface Blog {
    id: string

    heading: string

    /** Array of paragraphs */
    content: string[]
}
interface BlogLoadArguments {
    id: string
}

const BlogDataLoader = resources.registerResource<Blog, BlogLoadArguments>('blog', ({ id }) =>
    fetch(`/api/${id}`).then(res => res.json()),
)

const rendered = (
    <BlogDataLoader
        id={'123'}
        renderData={params => {
            if (!params.lastAction.success) {
                params.lastAction.error
            }
            if (params.data.hasData) {
                params.data.result
            }
        }}
    />
)

const provider = (
    <DataProvider
        isServerSideRender={true}
        resources={resources}
        onEvent={event => {
            if (event.type === 'begin-loading-event') {
                // A data load event has been triggered
            }
            if (event.type === 'data-load-completed') {
                // Data loading done
            }

            if (event.type === 'state-changed') {
                if (event.state
            }
        }}
    />
)
