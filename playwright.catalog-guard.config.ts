import {defineConfig} from '@playwright/test'
import base from './playwright.security.config'
const servers=Array.isArray(base.webServer)?base.webServer:[]
export default defineConfig({...base,testMatch:['**/catalog-activity.spec.ts','**/catalog-guard.spec.ts','**/security.spec.ts'],workers:1,
 webServer:servers.map((server,index)=>index===1?{...server,env:{...server.env,CATALOG_RATE_PER_MINUTE:'30',CATALOG_RATE_PER_HOUR:'300'}}:server)})
