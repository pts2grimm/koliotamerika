import { defineConfig } from '@playwright/test'
export default defineConfig({
 testDir:'./tests',testMatch:'social.spec.ts',workers:1,timeout:60000,
 use:{baseURL:'http://localhost:3100',headless:true,launchOptions:{args:['--no-sandbox']}},
 webServer:{command:'npm run start -- --port 3100',url:'http://localhost:3100',reuseExistingServer:false,timeout:120000},
})
