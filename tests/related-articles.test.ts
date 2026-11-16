import assert from 'node:assert/strict'
import test from 'node:test'
import groups from '../content/article-topics.json'
import snapshot from '../content/wordpress.json'
import drafts from '../content/editorial-drafts.json'
import { legacyRedirect } from '../src/lib/legacy-redirects'
import { relatedArticleSlugs, selectRelatedArticles } from '../src/lib/related-articles'

test('topic manifest uses unique existing article URLs without redirects', () => {
 const known = new Set([...snapshot.items.filter(item => item.kind === 'article'), ...drafts].map(item => item.slug))
 const seen = new Set<string>()
 for (const group of groups) {
  assert.ok(group.topic)
  assert.ok(group.slugs.length >= 3)
  for (const slug of group.slugs) {
   assert.ok(known.has(slug), slug)
   assert.equal(legacyRedirect('/' + slug), undefined, slug)
   assert.ok(!seen.has(slug), 'Article must have one primary topic: ' + slug)
   seen.add(slug)
  }
 }
})

test('each topic member has at least two incoming recommendations when its peers are public', () => {
 const articles = groups.flatMap(group => group.slugs.map(slug => ({ slug })))
 for (const article of articles) {
  const incoming = articles.filter(source =>
   selectRelatedArticles(source.slug, articles).some(target => target.slug === article.slug))
  assert.ok(incoming.length >= 2, article.slug)
  assert.ok(!relatedArticleSlugs(article.slug).includes(article.slug))
 }
})

test('older relevant articles keep priority over a new unrelated publication', () => {
 const slug = 'salvage-title-kola-ot-amerika'
 const old = { slug: 'clean-title-kola-ot-amerika' }
 const registration = { slug: 'homologacia-na-koli' }
 const result = selectRelatedArticles(slug, [registration, old], [{ slug: 'new-market-report' }, old])
 assert.deepEqual(result, [old, registration, { slug: 'new-market-report' }])
 assert.ok(relatedArticleSlugs('run-and-drive-koli-ot-amerika').slice(0, 2).includes('kola-ot-targ-bez-klyuch'))
 assert.ok(relatedArticleSlugs('koli-ot-sasht-regulacii-tehnologii-2025').slice(0, 2).includes('audi-promenya-imenata-na-svoite-modeli'))
})

test('missing or non-public topic entries never become cards, fallback excludes self and duplicates', () => {
 const slug = 'salvage-title-kola-ot-amerika'
 const publicPeer = { slug: 'homologacia-na-koli' }
 const fallback = [{ slug }, publicPeer, { slug: 'other-a' }, { slug: 'other-a' }, { slug: 'other-b' }]
 assert.deepEqual(selectRelatedArticles(slug, [publicPeer], fallback), [publicPeer, { slug: 'other-a' }, { slug: 'other-b' }])
 assert.deepEqual(selectRelatedArticles(slug, []), [])
 assert.deepEqual(selectRelatedArticles('unmapped-article', [], fallback), fallback.filter((item, i) => fallback.findIndex(other => other.slug === item.slug) === i).slice(0, 3))
})
