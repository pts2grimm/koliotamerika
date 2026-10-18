import { defineConfig } from '@playwright/test'
import base from './playwright.landing.config'
const servers=Array.isArray(base.webServer)?base.webServer:[]
export default defineConfig({ ...base, use: { ...base.use, actionTimeout:15000 }, testMatch:'**/catalog-activity.spec.ts', timeout:180000,
 webServer: servers.map((server,index)=>index===1?{...server,env:{...server.env,TRUST_PROXY:'true'}}:server),
})
