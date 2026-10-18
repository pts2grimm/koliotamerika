import { defineConfig } from '@playwright/test'
import base from './playwright.catalog-activity.config'
export default defineConfig({ ...base, testMatch: ['**/security.spec.ts', '**/catalog-activity.spec.ts'], workers: 1 })
