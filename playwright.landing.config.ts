import { defineConfig } from '@playwright/test'
import base from './playwright.config'
const servers = Array.isArray(base.webServer) ? base.webServer : []
export default defineConfig({
 ...base,
 testMatch: '**/landing.spec.ts',
 timeout: 180000,
 webServer: [servers[0], {
  ...servers[1],
  command: 'node --import tsx scripts/prepare-hosting.ts && npm run dev -- --port 3100',
  timeout: 180000,
 }],
})
