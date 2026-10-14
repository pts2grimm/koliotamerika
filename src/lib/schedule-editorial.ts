import type { Payload } from 'payload'
import schedule from '../../content/editorial-schedule.json'

// Apply the approved release calendar only to unscheduled drafts.
// Existing dates (including a draft deliberately taken offline) and published posts win.
export async function scheduleEditorialArticles(payload: Payload, now = Date.now()) {
 if (process.env.AUCTION_PROVIDER !== 'eridan') return 0
 let count = 0
 for (const item of schedule) {
  if (Date.parse(item.publishedAt) <= now) continue
  const updated = await payload.update({
   collection: 'pages',
   where: { and: [
    { slug: { equals: item.slug } }, { kind: { equals: 'article' } },
    { status: { equals: 'draft' } }, { publishedAt: { exists: false } },
   ] },
   data: { status: 'published', publishedAt: item.publishedAt },
  })
  count += updated.docs.length
 }
 return count
}
