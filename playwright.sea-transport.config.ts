import { defineConfig } from '@playwright/test'
import base from './playwright.home-clarity.config'
export default defineConfig({ ...base, testMatch: ['**/sea-transport.spec.ts','**/content-review.spec.ts'] })
