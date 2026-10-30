import type { Payload } from 'payload'
import { beginTransaction } from '@payloadcms/drizzle'
import { contactPhonePatch } from './contact-phone'
export const contactPhoneKey = 'content:contact-phone:2026-10-30:v1'
const pageFields = ['title','intro','eyebrow','body','sections','seo'] as const
const carFields = ['title','description','features','seo'] as const
const siteFields = ['phone','brand','heroTitle','heroDescription','defaultDescription','faq'] as const
const homeFields = ['seo','hero','search','strip','catalogue','price','commission','trust','process','services','dealers','faq','news','community','company','cta'] as const

/** Owner-authorized one-time contact correction, after legacy/editorial imports. */
export async function upgradeContactPhone(payload: Payload) {
 const transactionID = await beginTransaction.call(payload.db)
 if (transactionID == null) throw new Error('Contact correction requires a transaction.')
 const req = { transactionID }
 let updated = 0
 try {
  if ((await payload.count({ collection: 'payload-kv', req, where: { key: { equals: contactPhoneKey } } })).totalDocs) {
   await payload.db.commitTransaction(transactionID)
   return 0
  }
  const site = await payload.findGlobal({ slug: 'site-settings', req, depth: 0 })
  const sitePatch = contactPhonePatch(site, siteFields)
  if (Object.keys(sitePatch).length) {
   await payload.updateGlobal({ slug: 'site-settings', req, depth: 0, data: sitePatch })
   updated++
  }
  const home = await payload.findGlobal({ slug: 'homepage', req, depth: 0 })
  // A never-edited homepage is derived from defaults, which contain no old number.
  if (home.initialized) {
   const patch = contactPhonePatch(home, homeFields)
   if (Object.keys(patch).length) {
    await payload.updateGlobal({ slug: 'homepage', req, depth: 0, data: patch })
    updated++
   }
  }
  for (const collection of ['pages', 'cars'] as const) {
   let page = 1
   let hasNextPage = true
   while (hasNextPage) {
    const result = await payload.find({ collection, req, depth: 0, limit: 100, page, sort: 'id' })
    for (const doc of result.docs) {
     const fields = collection === 'pages' ? pageFields : carFields
     const patch = contactPhonePatch(doc as unknown as Record<string, unknown>, fields)
     if (!Object.keys(patch).length) continue
     // Fail and roll back if an editor changed the record after this read.
     const changed = await payload.update({ collection, req, depth: 0,
      where: { and: [{ id: { equals: doc.id } }, { updatedAt: { equals: doc.updatedAt } }] },
      data: patch,
     })
     if (changed.docs.length !== 1) throw new Error('Contact correction conflicted with an editorial update.')
     updated++
    }
    hasNextPage = result.hasNextPage
    page++
   }
  }
  await payload.create({ collection: 'payload-kv', req, data: { key: contactPhoneKey, data: {
   appliedAt: new Date().toISOString(), updated,
  } } })
  await payload.db.commitTransaction(transactionID)
  return updated
 } catch (error) {
  await payload.db.rollbackTransaction(transactionID)
  throw error
 }
}
