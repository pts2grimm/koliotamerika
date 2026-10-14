import { defineConfig } from '@playwright/test'
import base from './playwright.eridan.config'
const servers=Array.isArray(base.webServer)?base.webServer:[]
export default defineConfig({...base,testMatch:'**/cache-eridan.spec.ts',webServer:[servers[0],{...servers[1],env:{...servers[1].env,NEXT_DIST_DIR:'.next',AUCTION_LOGGING:'true'}}]})
