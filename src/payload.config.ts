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
import { Integrations } from './globals/Integrations'
import { SiteSettings } from './globals/SiteSettings'
import { initializeContent } from './lib/initialize-content'
import { isPreview } from './lib/preview'
import { migrations } from './migrations'
const preview = isPreview()
const remote = !preview && /^(libsql|https?):\/\//i.test(process.env.DATABASE_URI || '')
const migrating = process.env.PAYLOAD_MIGRATING === 'true'
if (remote && !process.env.DATABASE_AUTH_TOKEN) throw new Error('DATABASE_AUTH_TOKEN is required for the remote database.')
if (!process.env.PAYLOAD_SECRET) throw new Error('PAYLOAD_SECRET is required. Run npm run setup for local development.')
export default buildConfig({
  secret: process.env.PAYLOAD_SECRET,
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
  graphQL: { disable: true },
  admin: {
    user: 'users',
    meta: { titleSuffix: ' · Коли от Америка' },
    components: {
      beforeNavLinks: ['/src/components/admin/ContentNav#ContentNav'],
      views: {
        sitePages: { Component: '/src/components/admin/ContentList#SitePagesView', path: '/site-pages', exact: true, meta: { title: 'Страници' } },
        blogPosts: { Component: '/src/components/admin/ContentList#BlogPostsView', path: '/blog-posts', exact: true, meta: { title: 'Блог' } },
      },
    },
  },
  i18n: { fallbackLanguage: 'bg', supportedLanguages: { bg, en } },
  collections: [Users, Customers, SavedVehicles, Media, Cars, Pages, Inquiries, AuctionQuotes, Redirects, RateLimits],
  globals: [SiteSettings, CalculatorSettings, Integrations],
  ...(process.env.SMTP_HOST && process.env.SMTP_FROM ? { email: nodemailerAdapter({ defaultFromAddress: process.env.SMTP_FROM, defaultFromName: 'Коли от Америка', skipVerify: true, transportOptions: { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_PORT === '465', ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } } : {}) } }) } : {}),
  db: sqliteAdapter({
    client: { url: preview ? `file:${path.join(tmpdir(), `koa-preview-${process.pid}.db`)}` : process.env.DATABASE_URI || 'file:./.data/payload.db', ...(!preview && process.env.DATABASE_AUTH_TOKEN ? { authToken: process.env.DATABASE_AUTH_TOKEN } : {}) },
    // Never run development schema push against the persistent remote database.
    ...(remote ? { push: false } : {}),
    // The explicit preparation script runs this same list exactly once itself.
    ...(!migrating ? { prodMigrations: migrations } : {}),
  }),
  sharp,
  editor: lexicalEditor(),
  typescript: { outputFile: path.resolve(process.cwd(), 'src/payload-types.ts') },
  onInit: async payload => {
    await initializeContent(payload, { preview, importLegacy: preview || remote })
  }
})
