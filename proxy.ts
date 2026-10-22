import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Optimistic route guard: `agentra_authed` is a presence flag set by lib/auth/session.ts
// next to the tokens. It only decides whether to render /agentra/* or bounce to /login;
// the API still authorizes every request with the bearer token.
//
// Auth pages (/login, /register, /forgot-password) are intentionally NOT redirected here:
// the flag can outlive the tokens (sessionStorage is per-tab, the cookie per-browser), and
// bouncing /login back to /agentra in that state caused an endless redirect loop. The
// login page itself forwards users that still hold a valid token.
export function proxy(req: NextRequest) {
  if (req.cookies.has('agentra_authed')) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.search = ''
  url.searchParams.set('from', req.nextUrl.pathname + req.nextUrl.search)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/agentra/:path*'],
}
