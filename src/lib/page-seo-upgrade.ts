import type { Payload } from 'payload'
import type { Page } from '../payload-types'
import patches from '../../content/page-seo-2026-10.json'

type Section = { heading: string; body: string }
type Revision = {
 title: string; intro: string; seo: { title: string; description: string }; sections?: Section[]
}
export type PageSEORevision = { slug: string; before: Revision; after: Revision }
export const pageSEOKey = (slug: string) => 'content:page-seo:2026-10:v1:' + slug

// Compare each field with the exact imported/seeded value, not the current title
// displayed by a template. Empty SEO fields normalize SQL null and absent fields.
export function pageSEOUpdate(page: Page, revision: PageSEORevision): Partial<Page> {
 const update: Partial<Page> = {}
 for (const key of ['title', 'intro'] as const) {
  if (page[key] === revision.before[key] && page[key] !== revision.after[key]) update[key] = revision.after[key]
 }
 const seo: NonNullable<Page['seo']> = {}
 for (const key of ['title', 'description'] as const) {
  if ((page.seo?.[key] || '') === revision.before.seo[key] && page.seo?.[key] !== revision.after.seo[key]) seo[key] = revision.after.seo[key]
 }
 if (Object.keys(seo).length) update.seo = { ...page.seo, ...seo }
 // Only expand the untouched seed sections; preserve editor rows and rich text.
 if (revision.before.sections && revision.after.sections && !page.body?.root.children.length &&
     JSON.stringify(page.sections?.map(({ heading, body }) => ({ heading, body })) || []) === JSON.stringify(revision.before.sections)) {
  update.sections = revision.after.sections.map((section, i) => ({ ...section, ...(page.sections?.[i]?.id ? { id: page.sections[i].id } : {}) }))
 }
 return update
}

export async function upgradePageSEO(payload: Payload) {
 let updated = 0
 for (const revision of patches) {
  const key = pageSEOKey(revision.slug)
  if ((await payload.count({ collection: 'payload-kv', where: { key: { equals: key } } })).totalDocs) continue
  // Keep the page edit, its audit snapshot and its once-only marker in one
  // transaction. A restart cannot reapply a deliberately reverted CMS field.
  const transactionID = await payload.db.beginTransaction()
  if (transactionID == null) throw new Error('Page SEO upgrade requires database transactions.')
  const req = { transactionID }
  try {
   if ((await payload.count({ collection: 'payload-kv', req, where: { key: { equals: key } } })).totalDocs) {
    await payload.db.commitTransaction(transactionID)
    continue
   }
   const page = (await payload.find({ collection: 'pages', req, depth: 0, limit: 1, where: { and: [{ slug: { equals: revision.slug } }, { kind: { equals: 'page' } }] } })).docs[0]
   if (!page) { await payload.db.commitTransaction(transactionID); continue }
   const data = pageSEOUpdate(page, revision)
   if (Object.keys(data).length) {
    await payload.update({ collection: 'pages', id: page.id, data, req, depth: 0 })
    updated++
   }
   await payload.create({ collection: 'payload-kv', req, data: {
    key, data: {
     pageID: page.id, appliedAt: new Date().toISOString(),
     before: { title: page.title, intro: page.intro, seo: page.seo ?? null, sections: page.sections ?? null },
     applied: data,
    },
   } })
   await payload.db.commitTransaction(transactionID)
  } catch (error) {
   await payload.db.rollbackTransaction(transactionID)
   throw error
  }
 }
 return updated
}
