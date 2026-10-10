import { getPayload } from 'payload'
import config from '../src/payload.config'
import { importContent } from '../src/lib/import-content'
const payload=await getPayload({config})
console.log(`Imported ${await importContent(payload)} new pages and articles. Existing content was preserved.`)
await payload.destroy()

process.exit(0)
