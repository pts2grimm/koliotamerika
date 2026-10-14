type Environment = Record<string, string | undefined>

/** Keep credentials server-side; never trim or log the mailbox password. */
export function smtpConfiguration(env: Environment) {
 const host = env.SMTP_HOST?.trim(), from = env.SMTP_FROM?.trim()
 if (!host || !from) return null
 const port = Number(env.SMTP_PORT?.trim() || 587)
 if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid SMTP_PORT')
 const user = env.SMTP_USER?.trim()
 return {
  defaultFromAddress: from, defaultFromName: 'Коли от Америка', skipVerify: true,
  transportOptions: {
   host, port, secure: port === 465,
   // Some hosted runtimes expose only loopback interfaces. Still attempt DNS
   // and let the actual socket connection determine network reachability.
   allowInternalNetworkInterfaces: true,
   connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 30000, dnsTimeout: 5000,
   ...(port === 587 ? { requireTLS: true } : {}),
   ...(user ? { auth: { user, pass: env.SMTP_PASSWORD } } : {}),
  },
 }
}

/** Allowlisted categories only: SMTP messages/responses can contain credentials or PII. */
export function smtpFailureReason(error: unknown): string {
 const value = error && typeof error === 'object' ? error as { code?: unknown; responseCode?: unknown } : {}
 if (value.code === 'EAUTH' || value.responseCode === 535) return 'authentication'
 if (['EDNS', 'ENOTFOUND', 'EAI_AGAIN'].includes(String(value.code))) return 'dns'
 if (['ETIMEDOUT', 'ESOCKETTIMEDOUT'].includes(String(value.code))) return 'timeout'
 if (['ECONNECTION', 'ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH'].includes(String(value.code))) return 'connection'
 if (['ETLS', 'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'ERR_TLS_CERT_ALTNAME_INVALID', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'].includes(String(value.code))) return 'tls'
 if (value.code === 'EENVELOPE') return 'recipient_rejected'
 if (value.code === 'EMESSAGE') return 'message_rejected'
 return 'unknown'
}
