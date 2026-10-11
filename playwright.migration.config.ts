import { defineConfig } from '@playwright/test'
import base from './playwright.landing.config'
export default defineConfig({ ...base, testMatch: '**/migration.spec.ts', timeout: 180000 })
