// Separate process exercises production startup without reusing getPayload's cache.
import { getPayload } from 'payload'
import config from '../../src/payload.config'

const payload = await getPayload({ config })
try {
  await payload.findGlobal({ slug: 'site-settings' })
  await payload.count({ collection: 'pages' })
  await payload.count({ collection: 'customers' })
  await payload.count({ collection: 'saved-vehicles' })
} finally {
  await payload.destroy()
}
process.exit(0)
