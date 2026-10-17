import { consentLifetime } from './tracking-consent'
import { consentPolicyVersion, receiptStorageKey, type ConsentAction } from './consent-audit'

// Runs only on an explicit choice. Never on a page view, hover or banner impression.
export function recordConsentChoice(analytics: boolean, marketing: boolean, action: ConsentAction) {
  try {
    const now = Date.now()
    let receipt = crypto.randomUUID()
    try {
      const saved = JSON.parse(localStorage.getItem(receiptStorageKey) || 'null')
      if (saved && typeof saved.id === 'string' && /^[0-9a-f-]{36}$/i.test(saved.id) &&
          Number.isFinite(saved.expiresAt) && saved.expiresAt > now && saved.expiresAt <= now + consentLifetime * 1000) receipt = saved.id
      localStorage.setItem(receiptStorageKey, JSON.stringify({ id: receipt, expiresAt: now + consentLifetime * 1000 }))
    } catch { /* A blocked store creates a new receipt for this choice. */ }
    // keepalive lets withdrawal immediately reload and remove tracking libraries.
    // A failed audit never delays or reverses the visitor's locally saved choice.
    void fetch('/api/consent-choice', {
      method: 'POST', credentials: 'same-origin', keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receipt, event: crypto.randomUUID(), analytics, marketing, action, policyVersion: consentPolicyVersion }),
    }).catch(() => {})
  } catch { /* Consent must still work without the audit service. */ }
}
