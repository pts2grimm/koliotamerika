import { after } from 'next/server'
import { publicContentCache } from './public-content-cache'

export function invalidatePublicContent() {
 // Payload afterChange runs before its transaction commits. Invalidate after the
 // HTTP response so a concurrent reader cannot refill from the uncommitted state.
 try { after(() => publicContentCache.clear()) }
 catch {
  // Import/CLI jobs have no Next request context. They use their own process;
  // a running server still observes changes within the hard 30-second expiry.
  publicContentCache.clear()
 }
}
