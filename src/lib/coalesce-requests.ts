// Share in-flight work across server requests in this process. Persistent caching
// and its expiry remain the responsibility of the caller (Next's data cache).
export function createRequestCoalescer() {
 const pending = new Map<string, Promise<unknown>>()
 return function coalesce<T>(key: string, load: () => Promise<T>): Promise<T> {
  const existing = pending.get(key)
  if (existing) return existing as Promise<T>
  const promise = Promise.resolve().then(load)
  pending.set(key, promise)
  const clear = () => { if (pending.get(key) === promise) pending.delete(key) }
  // Both outcomes release the entry; a failure never becomes a cached result.
  void promise.then(clear, clear)
  return promise
 }
}
