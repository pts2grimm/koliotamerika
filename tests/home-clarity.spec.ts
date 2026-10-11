import { test, expect } from '@playwright/test'
test('homepage prioritizes costs and proof, keeps one FAQ and works in both themes',async({page,request})=>{
 const html=await(await request.get('/')).text()
 expect(html).toContain('€1000')
 expect(html).toContain('Внос на коли от Америка') // preserved SEO title/description
 expect(html).toContain('FAQPage')
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:900})
  for(const theme of ['light','dark']){
   await page.goto('/')
   await page.evaluate(t=>{document.documentElement.dataset.theme=t},theme)
   await expect(page.locator('h1')).toHaveCount(1)
   await expect(page.locator('h1')).toContainText('Коли от Америка и Канада.')
   await expect(page.locator('.home-faq')).toHaveCount(1)
   await expect(page.locator('.home-proof-photos figure')).toHaveCount(3)
   await expect(page.locator('.home-news-grid article')).toHaveCount(3)
   await expect(page.locator('#home-price')).toContainText('невъзвръщаем')
   await expect(page.locator('#dealers')).toContainText('Без фирма')
   const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,proofY:document.querySelector('#real-cars')!.getBoundingClientRect().top+scrollY}))
   expect(metrics.scrollWidth).toBeLessThanOrEqual(width+1)
   if(width<500){expect(metrics.proofY).toBeLessThan(4300);expect(metrics.height).toBeLessThan(15000)}
   console.log('HOME_METRICS',JSON.stringify({theme,...metrics}))
   await page.screenshot({path:`test-results/home-${theme}-${width}.png`,fullPage:true})
  }
 }
})
test('calculator matches the public example, remains editable and rejects blank amounts',async({page})=>{
 await page.goto('/kalkulator')
 await page.getByRole('button',{name:'Зареди примера за $10 000',exact:true}).click()
 await expect(page.getByTestId('calculator-total')).toHaveText(/18\s*335,44/)
 await expect(page.locator('.calculator-result')).toContainText('невъзвръщаемата комисионна')
 await page.getByLabel('Цена на автомобила на търг (USD)',{exact:true}).fill('20000')
 await expect(page.getByTestId('calculator-total')).not.toHaveText(/18\s*335,44/)
 await page.getByLabel('Цена на автомобила на търг (USD)',{exact:true}).fill('')
 await expect(page.getByTestId('calculator-total')).toHaveCount(0)
 await page.getByRole('button',{name:'Зареди примера за $10 000',exact:true}).click()
 await page.locator('.calculator-assumptions summary').click()
 await page.getByLabel('Курс: 1 USD в EUR',{exact:true}).fill('')
 await expect(page.getByTestId('calculator-total')).toHaveCount(0)
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:900})
  await page.getByRole('button',{name:'Зареди примера за $10 000',exact:true}).click()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:`test-results/calculator-${width}.png`,fullPage:true})
 }
 await page.goto('/obshti-usloviya')
 await expect(page.locator('main')).toContainText('3–4 месеца')
 await expect(page.locator('main')).toContainText('една и съща сума')
 await expect(page.locator('main')).not.toContainText('в рамките на 2 месеца')
})
