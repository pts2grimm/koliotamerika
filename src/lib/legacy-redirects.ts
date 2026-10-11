import redirects from '../../content/legacy-redirects.json'
import { blogPath } from './blog-seo'
export function legacyRedirect(path: string): string | undefined {
 const normalized = path.replace(/\/$/, '')
 const target = (redirects as Record<string, string>)[normalized]
 if (target) return target
 const pagination = /^\/blog\/page\/([1-9]\d*)$/.exec(normalized)
 if (pagination && Number.isSafeInteger(Number(pagination[1]))) return blogPath(Number(pagination[1]))
}
