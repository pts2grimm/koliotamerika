import type { Payload } from 'payload'
import { seed } from './seed'

/** Called only after all schema migrations have completed. */
export async function initializeContent(payload: Payload, options: { preview: boolean; importLegacy: boolean }) {
  payload.logger.info('[bootstrap] Schema ready; initializing content.')
  if (!options.preview && process.env.INITIAL_ADMIN_EMAIL && process.env.INITIAL_ADMIN_PASSWORD &&
      !(await payload.count({ collection: 'users' })).totalDocs) {
    if (process.env.INITIAL_ADMIN_PASSWORD.length < 16) {
      throw new Error('INITIAL_ADMIN_PASSWORD must have at least 16 characters.')
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
  }
  payload.logger.info('[bootstrap] Ready.')
}
