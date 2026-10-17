import { defineConfig } from '@playwright/test'
import base from './playwright.landing.config'
export default defineConfig({ ...base, use: { ...base.use, actionTimeout: 15000 }, testMatch: '**/bos.spec.ts', timeout: 180000 })
