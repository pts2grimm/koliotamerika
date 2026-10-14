import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { calculateImport } from '../src/lib/calculate'
import { exampleCosts, purchaseFee, onlineFee } from '../src/lib/customer-tariff'
import { clarifyCopy } from '../src/lib/clarity-copy'
import pricing from '../content/customer-pricing-2026-10.json'
test('calculator reproduces every line and total of the published $10,000 example',()=>{
 const result=calculateImport(10000,500,1000,exampleCosts)!
 assert.equal(result.totalEur,18335.44)
 assert.equal(result.customsEur,12042)
 assert.equal(result.vatBaseEur,14446.2)
 assert.equal(result.dutyEur,1204.2)
 assert.equal(result.vatEur,2889.24)
 assert.equal(result.commissionEur,1000)
 const doc=new JSDOM(pricing[0].html)
 const rows=[...doc.window.document.querySelectorAll('table')[4].querySelectorAll('tr')].slice(1)
 const number=(s:string)=>Number(s.replace(/[^0-9.]/g,''))
 result.rows.forEach((row,i)=>{
  const cells=rows[i].querySelectorAll('td')
  assert.equal(row.usd,number(cells[1].textContent!),row.label)
  assert.equal(row.eur,number(cells[2].textContent!),row.label)
 })
 for(const row of [...doc.window.document.querySelectorAll('table')[0].querySelectorAll('tr')].slice(1)){
  const cells=row.querySelectorAll('td')
  assert.equal(purchaseFee(number(cells[0].textContent!)),number(cells[1].textContent!))
 }
 doc.window.close()
})
test('tariff boundaries, invalid values and zero transport cannot silently underprice',()=>{
 assert.equal(purchaseFee(999.99),370);assert.equal(purchaseFee(1000),440)
 assert.equal(purchaseFee(2399.99),662.5);assert.equal(purchaseFee(2400),705)
 assert.equal(purchaseFee(11499.99),1390);assert.equal(purchaseFee(11500),1400)
 assert.equal(purchaseFee(14999.99),1400);assert.equal(purchaseFee(15000),1875)
 assert.equal(purchaseFee(20000),2500)
 assert.equal(onlineFee(7999.99),145);assert.equal(onlineFee(8000),160)
 for(const price of [0,-1,NaN,Infinity,500001])assert.equal(calculateImport(price,500,1000,exampleCosts),null)
 for(const value of [-1,NaN,Infinity,100001])assert.equal(calculateImport(10000,value,1000,exampleCosts),null)
 assert.equal(calculateImport(10000,500,1000,{...exampleCosts,usdToEur:0}),null)
 assert.equal(calculateImport(10000,500,1000,{...exampleCosts,insuranceUsd:NaN}),null)
 assert.ok(calculateImport(10000,0,0,exampleCosts))
 const base=calculateImport(10000,500,1000,exampleCosts)!
 const increased=calculateImport(10000,600,1000,exampleCosts)!
 assert.equal(Math.round((increased.totalEur-base.totalEur)*100),11880) // €90 + 10% duty + 20% VAT.
})
test('commercial clarification preserves custom copy and formatting and is repeatable',()=>{
 const before={root:{children:[{type:'text',text:'My manual wording',format:1},{type:'link',url:'/keep',children:[{type:'text',text:'Ако се изисква депозит, неговото предназначение и приспадане се описват в договора.',format:2}]}]}}
 const after=clarifyCopy(before)
 assert.equal(before.root.children[1].children![0].text,'Ако се изисква депозит, неговото предназначение и приспадане се описват в договора.')
 assert.equal(after.root.children[0].text,'My manual wording')
 assert.equal(after.root.children[1].url,'/keep')
 assert.equal(after.root.children[1].children![0].format,2)
 assert.match(after.root.children[1].children![0].text,/невъзвръщаемата комисионна/)
 assert.deepEqual(clarifyCopy(after),after)
})
