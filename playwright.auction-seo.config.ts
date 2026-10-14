import { defineConfig } from '@playwright/test'
import base from './playwright.eridan.config'
const servers=Array.isArray(base.webServer)?base.webServer:[]
export default defineConfig({...base,testMatch:'**/auction-seo.spec.ts',grepInvert:undefined,webServer:[servers[0],{...servers[1],env:{...servers[1].env,NEXT_DIST_DIR:'.next',SITE_INDEXABLE:'true'}}]})
