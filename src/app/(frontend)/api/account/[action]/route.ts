import { createLocalReq, logoutOperation } from 'payload'
import { cms } from '@/lib/data'
import { AccountError, accountBody, accountLimit, accountResponse, customerFromRequest, setCustomerCookie } from '@/lib/account-server'
import { passwordRecoveryEnabled } from '@/lib/accounts-enabled'
import { accountEmail, validPassword, vehicleInput, vehicleKey } from '@/lib/account-validation'
type Context = { params: Promise<{ action: string }> }
export async function GET(request: Request, { params }: Context) {
 if ((await params).action !== 'inquiries') return accountResponse({ error: 'Няма такава страница.' }, 404)
 try {
  const user = await customerFromRequest(request)
  if (!user) return accountResponse({ error: 'Влез в профила си.' }, 401)
  const rawPage = Number(new URL(request.url).searchParams.get('page') || 1)
  const page = Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 10000 ? rawPage : 1
  const result = await (await cms()).find({ collection: 'inquiries', where: { customer: { equals: user.id } }, depth: 0, sort: '-createdAt', limit: 20, page })
  return accountResponse({ docs: result.docs.map(({ id, car, message, status, createdAt }) => ({ id, car, message, status, createdAt })), page: result.page, totalPages: result.totalPages })
 } catch { return accountResponse({ error: 'Запитванията не могат да се заредят.' }, 503) }
}
export async function POST(request: Request, { params }: Context) {
 try {
  const { action } = await params
  if (!['register', 'login', 'logout', 'save', 'remove', 'import', 'forgot', 'reset'].includes(action)) return accountResponse({ error: 'Непознато действие.' }, 404)
  const body = await accountBody(request)
  const payload = await cms()
  if (['register', 'login', 'forgot', 'reset'].includes(action)) {
   const email = accountEmail(body.email)
   await accountLimit(request, action, email || undefined)
   if (action !== 'reset' && !email) throw new AccountError('Въведи валиден имейл.')
   if (action === 'forgot') {
    if (!passwordRecoveryEnabled()) throw new AccountError('Възстановяването по имейл още не е настроено. Свържи се с екипа.', 503)
    try { await payload.forgotPassword({ collection: 'customers', data: { email: email! } }) } catch (error) { console.warn('Password recovery delivery failed:', error instanceof Error ? error.name : 'Unknown') }
    return accountResponse({ success: true })
   }
   if (action === 'reset') {
    if (!validPassword(body.password) || typeof body.token !== 'string' || !/^[a-f0-9]{40}$/.test(body.token)) throw new AccountError('Невалидна връзка или парола. Паролата трябва да е между 12 и 128 символа.')
    try {
     const result = await payload.resetPassword({ collection: 'customers', data: { token: body.token, password: body.password }, overrideAccess: true })
     if (!result.token) throw new Error('Missing session')
     return setCustomerCookie(accountResponse({ success: true }), result.token)
    } catch { throw new AccountError('Връзката е невалидна или е изтекла. Поискай нова.') }
   }
   if (action === 'register') {
    if (!validPassword(body.password) || typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.length > 120 || body.consent !== true || (body.phone != null && (typeof body.phone !== 'string' || body.phone.length > 40))) throw new AccountError('Попълни името, приeми политиката и избери парола между 12 и 128 символа.')
    // Registration is enabled only after the administrator has been provisioned.
    if (!(await payload.count({ collection: 'users' })).totalDocs) throw new AccountError('Регистрацията още не е активирана от екипа.', 503)
    try { await payload.create({ collection: 'customers', data: { email: email!, password: body.password, name: body.name.trim(), phone: typeof body.phone === 'string' ? body.phone.trim() : '', consentedAt: new Date().toISOString() } }) }
    catch { throw new AccountError('Неуспешна регистрация. Ако вече имаш профил, използвай „Вход“ или възстанови паролата.') }
   }
   if (typeof body.password !== 'string' || body.password.length > 128 || !body.password) throw new AccountError('Въведи имейл и парола.')
   try {
    const login = await payload.login({ collection: 'customers', data: { email: email!, password: body.password } })
    if (!login.token) throw new Error('Missing session')
    return setCustomerCookie(accountResponse({ success: true }), login.token, login.exp)
   } catch { throw new AccountError('Невалиден имейл или парола. При много опити изчакай 10 минути.', 401) }
  }
  const user = await customerFromRequest(request)
  if (action === 'logout') {
   if (user) await logoutOperation({ collection: payload.collections.customers, req: await createLocalReq({ user }, payload) })
   return setCustomerCookie(accountResponse({ success: true }), '')
  }
  if (!user) throw new AccountError('Влез в профила си.', 401)
  const input = action === 'import' ? body.vehicles : [body.vehicle]
  if (!Array.isArray(input) || input.length > 100 || !input.length) throw new AccountError('Избери до 100 автомобила.')
  const vehicles = input.map(vehicleInput)
  if (vehicles.some(v => !v)) throw new AccountError('Невалиден автомобил.')
  for (const vehicle of vehicles) {
   if (!vehicle) continue
   const key = `${user.id}:${vehicleKey(vehicle)}`
   if (action === 'remove') { await payload.delete({ collection: 'saved-vehicles', where: { and: [{ key: { equals: key } }, { customer: { equals: user.id } }] } }); continue }
   if ((await payload.count({ collection: 'saved-vehicles', where: { key: { equals: key } } })).totalDocs) continue
   if ((await payload.count({ collection: 'saved-vehicles', where: { customer: { equals: user.id } } })).totalDocs >= 100) throw new AccountError('Можеш да запазиш до 100 автомобила.')
   try { await payload.create({ collection: 'saved-vehicles', data: { ...vehicle, key, customer: user.id } }) }
   catch (error) { if (!(await payload.count({ collection: 'saved-vehicles', where: { key: { equals: key } } })).totalDocs) throw error }
  }
  return accountResponse({ success: true })
 } catch (error) {
  if (error instanceof AccountError) return accountResponse({ error: error.message }, error.status)
  console.error('Account operation failed:', error instanceof Error ? error.name : 'Unknown')
  return accountResponse({ error: 'Действието не беше завършено. Опитай отново.' }, 503)
 }
}
