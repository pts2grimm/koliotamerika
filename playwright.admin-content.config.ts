import { defineConfig } from '@playwright/test'
import base from './playwright.landing.config'
export default defineConfig({
  ...base,
  testMatch: '**/admin-content.spec.ts',
  timeout: 180000,
})
