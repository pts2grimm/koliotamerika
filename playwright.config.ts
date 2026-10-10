import { defineConfig } from '@playwright/test'
import { randomBytes } from 'node:crypto'
export default defineConfig({
 testDir: './tests', testMatch: '**/*.spec.ts', workers: 1, fullyParallel: false, timeout: 90000,
 expect: { timeout: 15000 },
 use: { baseURL: 'http://localhost:3100', headless: true, launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
 webServer: [{ command: 'node tests/fixtures/auction-server.mjs', url: 'http://127.0.0.1:3199', reuseExistingServer: false }, { command: 'npm run dev -- --port 3100', url: 'http://localhost:3100', reuseExistingServer: false, timeout: 120000,
  env: { PREVIEW_MODE: 'false', CUSTOMER_ACCOUNTS_ENABLED: 'true', ALLOW_ADMIN_SETUP: 'true', SMTP_HOST: '127.0.0.1', SMTP_PORT: '2525', SMTP_FROM: 'test@example.test', AUCTION_PROVIDER: 'legacy', AUCTION_API_BASE_URL: 'http://127.0.0.1:3199', NEXT_DIST_DIR: '.next-test', MEDIA_DIR: `/tmp/koliotamerika-e2e-media-${process.pid}`, DATABASE_URI: `file:/tmp/koliotamerika-e2e-${process.pid}.db`, PAYLOAD_SECRET: randomBytes(48).toString('hex'), NEXT_PUBLIC_SERVER_URL: 'http://localhost:3100', SITE_INDEXABLE: 'true' } }]
})
