import { defineConfig } from '@playwright/test'
import base from './playwright.config'
const servers = Array.isArray(base.webServer) ? base.webServer : []
export default defineConfig({
 ...base,
 testMatch: ['**/content-review.spec.ts','**/home-clarity.spec.ts'],
 timeout: 300000,
 webServer: [servers[0], {
  ...servers[1],
  // Exercise the built site; development schema push must not touch the migrated fixture.
  command: 'node --import tsx scripts/prepare-hosting.ts && npm run start -- --port 3100',
  env: { ...servers[1].env, NEXT_DIST_DIR: '.next' },
  timeout: 180000,
 }],
})
