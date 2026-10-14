import { defineConfig } from '@playwright/test'
import base from './playwright.landing.config'
export default defineConfig({...base,testMatch:'**/content-cache.spec.ts',timeout:180000})
