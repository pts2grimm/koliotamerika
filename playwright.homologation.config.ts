import { defineConfig } from '@playwright/test'
import base from './playwright.landing.config'
export default defineConfig({...base,testMatch:['homologation.spec.ts','blog-seo.spec.ts'],timeout:240000})
