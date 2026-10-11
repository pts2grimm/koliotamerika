import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
test('real Payload global protects integration settings and credentials', { timeout: 120000 }, () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'koa-integrations-'))
  try {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'tests/fixtures/integration-settings.ts'], {
      encoding: 'utf8', timeout: 110000,
      env: { PATH: process.env.PATH, NODE_ENV: 'production', PREVIEW_MODE: 'false',
        PAYLOAD_SECRET: 'integration-tests-only-not-live', DATABASE_URI: 'file:' + path.join(dir, 'test.db'),
        MEDIA_DIR: path.join(dir, 'media'), NEXT_PUBLIC_SERVER_URL: 'http://localhost:3100' },
    })
    assert.ifError(result.error)
    assert.equal(result.status, 0, result.stdout + result.stderr)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
