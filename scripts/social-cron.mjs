import { realpathSync } from 'node:fs'

// No Payload/database initialization here: use the application's protected runner.
export async function runSocialCron({
  env = process.env,
  fetchImpl = globalThis.fetch,
  log = console.log,
} = {}) {
  const fail = (code) => {
    log(JSON.stringify({ ok: false, code }))
    return 1
  }
  const secret = env.SOCIAL_CRON_SECRET
  if (typeof secret !== 'string' || secret.length < 32 || /[^\x21-\x7e]/.test(secret)) {
    return fail('INVALID_CRON_SECRET')
  }
  if (env.PREVIEW_MODE === 'true' ||
      env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, '') !== 'https://koliotamerika.bg') {
    return fail('NOT_PRODUCTION')
  }
  try {
    const response = await fetchImpl('https://koliotamerika.bg/api/cron/social', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + secret },
      redirect: 'error',
      signal: AbortSignal.timeout(115_000),
    })
    if (!response.ok) return fail('HTTP_' + response.status)
    const result = await response.json()
    const counts = ['created', 'unfilled', 'sent']
    if (!result || typeof result.paused !== 'boolean' ||
        !counts.every((key) => Number.isSafeInteger(result[key]) && result[key] >= 0)) {
      return fail('INVALID_RESPONSE')
    }
    // Only allowlisted counters; never print response bodies, tokens or thrown errors.
    log(JSON.stringify({
      ok: true,
      created: result.created,
      unfilled: result.unfilled,
      sent: result.sent,
      paused: result.paused,
    }))
    return 0
  } catch {
    // Do not retry: the server may still have completed a publication.
    return fail('REQUEST_FAILED_CHECK_ADMIN_HISTORY')
  }
}

if (process.argv[1] && realpathSync(new URL(import.meta.url)) === realpathSync(process.argv[1])) {
  process.exitCode = await runSocialCron()
}
