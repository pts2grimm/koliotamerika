import assert from 'node:assert/strict'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { runSocialCron } from '../scripts/social-cron.mjs'

const env = {
  SOCIAL_CRON_SECRET: 'test-only-secret-never-a-production-key',
  NEXT_PUBLIC_SERVER_URL: 'https://koliotamerika.bg',
}
const success = { created: 0, unfilled: 0, sent: 1, paused: false }
async function invoke(overrides = {}) {
  const logs = []
  let calls = 0
  const code = await runSocialCron({
    env,
    log: (line) => logs.push(line),
    ...overrides,
    fetchImpl: async (...args) => {
      calls++
      return overrides.fetchImpl ? overrides.fetchImpl(...args) : Response.json(success)
    },
  })
  assert.ok(!logs.join('').includes(env.SOCIAL_CRON_SECRET))
  return { code, calls, logs: logs.map((line) => JSON.parse(line)) }
}

test('uses authenticated POST, fixed production endpoint and no redirects', async () => {
  const result = await invoke({ fetchImpl: async (url, options) => {
    assert.equal(url, 'https://koliotamerika.bg/api/cron/social')
    assert.equal(options.method, 'POST')
    assert.equal(options.headers.Authorization, 'Bearer ' + env.SOCIAL_CRON_SECRET)
    assert.equal(options.redirect, 'error')
    assert.ok(options.signal instanceof AbortSignal)
    assert.equal(options.signal.aborted, false)
    return Response.json({ ...success, debug: env.SOCIAL_CRON_SECRET })
  } })
  assert.deepEqual(result, { code: 0, calls: 1, logs: [{ ok: true, ...success }] })
})

test('paused or empty run is reported honestly, not as a publication', async () => {
  for (const paused of [true, false]) {
    const response = { created: 2, unfilled: 1, sent: 0, paused }
    const result = await invoke({ fetchImpl: async () => Response.json(response) })
    assert.deepEqual(result.logs, [{ ok: true, ...response }])
    assert.equal(result.code, 0)
  }
})

test('missing/short/unsafe secrets and non-production environments send no request', async () => {
  for (const secret of [undefined, 'short', 'x'.repeat(32) + '\n', 'x'.repeat(32) + ' ']) {
    const result = await invoke({ env: { ...env, SOCIAL_CRON_SECRET: secret } })
    assert.equal(result.calls, 0)
    assert.equal(result.code, 1)
  }
  for (const changed of [
    { PREVIEW_MODE: 'true' },
    { NEXT_PUBLIC_SERVER_URL: 'https://preview.example' },
    { NEXT_PUBLIC_SERVER_URL: undefined },
  ]) {
    const result = await invoke({ env: { ...env, ...changed } })
    assert.equal(result.calls, 0)
    assert.equal(result.code, 1)
  }
})

test('HTTP failures have bounded logs and no retry or response-body leakage', async () => {
  for (const status of [403, 429, 503]) {
    const result = await invoke({
      fetchImpl: async () => new Response(env.SOCIAL_CRON_SECRET, { status }),
    })
    assert.deepEqual(result, {
      code: 1, calls: 1, logs: [{ ok: false, code: 'HTTP_' + status }],
    })
  }
})

test('network/timeout errors are sanitized and never retried', async () => {
  const result = await invoke({ fetchImpl: async () => {
    throw new Error(env.SOCIAL_CRON_SECRET)
  } })
  assert.deepEqual(result, {
    code: 1, calls: 1, logs: [{ ok: false, code: 'REQUEST_FAILED_CHECK_ADMIN_HISTORY' }],
  })
})

test('invalid JSON or incorrect counters cannot be reported as success', async () => {
  for (const value of [null, {}, { ...success, sent: -1 }, { ...success, sent: '1' },
    { ...success, paused: 'false' }]) {
    const result = await invoke({ fetchImpl: async () => Response.json(value) })
    assert.equal(result.code, 1)
    assert.equal(result.calls, 1)
    assert.equal(result.logs[0].code, 'INVALID_RESPONSE')
  }
  const result = await invoke({ fetchImpl: async () => new Response('not JSON') })
  assert.equal(result.code, 1)
  assert.equal(result.calls, 1)
})

test('Node CLI exits nonzero with safe error when no secret is loaded', () => {
  const child = spawnSync(process.execPath, ['scripts/social-cron.mjs'], {
    env: { ...process.env, SOCIAL_CRON_SECRET: '' }, encoding: 'utf8',
  })
  assert.equal(child.status, 1)
  assert.deepEqual(JSON.parse(child.stdout), { ok: false, code: 'INVALID_CRON_SECRET' })
  assert.equal(child.stderr, '')
})
