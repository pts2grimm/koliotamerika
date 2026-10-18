import { getPayload } from 'payload'
import { guardAdminAuth } from '@/lib/admin-auth-request'
import config from '@payload-config'
import { REST_GET, REST_POST, REST_DELETE, REST_PATCH, REST_PUT, REST_OPTIONS } from '@payloadcms/next/routes'
export const GET = REST_GET(config)
const post = REST_POST(config)
export async function POST(request: Request, context: Parameters<typeof post>[1]) {
  const { slug = [] } = await context.params
  if (slug.length === 2 && slug[0] === 'users' && ['login', 'forgot-password', 'reset-password'].includes(slug[1])) {
    const guarded = await guardAdminAuth(request, slug[1], () => getPayload({ config }))
    if (guarded instanceof Response) return guarded
    return post(guarded, context)
  }
  return post(request, context)
}
export const DELETE = REST_DELETE(config)
export const PATCH = REST_PATCH(config)
export const PUT = REST_PUT(config)
export const OPTIONS = REST_OPTIONS(config)
