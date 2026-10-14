import { createExpiringCache } from './expiring-cache'

// Only anonymous CMS content enters this cache. A shared process symbol also
// joins Next's separate route bundles; no credentials or request objects are stored.
const key = Symbol.for('koa.public-content-cache.v1')
const scope = globalThis as typeof globalThis & { [key: symbol]: ReturnType<typeof createExpiringCache> | undefined }
export const publicContentCache = scope[key] ||= createExpiringCache({ ttl: 30_000, limit: 256 })
