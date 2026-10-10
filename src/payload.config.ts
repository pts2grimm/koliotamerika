import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { Customers, SavedVehicles } from './collections/Customers'
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
  graphQL: { disable: true },
  admin: { user: 'users', meta: { titleSuffix: ' · Коли от Америка' } },
  i18n: { fallbackLanguage: 'bg', supportedLanguages: { bg, en } },
  collections: [Users, Customers, SavedVehicles, Media, Cars, Pages, Inquiries, AuctionQuotes, Redirects, RateLimits],
  globals: [SiteSettings, CalculatorSettings],
  ...(process.env.SMTP_HOST && process.env.SMTP_FROM ? { email: nodemailerAdapter({ defaultFromAddress: process.env.SMTP_FROM, defaultFromName: 'Коли от Америка', skipVerify: true, transportOptions: { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_PORT === '465', ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } } : {}) } }) } : {}),
  db: sqliteAdapter({
    client: { url: preview ? `file:${path.join(tmpdir(), `koa-preview-${process.pid}.db`)}` : process.env.DATABASE_URI || 'file:./.data/payload.db', ...(!preview && process.env.DATABASE_AUTH_TOKEN ? { authToken: process.env.DATABASE_AUTH_TOKEN } : {}) },
    ...((preview || process.env.DATABASE_URI?.startsWith('libsql://')) ? { prodMigrations: migrations } : {}),
  }),
  sharp,
  editor: lexicalEditor(),
  typescript: { outputFile: path.resolve(process.cwd(), 'src/payload-types.ts') },
  onInit: async payload => {
    if (!preview && process.env.INITIAL_ADMIN_EMAIL && process.env.INITIAL_ADMIN_PASSWORD && !(await payload.count({ collection: 'users' })).totalDocs) {
      if (process.env.INITIAL_ADMIN_PASSWORD.length < 16) throw new Error('INITIAL_ADMIN_PASSWORD must have at least 16 characters.')
      await payload.create({ collection: 'users', data: { email: process.env.INITIAL_ADMIN_EMAIL, password: process.env.INITIAL_ADMIN_PASSWORD, name: 'Администратор' } })
    }
    await seed(payload)
    if (preview || process.env.DATABASE_URI?.startsWith('libsql://')) {
      const { importContent } = await import('./lib/import-content')
      await importContent(payload)
    }
  }
})
