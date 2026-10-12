type IndexingOptions = { siteURL: string; indexable?: string; preview?: string }

/** Unknown hosts and temporary hosting addresses must never become indexed aliases. */
export function canIndexHost(host: string | null, options: IndexingOptions): boolean {
 if (options.preview === 'true' || options.indexable !== 'true' || !host) return false
 try {
  const canonical = new URL(options.siteURL)
  const requested = new URL('https://' + host)
  if (!['http:', 'https:'].includes(canonical.protocol)) return false
  if (requested.pathname !== '/' || requested.search || requested.hash || requested.username || requested.password) return false
  const temporary = (name: string) => name === 'hostingersite.com' || name.endsWith('.hostingersite.com')
  return !temporary(canonical.hostname) && !temporary(requested.hostname) && requested.host === canonical.host
 } catch { return false }
}

export function requestIsIndexable(host: string | null): boolean {
 return canIndexHost(host, { siteURL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
  indexable: process.env.SITE_INDEXABLE, preview: process.env.PREVIEW_MODE })
}
