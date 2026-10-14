import { NextResponse } from 'next/server'
import { MASTER_COOKIE } from '@/lib/masterAuthServer'

export async function POST(request) {
  const response = NextResponse.redirect(new URL('/login', request.url), 303)
  response.cookies.set(MASTER_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
  return response
}
