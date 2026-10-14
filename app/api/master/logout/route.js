import { NextResponse } from 'next/server'
import { MASTER_COOKIE } from '@/lib/masterAuthServer'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(MASTER_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/master',
    maxAge: 0,
  })
  return response
}
