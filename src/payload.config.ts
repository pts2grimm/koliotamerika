import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { bg } from '@payloadcms/translations/languages/bg'
import { en } from '@payloadcms/translations/languages/en'
import sharp from 'sharp'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { AuctionQuotes, Cars, Inquiries, Media, Pages, RateLimits, Redirects, Users } from './collections'
import { CalculatorSettings } from './globals/CalculatorSettings'
import { SiteSettings } from './globals/SiteSettings'
import { seed } from './lib/seed'
import { isPreview } from './lib/preview'
import { migrations } from './migrations'
const preview = isPreview()
if (!process.env.PAYLOAD_SECRET) throw new Error('PAYLOAD_SECRET is required. Run npm run setup for local development.')
export default buildConfig({
  secret: process.env.PAYLOAD_SECRET,
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
  admin: { user: 'users', meta: { titleSuffix: ' · Коли от Америка' } },
  i18n: { fallbackLanguage: 'bg', supportedLanguages: { bg, en } },
  collections: [Users, Media, Cars, Pages, Inquiries, AuctionQuotes, Redirects, RateLimits],
  globals: [SiteSettings, CalculatorSettings],
  db: sqliteAdapter({
    client: { url: preview ? `file:${path.join(tmpdir(), `koa-preview-${process.pid}.db`)}` : process.env.DATABASE_URI || 'file:./.data/payload.db' },
    ...(preview ? { prodMigrations: migrations } : {}),
  }),
  sharp,
  editor: lexicalEditor(),
  typescript: { outputFile: path.resolve(process.cwd(), 'src/payload-types.ts') },
  onInit: async payload => {
    await seed(payload)
    if (preview) {
      const { importContent } = await import('./lib/import-content')
      await importContent(payload)
    }
  }
})
