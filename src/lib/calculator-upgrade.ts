import type { Payload } from 'payload'
import { beginTransaction } from '@payloadcms/drizzle'

export const calculatorDeliveryKey = 'calculator:delivery:2026-10-14:v1'

/** Apply the owner's new default once; preserve custom and subsequent admin edits. */
export async function upgradeCalculatorDelivery(payload: Payload) {
 const transactionID = await beginTransaction.call(payload.db)
 if (transactionID == null) throw new Error('Calculator update requires a transaction.')
 const req = { transactionID }
 try {
  if ((await payload.count({ collection: 'payload-kv', req, where: { key: { equals: calculatorDeliveryKey } } })).totalDocs) {
   await payload.db.commitTransaction(transactionID)
   return
  }
  const settings = await payload.findGlobal({ slug: 'calculator-settings', req, depth: 0 })
  const previous = settings.deliveryEur
  const update = previous == null || previous === 900
  if (update) await payload.updateGlobal({ slug: 'calculator-settings', req, data: { deliveryEur: 1000 } })
  await payload.create({ collection: 'payload-kv', req, data: { key: calculatorDeliveryKey, data: {
   appliedAt: new Date().toISOString(), previous: previous ?? null, applied: update ? 1000 : null,
  } } })
  await payload.db.commitTransaction(transactionID)
 } catch (error) {
  await payload.db.rollbackTransaction(transactionID)
  throw error
 }
}
