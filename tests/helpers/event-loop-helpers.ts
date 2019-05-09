export function processEventLoop() {
    return new Promise(resolve => setTimeout(resolve, 1))
}
