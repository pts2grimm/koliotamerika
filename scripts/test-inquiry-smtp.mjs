// Isolated production HTTP/SMTP regression. Never connects to Titan or delivers external mail.
import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'
const dir = mkdtempSync('/tmp/koa-smtp-')
let mode = 'accept', acknowledged = 0, transactions = 0, logs = '', app
const sockets = new Set()
const timers = new Set()
const server = createServer(socket => {
 sockets.add(socket); socket.setEncoding('utf8'); socket.write('220 localhost ESMTP test\r\n')
 let buffer = '', data = false
 socket.on('error', () => {})
 socket.on('close', () => sockets.delete(socket))
 socket.on('data', chunk => {
  buffer += chunk
  while (buffer.includes('\r\n')) {
   const end = buffer.indexOf('\r\n'), line = buffer.slice(0, end); buffer = buffer.slice(end + 2)
   if (data) {
    if (line === '.') {
     data = false
     const timer = setTimeout(() => { timers.delete(timer); acknowledged++; socket.write('250 accepted\r\n') }, 600)
     timers.add(timer)
    }
    continue
   }
   if (/^EHLO|^HELO/i.test(line)) {
    if (mode !== 'stall') socket.write('250 localhost\r\n')
   } else if (/^MAIL FROM:/i.test(line)) { transactions++; socket.write('250 OK\r\n') }
   else if (/^RCPT TO:/i.test(line)) socket.write(mode === 'reject' ? '550 rejected\r\n' : '250 OK\r\n')
   else if (/^DATA/i.test(line)) { data = true; socket.write('354 End with dot\r\n') }
   else if (/^QUIT/i.test(line)) socket.end('221 Bye\r\n')
   else socket.write('250 OK\r\n')
  }
 })
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const baseURL = 'http://127.0.0.1:3123'
const env = { ...process.env, NODE_ENV:'production', PREVIEW_MODE:'false', DATABASE_URI:'file:' + dir + '/test.db',
 DATABASE_AUTH_TOKEN:'', PAYLOAD_SECRET:'isolated-smtp-regression-not-a-live-secret', NEXT_PUBLIC_SERVER_URL:baseURL,
 SMTP_HOST:'127.0.0.1', SMTP_PORT:String(server.address().port), SMTP_FROM:'test@example.test', SMTP_USER:'', SMTP_PASSWORD:'',
 CUSTOMER_ACCOUNTS_ENABLED:'false', AUCTION_PROVIDER:'legacy', AUCTION_API_BASE_URL:'http://127.0.0.1:1',
 MEDIA_DIR:dir + '/media', NEXT_DIST_DIR:'.next' }
const run = args => {
 const r = spawnSync(process.execPath, args, { env, encoding:'utf8', timeout:120000 })
 if (r.status !== 0) throw new Error('Fixture failed: ' + r.stdout + r.stderr)
 return r.stdout
}
try {
 run(['--import', 'tsx', 'scripts/prepare-hosting.ts'])
 run(['--import', 'tsx', 'tests/fixtures/inquiry-smtp.ts', 'seed'])
 app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3123'], { env, stdio:['ignore','pipe','pipe'] })
 app.stdout.on('data', data => { logs += data }); app.stderr.on('data', data => { logs += data })
 let ready = false
 for (let i = 0; i < 120; i++) {
  try {
   const response = await fetch(baseURL + '/api/inquiry')
   if (response.status === 405 && response.headers.get('x-inquiry-handler') === 'smtp-awaited-v1') { ready = true; break }
  } catch {}
  await delay(500)
 }
 assert.ok(ready, 'Production app exposes the deployed handler marker')
 const post = message => fetch(baseURL + '/api/inquiry', { method:'POST', headers:{'Content-Type':'application/json',Origin:baseURL},
  body:JSON.stringify({name:'SMTP Test', email:'visitor@example.test', phone:'+359888000000',message,consent:true}),
  signal:AbortSignal.timeout(25000) })
 let response = await post('SMTP acceptance test')
 assert.equal(response.status, 201)
 assert.equal(response.headers.get('x-inquiry-handler'), 'smtp-awaited-v1')
 assert.equal((await response.json()).success, true)
 assert.equal(acknowledged, 1, 'SMTP must acknowledge before the HTTP success response')
 mode = 'reject'
 response = await post('SMTP refusal test')
 assert.equal(response.status, 201)
 assert.equal((await response.json()).success, true)
 assert.equal(acknowledged, 1)
 mode = 'stall'
 const started = Date.now()
 response = await post('SMTP timeout test')
 assert.equal(response.status, 201)
 assert.equal((await response.json()).success, true)
 assert.ok(Date.now() - started < 20000, 'A stalled SMTP server cannot indefinitely block the form')
 await delay(200)
 assert.ok(logs.includes('Inquiry notification started.'))
 assert.ok(logs.includes('accepted by SMTP'))
 assert.ok(logs.includes('recipient_rejected'))
 assert.ok(logs.includes('wait_timeout') || logs.includes('failed: timeout'))
 assert.ok(!logs.includes('visitor@example.test'), 'Runtime logs must not expose customer email')
 assert.equal(transactions, 2, 'No automatic SMTP retry')
 run(['--import','tsx','tests/fixtures/inquiry-smtp.ts','check'])
 console.log('PASS: production inquiry persistence, SMTP-before-response acceptance, rejection, bounded timeout, safe logs and handler version marker.')
} catch(error) {
 console.error(logs)
 throw error
} finally {
 if (app) { app.kill('SIGTERM'); await Promise.race([new Promise(resolve => app.once('exit', resolve)), delay(3000)]); if (app.exitCode === null) app.kill('SIGKILL') }
 for (const timer of timers) clearTimeout(timer)
 for (const socket of sockets) socket.destroy()
 await new Promise(resolve => server.close(resolve))
 rmSync(dir, { recursive:true, force:true })
}
