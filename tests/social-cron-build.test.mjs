import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, readdirSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, symlinkSync, rmSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

test('production trace includes a runnable cron script in the deployed directory', () => {
  const build = process.env.NEXT_DIST_DIR || '.next'
  const traces = readdirSync(join(build, 'server/app'), { recursive: true })
    .filter((file) => String(file).replaceAll('\\', '/').endsWith('api/cron/social/route.js.nft.json'))
  assert.equal(traces.length, 1, 'Expected the production social route trace')
  const tracePath = join(build, 'server/app', traces[0])
  const trace = JSON.parse(readFileSync(tracePath, 'utf8'))
  const script = resolve('scripts/social-cron.mjs')
  assert.ok(trace.files.some((file) => resolve(dirname(tracePath), file) === script),
    'Cron script must be included in the production deployment trace')

  const directory = mkdtempSync(join(tmpdir(), 'social-cron-deployment-'))
  try {
    const release = join(directory, 'release')
    mkdirSync(join(release, 'scripts'), { recursive: true })
    copyFileSync(script, join(release, 'scripts/social-cron.mjs'))
    symlinkSync(release, join(directory, 'current'), 'dir')
    const envFile = join(directory, 'cron.env')
    writeFileSync(envFile, 'SOCIAL_CRON_SECRET=fixture-secret-for-cron-deployment-only\nNEXT_PUBLIC_SERVER_URL=https://koliotamerika.bg\nPREVIEW_MODE=false\n')
    const mock = join(directory, 'mock-fetch.mjs')
    writeFileSync(mock, `
      import assert from 'node:assert/strict'
      globalThis.fetch = async (url, options) => {
        assert.equal(url, 'https://koliotamerika.bg/api/cron/social')
        assert.equal(options.method, 'POST')
        assert.equal(options.headers.Authorization, 'Bearer fixture-secret-for-cron-deployment-only')
        return Response.json({created: 0, unfilled: 0, sent: 0, paused: false})
      }
    `)
    // No application credentials or external requests are used.
    const environment = { ...process.env }
    for (const name of ['SOCIAL_CRON_SECRET', 'NEXT_PUBLIC_SERVER_URL', 'PREVIEW_MODE']) delete environment[name]
    const child = spawnSync(process.execPath, [
      '--env-file=' + envFile, '--import', mock,
      join(directory, 'current/scripts/social-cron.mjs'),
    ], { cwd: directory, env: environment, encoding: 'utf8' })
    assert.equal(child.status, 0, child.stderr)
    assert.deepEqual(JSON.parse(child.stdout), {
      ok: true, created: 0, unfilled: 0, sent: 0, paused: false,
    })
    assert.equal(child.stderr, '')
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
