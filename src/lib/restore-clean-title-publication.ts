import type { Payload } from 'payload'
import { beginTransaction } from '@payloadcms/drizzle'

export const cleanTitlePublicationKey = 'editorial:restore-clean-title:2026-10-14:v1'
const slug = 'clean-title-kola-ot-amerika'
const originalDate = '2026-10-13T06:00:00.000Z'
const importedSchedule = '2026-10-20T06:00:00.000Z'

/** Restore the already-public article on Eridan once; do not replace editorial fields. */
export async function restoreCleanTitlePublication(payload: Payload) {
 if (process.env.AUCTION_PROVIDER !== 'eridan') return false
 const transactionID = await beginTransaction.call(payload.db)
 if (transactionID == null) throw new Error('Editorial restoration requires a transaction.')
 const req = { transactionID }
 try {
  if ((await payload.count({ collection: 'payload-kv', req, where: { key: { equals: cleanTitlePublicationKey } } })).totalDocs) {
   await payload.db.commitTransaction(transactionID)
   return false
  }
  const page = (await payload.find({ collection: 'pages', req, depth: 0, limit: 1, where: { slug: { equals: slug } } })).docs[0]
  // A missing import may be retried later; unrelated or manually rescheduled content wins.
  if (!page || page.kind !== 'article') {
   await payload.db.commitTransaction(transactionID)
   return false
  }
  const restore = (page.status === 'draft' && !page.publishedAt) ||
   (page.publishedAt != null && Date.parse(page.publishedAt) === Date.parse(importedSchedule))
  if (restore) await payload.update({
   collection: 'pages', id: page.id, req, depth: 0,
   data: { status: 'published', publishedAt: originalDate },
  })
  await payload.create({ collection: 'payload-kv', req, data: {
   key: cleanTitlePublicationKey,
   data: { pageID: page.id, appliedAt: new Date().toISOString(),
    before: { status: page.status, publishedAt: page.publishedAt ?? null },
    applied: restore ? { status: 'published', publishedAt: originalDate } : {},
   },
  } })
  await payload.db.commitTransaction(transactionID)
  return restore
 } catch (error) {
  await payload.db.rollbackTransaction(transactionID)
  throw error
 }
}
