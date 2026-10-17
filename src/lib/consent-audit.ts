export const consentPolicyVersion = '2026-10-17'
export const receiptStorageKey = 'koa-consent-receipt'
export const consentActions = ['accept_all', 'necessary_only', 'save_preferences'] as const
export type ConsentAction = typeof consentActions[number]
export const consentActionLabels: Record<ConsentAction, string> = {
  accept_all: 'Приеми всички', necessary_only: 'Само необходимите', save_preferences: 'Запази избора',
}
export type ConsentSubmission = {
  receipt: string; event: string; analytics: boolean; marketing: boolean; action: ConsentAction; policyVersion: string
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function validateConsentSubmission(input: unknown): ConsentSubmission | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const data = input as Record<string, unknown>
  if (typeof data.receipt !== 'string' || !uuid.test(data.receipt) ||
      typeof data.event !== 'string' || !uuid.test(data.event) ||
      typeof data.analytics !== 'boolean' || typeof data.marketing !== 'boolean' ||
      !consentActions.includes(data.action as ConsentAction) || data.policyVersion !== consentPolicyVersion) return null
  if (data.action === 'accept_all' && (!data.analytics || !data.marketing)) return null
  if (data.action === 'necessary_only' && (data.analytics || data.marketing)) return null
  return { receipt: data.receipt, event: data.event, analytics: data.analytics, marketing: data.marketing,
    action: data.action as ConsentAction, policyVersion: consentPolicyVersion }
}
export function consentCategory(analytics: boolean, marketing: boolean) {
  return analytics && marketing ? 'Всички' : analytics ? 'Само статистика' : marketing ? 'Само реклама' : 'Само необходимите'
}
