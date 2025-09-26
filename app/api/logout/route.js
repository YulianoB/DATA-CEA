// app/api/logout/route.js
import { NextResponse } from 'next/server'

const COOKIE_NAME = process.env.COOKIE_NAME || 'cea_session'
const secureCookies = process.env.NODE_ENV === 'production'

// Opcional: cerrar sesión también con GET (útil si alguna vez usas un enlace)
export async function GET() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'lax',
    path: '/',
    // estas dos líneas garantizan el borrado en todos los navegadores
    maxAge: 0,
    expires: new Date(0),
  })
  return res
}

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  })
  return res
}

