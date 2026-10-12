import { defineConfig } from '@playwright/test'
import { randomBytes } from 'node:crypto'
export default defineConfig({
 testDir: './tests', testMatch: ['eridan.spec.ts', 'auctions.spec.ts'],
 grepInvert: /auction SEO|auction schedules/, workers: 1, fullyParallel: false, timeout: 90000,
 expect: { timeout: 15000 },
 use: { baseURL: 'http://localhost:3100', headless: true, launchOptions: { ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox'] }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
 webServer: [
  { command: 'node tests/fixtures/eridan-server.mjs', url: 'http://127.0.0.1:3199', reuseExistingServer: false },
  { command: 'npm run hosting:prepare && npm run start -- --port 3100', url: 'http://localhost:3100', reuseExistingServer: false, timeout: 120000,
   env: { PREVIEW_MODE: 'false', SITE_INDEXABLE: 'false', CUSTOMER_ACCOUNTS_ENABLED: 'true', ALLOW_ADMIN_SETUP: 'true',
    AUCTION_PROVIDER: 'eridan', ERIDAN_API_KEY: 'eridan-local-fixture', ERIDAN_TEST_API_BASE_URL: 'http://127.0.0.1:3199',
    APICAR_API_KEY: '', DATABASE_AUTH_TOKEN: '', SMTP_HOST: '', SMTP_FROM: '',
    NEXT_DIST_DIR: '.next-eridan', MEDIA_DIR: '/tmp/koa-eridan-media-' + process.pid,
    DATABASE_URI: 'file:/tmp/koa-eridan-' + process.pid + '.db', PAYLOAD_SECRET: randomBytes(48).toString('hex'),
    NEXT_PUBLIC_SERVER_URL: 'http://localhost:3100' } },
 ],
})
