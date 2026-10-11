import assert from 'node:assert/strict'
import test from 'node:test'
import { blogPage, blogPath, articleStructuredData } from '../src/lib/blog-seo'
import { legacyRedirect } from '../src/lib/legacy-redirects'
import redirects from '../content/legacy-redirects.json'
import snapshot from '../content/wordpress.json'
import drafts from '../content/editorial-drafts.json'

test('pagination rejects repeated, fractional, negative and unsafe page numbers', () => {
 assert.equal(blogPage(undefined), 1)
 assert.equal(blogPage('2'), 2)
 for (const value of ['0', '-1', '1.2', 'Infinity', '9007199254740992', '1e3', '', ['1', '2']]) assert.equal(blogPage(value), null)
 assert.equal(blogPath(1), '/blog')
 assert.equal(blogPath(2), '/blog?page=2')
 assert.equal(legacyRedirect('/blog/page/2/'), '/blog?page=2')
 assert.equal(legacyRedirect('/blog/page/1'), '/blog')
 assert.equal(legacyRedirect('/blog/page/0'), undefined)
})
test('audited legacy redirects resolve directly to existing imported destinations', () => {
 const slugs = new Set(snapshot.items.map(item => '/' + item.slug))
 for (const [from, to] of Object.entries(redirects)) {
  assert.ok(slugs.has(to), from + ' -> ' + to)
  assert.equal(legacyRedirect(from), to)
  assert.equal(legacyRedirect(to), undefined)
 }
})
test('article schema uses site domain, preserves publication time and omits invented legacy authors/updates', () => {
 const article = { title: 'Example', slug: 'example', intro: 'Intro', publishedAt: '2025-01-02T10:00:00Z', updatedAt: '2026-10-11T10:00:00Z', sourceURL: 'https://koliotamerika.bg/example/' }
 const graph = articleStructuredData(article, 'https://koliotamerika.bg', 'Коли от Америка', '/images/example.webp')['@graph']
 assert.equal(graph[0].datePublished, '2025-01-02T10:00:00.000Z')
 assert.equal(graph[0].dateModified, undefined)
 assert.equal(graph[0].author, undefined)
 assert.deepEqual(graph[0].image, ['https://koliotamerika.bg/images/example.webp'])
 assert.equal(graph[1].itemListElement?.[2].item, 'https://koliotamerika.bg/example')
})
test('drafts have unique topics, metadata and valid internal links without fictional publication dates', () => {
 const existing = new Set(snapshot.items.map(item => item.slug))
 const known = new Set([...existing, 'kontakti', 'blog', 'kalkulator'])
 const seen = new Set<string>()
 for (const item of drafts) {
  assert.ok(!existing.has(item.slug) && !seen.has(item.slug))
  seen.add(item.slug)
  assert.equal(item.status, 'draft')
  assert.ok(item.seo.title.length <= 70 && item.seo.description.length <= 180)
  assert.ok(!/<h1[ >]/i.test(item.html))
  for (const match of item.html.matchAll(/href="\/([^"]+)"/g)) assert.ok(known.has(match[1]), match[1])
 }
})
