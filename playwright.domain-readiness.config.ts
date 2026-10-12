import { defineConfig } from '@playwright/test'
import base from './playwright.home-clarity.config'
export default defineConfig({ ...base, testMatch: ['**/content-review.spec.ts', '**/domain-readiness.spec.ts'] })
