/** Cheap rejection of paths this Next/Payload application never serves.
 * No User-Agent allowlist: a crawler name alone does not establish identity.
 * Keep migrated /wp-content/uploads assets and sitemap redirects accessible.
 */
export function blockedProbePath(pathname: string) {
  let path: string
  try { path = decodeURIComponent(pathname).toLowerCase() } catch { return true }
  return /(?:^|\/)\.(?:env(?:\.[^/]*)?|git|svn|hg)(?:\/|$)/.test(path)
    || /^\/(?:wp-admin|wp-includes|cgi-bin|phpmyadmin)(?:\/|$)/.test(path)
    || /\.(?:php|asp|aspx)(?:\/|$)/.test(path)
}
