import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import revisions from '../../content/page-seo-2026-10.json'
import { pageSEOKey, upgradePageSEO } from '../../src/lib/page-seo-upgrade'

// Run only after preparation against the isolated database supplied by the test.
const payload = await getPayload({ config, disableOnInit: true })
try {
 const revision = revisions.find(p => p.slug === 'homologacia')!
 const key = pageSEOKey(revision.slug)
 const page = (await payload.find({ collection: 'pages', where: { slug: { equals: revision.slug } }, limit: 1, depth: 0 })).docs[0]
 await payload.delete({ collection: 'payload-kv', where: { key: { equals: key } } })
 const before = await payload.update({ collection: 'pages', id: page.id, data: { title: revision.before.title, intro: revision.before.intro, seo: revision.before.seo }, depth: 0 })
 const create = payload.create.bind(payload)
 payload.create = (async (args: Parameters<typeof payload.create>[0]) => {
  if (args.collection === 'payload-kv') throw new Error('Injected audit write failure')
  return create(args)
 }) as typeof payload.create
 await assert.rejects(upgradePageSEO(payload), /Injected audit write failure/)
 payload.create = create
 const after = await payload.findByID({ collection: 'pages', id: page.id, depth: 0 })
 assert.deepEqual(after, before, 'Page update must roll back when the audit write fails')
 assert.equal((await payload.count({ collection: 'payload-kv', where: { key: { equals: key } } })).totalDocs, 0)
 assert.equal(await upgradePageSEO(payload), 1)
 assert.equal((await payload.findByID({ collection: 'pages', id: page.id })).title, revision.after.title)
} finally { await payload.destroy() }
process.exit(0)
