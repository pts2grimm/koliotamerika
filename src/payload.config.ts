import { HomePage } from './globals/HomePage'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { postgresPool } from './lib/postgres-pool'
import { migrations as postgresMigrations } from './migrations-postgres'
import { operationalMigration } from './lib/postgres-operational-schema'
import { InvoiceSettings } from './globals/InvoiceSettings'
import { Invoices } from './collections/Invoices'
import { CatalogEvents } from './collections/CatalogEvents'
import { BillsOfSale } from './collections/BillsOfSale'
import { ConsentEvents } from './collections/ConsentEvents'
import { smtpConfiguration } from './lib/smtp-config'
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
const smtp = smtpConfiguration(process.env)
const postgres = !preview && process.env.DATABASE_PROVIDER === 'postgres'
if (!preview && process.env.DATABASE_PROVIDER && !['sqlite','postgres'].includes(process.env.DATABASE_PROVIDER)) throw new Error('Unknown DATABASE_PROVIDER')
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
      graphics: {
        Logo: '/src/components/admin/Brand#AdminLogo',
        Icon: '/src/components/admin/Brand#AdminIcon',
      },
      beforeNavLinks: ['/src/components/admin/ContentNav#ContentNav'],
      views: {
        social: { Component: '/src/components/admin/SocialView#SocialView', path: '/social', exact: true, meta: { title: 'Facebook публикации' } },
        databaseTraffic: { Component: '/src/components/admin/DatabaseTrafficView#DatabaseTrafficView', path: '/database-traffic', exact: true, meta: { title: 'Трафик на базата' } },
        catalogActivity: { Component: '/src/components/admin/CatalogActivityView#CatalogActivityView', path: '/catalog-activity', exact: true, meta: { title: 'API лог — каталог' } },
        dashboard: { Component: '/src/components/admin/Overview#Overview', meta: { title: 'Обзор и аналитика' } },
        sitePages: { Component: '/src/components/admin/ContentList#SitePagesView', path: '/site-pages', exact: true, meta: { title: 'Страници' } },
        blogPosts: { Component: '/src/components/admin/ContentList#BlogPostsView', path: '/blog-posts', exact: true, meta: { title: 'Блог' } },
      },
    },
  },
  i18n: { fallbackLanguage: 'bg', supportedLanguages: { bg, en } },
  collections: [CatalogEvents, Invoices, BillsOfSale, ConsentEvents, Users, Customers, SavedVehicles, Media, Cars, Pages, Inquiries, AuctionQuotes, Redirects, RateLimits],
  globals: [HomePage, InvoiceSettings, SiteSettings, CalculatorSettings, Integrations],
  ...(smtp ? { email: nodemailerAdapter(smtp) } : {}),
  db: postgres ? postgresAdapter({
    pool: postgresPool(), schemaName: 'payload', push: false, disableCreateDatabase: true,
    migrationDir: path.resolve(process.cwd(), 'src/migrations-postgres'),
    ...(!migrating ? { prodMigrations: [...postgresMigrations, operationalMigration] } : {}),
  }) : sqliteAdapter({
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
    await initializeContent(payload, { preview, importLegacy: preview || remote || postgres })
  }
})
