// Bounded process cache with a hard expiry. Never serve stale data on refresh failure.
export function createExpiringCache({ ttl = 30_000, limit = 256, now = Date.now } = {}) {
 const entries = new Map<string, { value: unknown; expires: number }>()
 const pending = new Map<string, Promise<unknown>>()
 let generation = 0
 return {
  clear() { generation++; entries.clear(); pending.clear() },
  async get<T>(key: string, loader: () => Promise<T>): Promise<T> {
   const time = now()
   for (const [id, entry] of entries) if (entry.expires <= time) entries.delete(id)
   const entry = entries.get(key)
   if (entry) { entries.delete(key); entries.set(key, entry); return entry.value as T }
   const active = pending.get(key)
   if (active) return active as Promise<T>
   const version = generation
   const promise = Promise.resolve().then(loader)
   pending.set(key, promise)
   try {
    const value = await promise
    // Invalidation cannot be undone by an older in-flight read. Long loads do
    // not extend publication deadlines by starting a fresh TTL on completion.
    if (generation === version && now() < time + ttl) {
     entries.set(key, { value, expires: time + ttl })
     while (entries.size > limit) entries.delete(entries.keys().next().value!)
    }
    return value
   } finally {
    if (pending.get(key) === promise) pending.delete(key)
   }
  },
 }
}
