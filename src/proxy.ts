import { NextResponse, type NextRequest } from 'next/server'
import { blockedProbePath } from './lib/request-screening'
import { isPreview } from './lib/preview'
import { requestIsIndexable } from './lib/indexing-policy'

export function proxy(request: NextRequest) {
  if (blockedProbePath(request.nextUrl.pathname)) {
    return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
  }
  if (!isPreview()) {
    const response = NextResponse.next()
    if (!requestIsIndexable(request.headers.get('host'))) response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    return response
  }
  const pathname = request.nextUrl.pathname
  const isPrivateRoute = ['/admin', '/api'].some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
  const response = isPrivateRoute || !['GET', 'HEAD', 'OPTIONS'].includes(request.method)
    ? NextResponse.json({ error: 'Демонстрационна версия: администрирането и изпращането на данни са изключени.' }, { status: 403 })
    : NextResponse.next()
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  if (isPrivateRoute) response.headers.set('Cache-Control', 'no-store')
  return response
}
