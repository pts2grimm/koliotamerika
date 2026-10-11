import { defineConfig } from '@playwright/test'
import base from './playwright.landing.config'
export default defineConfig({ ...base, testMatch: '**/blog-seo.spec.ts', timeout: 120000 })
