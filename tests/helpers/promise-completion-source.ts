export default class PromiseCompletionSource<T> {
    promise: Promise<T>
    resolve: (result: T) => Promise<void>
    reject: (error: Error) => Promise<void>

    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = (result) => {
                resolve(result)
                return new Promise<void>(r => setTimeout(r))
            }
            this.reject = (error) => {
                reject(error)
                // We want to resolve this promise
                // because we are using this to know when callbacks are resolved
                // not get the error, you can await pcs.promise to get error
                return new Promise<void>(r => setTimeout(r))
            }
        })
    }
}
