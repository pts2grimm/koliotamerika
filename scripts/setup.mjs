import { mkdir, access, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
await mkdir('.data', { recursive: true })
await mkdir('public/media', { recursive: true })
try { await access('.env') } catch {
  await writeFile('.env', `PAYLOAD_SECRET=${randomBytes(48).toString('hex')}\nDATABASE_URI=file:./.data/payload.db\nNEXT_PUBLIC_SERVER_URL=http://localhost:3000\nSITE_INDEXABLE=false\n`, { mode: 0o600, flag: 'wx' })
  console.log('Local configuration created. Existing configuration is preserved.')
}
console.log('Local storage directories are ready.')
