import { NextResponse, type NextRequest } from 'next/server'
import { isPreview } from './lib/preview'

export function proxy(request: NextRequest) {
  if (!isPreview()) return NextResponse.next()
  const pathname = request.nextUrl.pathname
  const isPrivateRoute = ['/admin', '/api'].some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
  const response = isPrivateRoute || !['GET', 'HEAD', 'OPTIONS'].includes(request.method)
    ? NextResponse.json({ error: 'Демонстрационна версия: администрирането и изпращането на данни са изключени.' }, { status: 403 })
    : NextResponse.next()
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  if (isPrivateRoute) response.headers.set('Cache-Control', 'no-store')
  return response
}
