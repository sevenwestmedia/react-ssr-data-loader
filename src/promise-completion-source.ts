export default class PromiseCompletionSource<T> {
    promise: Promise<T>
    resolve: (result: T) => void
    reject: (error: Error) => void

    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve
            this.reject = reject
        })
    }
}
