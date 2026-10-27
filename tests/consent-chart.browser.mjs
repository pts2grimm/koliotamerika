import { build } from 'esbuild'
import { chromium, expect } from '@playwright/test'
import { readFile, mkdir } from 'node:fs/promises'

const result = await build({
  stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {ConsentChart} from './src/components/admin/ConsentChart'; const root=createRoot(document.getElementById('root')); window.renderChart=(daily)=>root.render(<ConsentChart key={JSON.stringify(daily)} daily={daily} from="2026-10-25" to="2026-10-27"/>);`, resolveDir: process.cwd(), loader:'tsx' },
  bundle:true, write:false, platform:'browser', format:'iife', jsx:'automatic', loader:{'.css':'empty'},
})
const css = await readFile('src/components/admin/ConsentChart.css','utf8')
const browser = await chromium.launch({channel:'chrome'})
const days = [{date:'2026-10-25',total:0,accepted:0},{date:'2026-10-26',total:17,accepted:9},{date:'2026-10-27',total:1234,accepted:500}]
await mkdir('test-results', {recursive:true})
try {
  for (const mobile of [false,true]) {
    const context = await browser.newContext({viewport:{width:mobile?375:1000,height:700},hasTouch:mobile,isMobile:mobile})
    const page = await context.newPage()
    const errors=[]
    page.on('pageerror',error=>errors.push(error.message))
    await page.setContent('<meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;padding:16px;background:#121b21;color:#e5edf1;font-family:Arial;--koa-accent:#7ad3d8;--koa-card:#1b252c;--koa-border:#30414b;--theme-text:#e5edf1}.koa-overview__line-total{stroke:#7ad3d8}.koa-overview__line-accepted{stroke:#b094dc}svg text{fill:#a9bdca;font-size:11px}</style><div id="root"></div>')
    await page.addStyleTag({content:css})
    await page.addScriptTag({content:result.outputFiles[0].text})
    await page.evaluate(days=>window.renderChart(days),days)
    const chart=page.getByRole('slider')
    await expect(chart).toBeVisible()
    const svg=chart.locator('svg')
    const bounds=await svg.boundingBox()
    const move=async index=>{
      const position={x:bounds.x+(30+index*370)/800*bounds.width,y:bounds.y+bounds.height*.65}
      if(mobile) await page.touchscreen.tap(position.x,position.y)
      else await page.mouse.move(position.x,position.y)
    }
    await move(1)
    const tooltip=page.getByRole('tooltip')
    await expect(tooltip).toContainText('26.10.2026')
    await expect(tooltip).toContainText('Всички действия 17')
    await expect(tooltip).toContainText('Приети всички категории 9')
    await move(0)
    await expect(tooltip).toContainText('Всички действия 0')
    await expect(tooltip).toContainText('Приети всички категории 0')
    await move(2)
    await expect(tooltip).toContainText(new Intl.NumberFormat('bg-BG').format(1234))
    const tip=await tooltip.boundingBox()
    if(tip.x<0||tip.x+tip.width>(mobile?375:1000)) throw Error('Tooltip escapes viewport')
    await page.screenshot({path:'test-results/consent-chart-'+(mobile?'mobile':'desktop')+'.png'})
    if(!mobile) {
      await page.mouse.move(0,0)
      await expect(tooltip).toHaveCount(0)
      await chart.focus()
      await chart.press('Home')
      await expect(tooltip).toContainText('Всички действия 0')
      await chart.press('ArrowRight')
      await expect(tooltip).toContainText('Всички действия 17')
      await expect(chart).toHaveAttribute('aria-valuenow','1')
      await chart.press('End')
      await expect(tooltip).toContainText('27.10.2026')
      await chart.press('Escape')
      await expect(tooltip).toHaveCount(0)
    }
    await page.evaluate(()=>window.renderChart([{date:'2026-10-27',total:1,accepted:0}]))
    await page.getByRole('slider').focus()
    await expect(page.getByRole('tooltip')).toContainText('Всички действия 1')
    await expect(page.getByRole('tooltip')).toContainText('Приети всички категории 0')
    await page.evaluate(()=>window.renderChart([]))
    await expect(page.getByRole('slider')).toHaveCount(0)
    if(errors.length) throw Error(errors.join('\n'))
    await context.close()
  }
  console.log('PASS: desktop hover, touch selection, zero values, endpoints, keyboard, tooltip bounds, single/empty series')
} finally { await browser.close() }
