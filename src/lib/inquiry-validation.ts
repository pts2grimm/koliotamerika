export function validateInquiry(input: unknown) {
 if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false as const, error: 'Невалидни данни.' }
 const value = input as Record<string, unknown>
 const text = (key: string, limit: number) => typeof value[key] === 'string' ? value[key].trim().slice(0, limit + 1) : ''
 const name = text('name', 120), email = text('email', 254), phone = text('phone', 40), message = text('message', 4000), car = text('car', 160), budget = text('budget', 80)
 if (text('website', 500)) return { ok: false as const, error: 'Заявката не може да бъде изпратена.' }
 if (name.length < 2 || name.length > 120) return { ok: false as const, error: 'Въведи име между 2 и 120 символа.' }
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { ok: false as const, error: 'Въведи валиден имейл.' }
 if (!/^[+\d\s().-]{7,40}$/.test(phone) || phone.replace(/\D/g, '').length < 7) return { ok: false as const, error: 'Въведи валиден телефон.' }
 if (message.length < 10 || message.length > 4000 || car.length > 160 || budget.length > 80) return { ok: false as const, error: 'Съобщението трябва да е между 10 и 4000 символа.' }
 if (value.consent !== true) return { ok: false as const, error: 'Запознай се с политиката за поверителност.' }
 return { ok: true as const, data: { name, email: email.toLowerCase(), phone, message, car, budget, consent: true } }
}
