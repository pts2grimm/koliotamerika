import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

// A non-serializable capability used only by trusted server calls, never by REST clients.
export const integrationSecrets = Symbol('integration-secrets')
function key(secret = process.env.PAYLOAD_SECRET) {
  if (!secret) throw new Error('Integration encryption key is unavailable.')
  return createHash('sha256').update('koa-integrations-v1\0').update(secret).digest()
}
export function encryptIntegrationToken(value: string, secret?: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(secret), iv)
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return ['enc1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.')
}
export function decryptIntegrationToken(value: string, secret?: string) {
  try {
    const [version, iv, tag, data, extra] = value.split('.')
    if (version !== 'enc1' || extra || !iv || !tag || !data) throw new Error()
    const cipher = createDecipheriv('aes-256-gcm', key(secret), Buffer.from(iv, 'base64url'))
    cipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([cipher.update(Buffer.from(data, 'base64url')), cipher.final()]).toString('utf8')
  } catch { throw new Error('CAPI token could not be decrypted. Save the token again in Integrations.') }
}
