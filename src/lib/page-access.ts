import type { Access, Where } from 'payload'
export function publicPagesWhere(now = new Date()): Where {
  return { and: [
    { status: { equals: 'published' } },
    { or: [
      { kind: { not_equals: 'article' } },
      { publishedAt: { exists: false } },
      { publishedAt: { less_than_equal: now.toISOString() } },
    ] },
  ] }
}
// Apply release time to REST, individual pages, blog lists and sitemap.
export const publishedPages: Access = ({ req }) =>
  req.user?.collection === 'users' ? true : publicPagesWhere()
