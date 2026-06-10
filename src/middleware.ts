import { NextResponse, type NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'classtrack-default-super-secret-key-change-me'

/**
 * Decodes and verifies a JWT token signature using the browser's native Web Crypto API.
 * This is compatible with the Next.js Edge Runtime.
 */
async function verifyToken(token: string, secret: string): Promise<any | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [headerB64, payloadB64, signatureB64] = parts

    const base64UrlDecode = (str: string) => {
      let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
      while (base64.length % 4) base64 += '='
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return bytes
    }

    const encoder = new TextEncoder()
    const secretBytes = encoder.encode(secret)

    const key = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const dataBytes = encoder.encode(`${headerB64}.${payloadB64}`)
    const signatureBytes = base64UrlDecode(signatureB64)

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      dataBytes
    )

    if (!isValid) return null

    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadJson)

    // Verify expiration time
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null
    }

    return payload
  } catch (err) {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const user = token ? await verifyToken(token, JWT_SECRET) : null

  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')
  const isAuthRoute = request.nextUrl.pathname === '/'

  // Redirect authenticated users trying to access login/auth route to the dashboard
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect unauthenticated users trying to access dashboard routes to the login page
  if (isDashboardRoute && !user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - image assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
