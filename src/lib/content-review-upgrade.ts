import type { Payload } from 'payload'
import { beginTransaction } from '@payloadcms/drizzle'
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import type { Page } from '../payload-types'
import snapshot from '../../content/wordpress.json'
import previousSEO from '../../content/page-seo-2026-10.json'
import revisions from '../../content/content-review-2026-10.json'
import { reviewedHTML, type ContentRevision } from './content-review'

import { contentReviewKey } from './content-review-key'
export { contentReviewKey } from './content-review-key'
// Lexical generates a fresh ID for each imported link. Ignore only those UI
// IDs and undefined fields lost during JSON storage; preserve URLs, formatting,
// relationship/media IDs and every other content value when comparing edits.
function stable(value: unknown): string {
 if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']'
 if (value && typeof value === 'object') return '{' + Object.entries(value).filter(([k,v]) => v !== undefined && !(k === 'id' && ['link','autolink'].includes(String((value as {type?:unknown}).type)))).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => JSON.stringify(k) + ':' + stable(v)).join(',') + '}'
 return JSON.stringify(value) ?? 'undefined'
}
export function contentReviewUpdate(page: Page, baseline: { title: string; intro: string; seoTitle: string; seoDescription: string; body: Page['body'] }, revision: ContentRevision, body: Page['body']): Partial<Page> {
 const data: Partial<Page> = {}
 if (stable(page.body) === stable(baseline.body) && stable(page.body) !== stable(body)) data.body = body
 const previous = previousSEO.find(item => item.slug === revision.slug)?.after
 for (const field of ['title', 'intro'] as const) {
  if (revision[field] && [baseline[field], previous?.[field]].includes(page[field])) data[field] = revision[field]
 }
 const seo: NonNullable<Page['seo']> = { ...page.seo }
 if (revision.title && [baseline.seoTitle.slice(0,70), previous?.seo.title].includes(page.seo?.title || '')) seo.title = revision.title.slice(0,70)
 if (revision.intro && [baseline.seoDescription.slice(0,180), previous?.seo.description].includes(page.seo?.description || '')) seo.description = revision.intro.slice(0,180)
 if (stable(seo) !== stable(page.seo || {})) data.seo = seo
 return data
}
export async function upgradeContentReview(payload: Payload) {
 let updated = 0
 const keys = revisions.map(item => contentReviewKey(item.slug))
 const applied = new Set((await payload.find({ collection:'payload-kv', limit:keys.length, depth:0, select:{key:true}, where:{key:{in:keys}} })).docs.map(item => item.key))
 let editorConfig: Awaited<ReturnType<typeof editorConfigFactory.default>> | undefined
 for (const revision of revisions as ContentRevision[]) {
  const key = contentReviewKey(revision.slug)
  if (applied.has(key)) continue
  const original = snapshot.items.find(item => item.slug === revision.slug)
  if (!original) throw new Error('Missing content baseline: ' + revision.slug)
  editorConfig ??= await editorConfigFactory.default({ config: payload.config })
  const baseline = { ...original, seoTitle: original.seoTitle || '', seoDescription: original.seoDescription || '', body: convertHTMLToLexical({ editorConfig, html: original.html, JSDOM }) }
  const body = convertHTMLToLexical({ editorConfig, html: reviewedHTML(original.html, revision), JSDOM })
  const transactionID = await beginTransaction.call(payload.db)
  if (transactionID == null) throw new Error('Content review requires database transactions.')
  const req = { transactionID }
  try {
   if ((await payload.count({ collection:'payload-kv', req, where:{key:{equals:key}} })).totalDocs) {
    await payload.db.commitTransaction(transactionID); continue
   }
   const page = (await payload.find({ collection:'pages', req, limit:1, depth:0, where:{slug:{equals:revision.slug}} })).docs[0]
   if (!page) { await payload.db.commitTransaction(transactionID); continue }
   const data = contentReviewUpdate(page, baseline, revision, body)
   if (Object.keys(data).length) {
    await payload.update({ collection:'pages', id:page.id, req, depth:0, data })
    updated++
   }
   await payload.create({ collection:'payload-kv', req, data:{ key, data:{
    pageID:page.id, appliedAt:new Date().toISOString(),
    before:{body:page.body ?? null,title:page.title,intro:page.intro,seo:page.seo ?? null},
    applied:data, bodyPreserved:stable(page.body) !== stable(baseline.body),
   }} })
   await payload.db.commitTransaction(transactionID)
  } catch(error) {
   await payload.db.rollbackTransaction(transactionID)
   throw error
  }
 }
 return updated
}
