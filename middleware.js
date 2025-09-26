// middleware.js
import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = process.env.COOKIE_NAME || 'cea_session'
const ENC = new TextEncoder()

async function leerSesion(req) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  const secret = process.env.AUTH_SECRET
  if (!secret) return null
  try {
    const { payload } = await jwtVerify(token, ENC.encode(secret))
    return payload // { usuario, nombreCompleto, rol, email, ... }
  } catch {
    return null
  }
}

// Mapa de acceso por prefijo de ruta
const ACCESO = [
  { prefix: '/instructor/practica', roles: ['INSTRUCTOR PRÁCTICA'] },
  { prefix: '/instructor/teoria', roles: ['INSTRUCTOR TEORÍA', 'AUXILIAR ADMINISTRATIVO'] },
  { prefix: '/admin', roles: ['ADMINISTRATIVO'] },
  { prefix: '/superusuario', roles: ['SUPERUSUARIO'] }, // ← Solo SUPERUSUARIO
]

function rolesPermitidosPara(pathname) {
  for (const r of ACCESO) {
    if (pathname.startsWith(r.prefix)) return r.roles
  }
  return null
}

export async function middleware(req) {
  const { pathname } = req.nextUrl

  // Este middleware SOLO corre en rutas del matcher (prefijos de abajo).
  const session = await leerSesion(req)
  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const rol = String(session.rol || '').toUpperCase()

  // Regla especial: SUPERUSUARIO solo a /superusuario
  if (rol === 'SUPERUSUARIO' && !pathname.startsWith('/superusuario')) {
    const url = req.nextUrl.clone()
    url.pathname = '/superusuario'
    return NextResponse.redirect(url)
  }

  const permitidos = rolesPermitidosPara(pathname) || []
  if (!permitidos.includes(rol)) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// Rutas protegidas (sin patrones raros)
export const config = {
  matcher: [
    '/instructor/practica/:path*',
    '/instructor/teoria/:path*',
    '/admin/:path*',
    '/superusuario/:path*',
  ],
}
