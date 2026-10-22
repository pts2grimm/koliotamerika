import { defineConfig } from '@playwright/test'
import base from './playwright.landing.config'
const servers = Array.isArray(base.webServer) ? base.webServer : []
if (process.env.CI !== 'true') throw new Error('PostgreSQL browser tests require isolated CI')
export default defineConfig({
  ...base,
  testMatch: '**/' + (['invoice','bos','consent-admin','catalog-activity'].includes(process.env.PG_BROWSER_SUITE || '') ? process.env.PG_BROWSER_SUITE : 'invoice') + '.spec.ts',
  timeout: 180000,
  use: {...base.use, actionTimeout:15000},
  webServer: [servers[0], {
    ...servers[1],
    env: {...servers[1].env, DATABASE_PROVIDER:'postgres',
      DATABASE_URI:'postgresql://postgres:isolated-test-only@127.0.0.1:5432/browser_tests',
      CI:'true', NEXT_DIST_DIR:'.next'},
  }],
})
