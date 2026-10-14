import assert from 'node:assert/strict'
import test from 'node:test'
import { smtpConfiguration } from '../src/lib/smtp-config'

test('Titan configuration normalizes host and port but preserves the password', () => {
 const result = smtpConfiguration({ SMTP_HOST: ' smtp.titan.email ', SMTP_FROM: ' office@example.test ', SMTP_PORT: ' 465 ', SMTP_USER: ' office@example.test ', SMTP_PASSWORD: ' password with spaces ' })!
 assert.equal(result.defaultFromAddress, 'office@example.test')
 assert.equal(result.transportOptions.host, 'smtp.titan.email')
 assert.equal(result.transportOptions.secure, true)
 assert.equal(result.transportOptions.auth?.pass, ' password with spaces ')
 assert.equal(result.transportOptions.allowInternalNetworkInterfaces, true)
 assert.equal(smtpConfiguration({ SMTP_HOST: 'smtp.titan.email' }), null)
 assert.equal(smtpConfiguration({ SMTP_FROM: 'office@example.test' }), null)
 assert.throws(() => smtpConfiguration({ SMTP_HOST: 'smtp.titan.email', SMTP_FROM: 'office@example.test', SMTP_PORT: 'bad' }), /Invalid SMTP_PORT/)
})
test('submission port requires STARTTLS and keeps certificate verification enabled', () => {
 const result = smtpConfiguration({ SMTP_HOST: 'smtp.titan.email', SMTP_FROM: 'office@example.test', SMTP_PORT: '587' })!
 assert.equal(result.transportOptions.secure, false)
 assert.equal(result.transportOptions.requireTLS, true)
 assert.equal('tls' in result.transportOptions, false)
 assert.equal('debug' in result.transportOptions, false)
})
