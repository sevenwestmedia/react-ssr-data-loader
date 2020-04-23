export function processEventLoop(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1))
}
