import type { Payload } from 'payload'
import { validPassword } from './password-policy'
import { seed } from './seed'

/** Called only after all schema migrations have completed. */
export async function initializeContent(payload: Payload, options: { preview: boolean; importLegacy: boolean }) {
  payload.logger.info('[bootstrap] Schema ready; initializing content.')
  if (!options.preview && process.env.INITIAL_ADMIN_EMAIL && process.env.INITIAL_ADMIN_PASSWORD &&
      !(await payload.count({ collection: 'users' })).totalDocs) {
    if (!validPassword(process.env.INITIAL_ADMIN_PASSWORD)) {
      throw new Error('INITIAL_ADMIN_PASSWORD must have between 8 and 128 characters.')
    }
    await payload.create({
      collection: 'users',
      data: { email: process.env.INITIAL_ADMIN_EMAIL, password: process.env.INITIAL_ADMIN_PASSWORD, name: 'Администратор' },
    })
  }
  await seed(payload)
  if (options.importLegacy) {
    payload.logger.info('[bootstrap] Importing missing legacy content.')
    const { importContent } = await import('./import-content')
    const imported = await importContent(payload)
    payload.logger.info(`[bootstrap] Imported ${imported} missing pages/articles.`)
    const { importEditorialDrafts } = await import('./import-editorial-drafts')
    await importEditorialDrafts(payload)
    // Editorial upgrades must never prevent the site from starting. Transactions
    // leave failed pages unchanged and the next initialization can retry them.
    try {
      const { upgradePageSEO } = await import('./page-seo-upgrade')
      const updated = await upgradePageSEO(payload)
      if (updated) payload.logger.info(`[bootstrap] Updated SEO on ${updated} untouched legacy pages.`)
    } catch (error) {
      payload.logger.warn({ err: error }, '[bootstrap] Page SEO upgrade deferred; existing content preserved.')
    }
  }
  if (options.importLegacy) {
    try {
      const { upgradeContentReview } = await import('./content-review-upgrade')
      const updated = await upgradeContentReview(payload)
      if (updated) payload.logger.info(`[bootstrap] Reviewed content and links on ${updated} legacy pages/articles.`)
    } catch (error) {
      payload.logger.warn({ err: error }, '[bootstrap] Content review deferred; existing content preserved.')
    }
  }
  payload.logger.info('[bootstrap] Ready.')
}
