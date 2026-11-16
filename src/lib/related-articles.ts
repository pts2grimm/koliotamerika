import groups from '../../content/article-topics.json'

// Neighbours in each editorial topic get priority. Date changes and unrelated
// new posts cannot push an older article out of its topic's incoming links.
export function relatedArticleSlugs(slug: string): string[] {
 const group = groups.find(group => group.slugs.includes(slug))
 if (!group) return []
 const index = group.slugs.indexOf(slug)
 const next = group.slugs[(index + 1) % group.slugs.length]
 const previous = group.slugs[(index + group.slugs.length - 1) % group.slugs.length]
 return [...new Set([next, previous, ...group.slugs])].filter(candidate => candidate !== slug)
}

// Both lists must already be filtered by anonymous CMS access. The manifest
// supplies ordering only; it must never manufacture a card for a missing draft.
export function selectRelatedArticles<T extends { slug: string }>(
 slug: string, candidates: T[], fallback: T[] = [], limit = 3,
): T[] {
 const bySlug = new Map(candidates.map(article => [article.slug, article]))
 const ordered = relatedArticleSlugs(slug).flatMap(candidate => {
  const article = bySlug.get(candidate)
  return article ? [article] : []
 })
 const seen = new Set([slug])
 return [...ordered, ...fallback].filter(article => {
  if (seen.has(article.slug)) return false
  seen.add(article.slug)
  return true
 }).slice(0, limit)
}
