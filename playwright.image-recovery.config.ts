import { defineConfig } from '@playwright/test'
import base from './playwright.eridan.config'
export default defineConfig({ ...base, testMatch: ['image-recovery.spec.ts'] })
