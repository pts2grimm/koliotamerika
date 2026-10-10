import { cms } from '@/lib/data'
import { accountResponse, customerFromRequest } from '@/lib/account-server'
import { accountsEnabled, passwordRecoveryEnabled } from '@/lib/accounts-enabled'
import { vehicleInput } from '@/lib/account-validation'
export async function GET(request: Request) {
 try {
  const user = await customerFromRequest(request)
  const saved = user ? (await (await cms()).find({ collection: 'saved-vehicles', where: { customer: { equals: user.id } }, depth: 0, limit: 100, sort: '-createdAt' })).docs.map(vehicleInput).filter(Boolean) : []
  return accountResponse({ enabled: accountsEnabled(), recovery: passwordRecoveryEnabled(), user: user ? { id: user.id, name: user.name, email: user.email, phone: user.phone || '' } : null, saved })
 } catch { return accountResponse({ error: 'Профилът не може да се зареди. Опитай отново.' }, 503) }
}
