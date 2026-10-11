import { defineConfig } from '@playwright/test'
import base from './playwright.content-review.config'
export default defineConfig({ ...base, testMatch: '**/integrations.spec.ts', timeout: 180000 })
