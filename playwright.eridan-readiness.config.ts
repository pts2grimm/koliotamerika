import { defineConfig } from '@playwright/test'
import base from './playwright.eridan.config'
const servers = Array.isArray(base.webServer) ? base.webServer : []
export default defineConfig({
 ...base, testMatch: ['blog-seo.spec.ts','content-review.spec.ts','domain-readiness.spec.ts'],
 timeout: 300000,
 webServer: [servers[0], {...servers[1], env:{...servers[1].env,SITE_INDEXABLE:'true'}}],
})
