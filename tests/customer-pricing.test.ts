import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import additions from '../content/customer-pricing-2026-10.json'
test('customer-price budget preserves correct arithmetic, including the VAT base and conditional exchange rate',()=>{
 const dom=new JSDOM(additions[0].html)
 const tables=dom.window.document.querySelectorAll('table')
 assert.equal(tables.length,5)
 const rows=[...tables[4].querySelectorAll('tr')].slice(1).map(row=>[...row.querySelectorAll('td')].map(cell=>cell.textContent||''))
 const number=(s:string)=>Number(s.replace(/[^0-9.]/g,''))
 const usd=rows.slice(0,9).reduce((sum,row)=>sum+number(row[1]),0)
 const eur=rows.slice(0,9).reduce((sum,row)=>sum+number(row[2]),0)
 assert.equal(usd,number(rows[9][1]))
 assert.equal(Math.round(usd*0.9*100),Math.round(eur*100))
 assert.equal(Math.round(eur*100),Math.round(number(rows[9][2])*100))
 const duty=number(rows[10][2]),port=number(rows[11][2]),delivery=number(rows[12][2]),vat=number(rows[13][2]),commission=number(rows[14][2])
 assert.equal(Math.round(eur*0.1*100),Math.round(duty*100))
 assert.equal(Math.round((eur+duty+port+delivery)*0.2*100),Math.round(vat*100))
 assert.equal(Math.round((eur+duty+port+delivery+vat+commission)*100),Math.round(number(rows[15][2])*100))
 assert.match(additions[0].html,/наша клиентска тарифа/)
 assert.doesNotMatch(additions[0].html,/secured|clean|Buyer Fee|Pre-Bid|Live Bid/i)
 assert.equal(number(rows[1][1]),1390)
 assert.equal(number(rows[2][1]),95)
 assert.equal(number(rows[3][1]),160)
 assert.equal(number(rows[15][2]),18335.44)
 const fees=[...tables[0].querySelectorAll('tr')].slice(1).map(row=>[...row.querySelectorAll('td')].map(cell=>number(cell.textContent||'')))
 assert.deepEqual(fees,[[1000,440],[2000,662.5],[5000,1025],[10000,1390],[15000,1875]])
 dom.window.close()
})
