import { relatedArticleSlugs, selectRelatedArticles } from './related-articles'
import { articleCardSelect } from './list-projections'
import 'server-only'
import { cache } from 'react'
import { cms } from './data'
import { publicContentCache } from './public-content-cache'

export const publicPage = cache(async (slug: string) => {
 const payload = await cms()
 return publicContentCache.get('page:' + slug, async () =>
  (await payload.find({ collection: 'pages', overrideAccess: false, user: null,
   where: { slug: { equals: slug } }, limit: 1 })).docs[0] || null)
})

export const publicArticles = cache(async (page: number, excludeID?: number, limit = excludeID === undefined ? 6 : 3) => {
 const payload = await cms()
 return publicContentCache.get(JSON.stringify(['articles', page, excludeID ?? null, limit]), () =>
  payload.find({ collection: 'pages', overrideAccess: false, user: null,
   where: { and: [{ kind: { equals: 'article' } }, ...(excludeID === undefined ? [] : [{ id: { not_equals: excludeID } }])] },
   select: articleCardSelect, depth: 1, sort: '-publishedAt', limit, page }))
})

export const publicRelatedArticles = cache(async (slug: string, excludeID: number) => {
 const payload = await cms()
 return publicContentCache.get(JSON.stringify(['related-articles', slug, excludeID]), async () => {
  const slugs = relatedArticleSlugs(slug)
  const candidates = slugs.length ? (await payload.find({
   collection: 'pages', overrideAccess: false, user: null,
   where: { and: [
    { kind: { equals: 'article' } },
    { id: { not_equals: excludeID } },
    { slug: { in: slugs } },
   ] },
   select: articleCardSelect, depth: 1, limit: slugs.length, pagination: false,
  })).docs : []
  const related = selectRelatedArticles(slug, candidates)
  if (related.length === 3) return related
  // Up to two topic cards may also occur in the newest list; fetch enough to
  // fill all three slots after deduplication, without loading article bodies.
  const fallback = (await publicArticles(1, excludeID, 5)).docs
  return selectRelatedArticles(slug, candidates, fallback)
 })
})
