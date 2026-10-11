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
  }
  payload.logger.info('[bootstrap] Ready.')
}
