// app/api/login/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { SignJWT } from 'jose'

// ---------- Config ----------
const COOKIE_NAME = process.env.COOKIE_NAME || 'cea_session'
const secureCookies = process.env.NODE_ENV === 'production'

// Cliente Supabase con service role (solo en servidor)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Hash SHA-256 (igual al tuyo)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password, 'utf8').digest('hex')
}

// JWT helpers (inline para no crear más archivos)
const ENC = new TextEncoder()
function getSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('Falta AUTH_SECRET en .env.local')
  return ENC.encode(secret)
}
async function firmarSesion(payload, expSeconds = 60 * 60 * 8) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${expSeconds}s`)
    .sign(getSecret())
}

export async function POST(req) {
  try {
    const { usuario, password } = await req.json()

    if (!usuario || !password) {
      return NextResponse.json(
        { status: 'failed', message: 'Usuario y contraseña requeridos.' },
        { status: 400 }
      )
    }

    const hashedPassword = hashPassword(password)

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, usuario, contrasena, nombre_completo, rol, estado, documento, email')
      .eq('usuario', usuario)
      .limit(1)

    if (error) {
      console.error('Error consultando Supabase:', error)
      return NextResponse.json(
        { status: 'failed', message: 'Error al consultar la base de datos.' },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { status: 'failed', message: 'Usuario no encontrado.' },
        { status: 401 }
      )
    }

    const user = data[0]

    if (user.contrasena !== hashedPassword) {
      return NextResponse.json(
        { status: 'failed', message: 'Contraseña incorrecta.' },
        { status: 401 }
      )
    }

    if (String(user.estado || '').toUpperCase() !== 'ACTIVO') {
      return NextResponse.json(
        { status: 'failed', message: `Cuenta no activa. Estado: ${user.estado}` },
        { status: 403 }
      )
    }

    // --- Firma JWT ---
    const token = await firmarSesion({
      sub: String(user.id),
      usuario: user.usuario,
      nombreCompleto: user.nombre_completo,
      documento: user.documento || '',
      rol: user.rol,
      email: user.email || ''
      // empresaId: 'CEA-XYZ' // (para multi-empresa más adelante)
    })

    // Respuesta (el front sigue leyendo esto para localStorage)
    const res = NextResponse.json({
      status: 'success',
      usuario: user.usuario,
      nombreCompleto: user.nombre_completo,
      documento: user.documento || '',
      rol: user.rol
    })

    // 🍪 Cookie **de sesión** (SIN maxAge ni expires)
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: secureCookies, // false en dev, true en prod
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 30 // ⬅️ 30 minutos// <- sin maxAge / expires => el navegador la elimina al cerrar
    })

    return res
  } catch (err) {
    console.error('Error en API /login:', err)
    return NextResponse.json(
      { status: 'failed', message: 'Error interno en el servidor.' },
      { status: 500 }
    )
  }
}
