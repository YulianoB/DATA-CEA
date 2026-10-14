import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { crearSesionMaster, MASTER_COOKIE, MASTER_SESSION_SECONDS } from '@/lib/masterAuthServer'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const { email, password } = await request.json()
    if (typeof email !== 'string' || typeof password !== 'string' ||
        !email.trim() || !password || email.length > 254 || password.length > 1024) {
      return NextResponse.json({ message: 'Usuario y contraseña requeridos.' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_MASTER_URL
    const key = process.env.SUPABASE_MASTER_SERVICE_ROLE_KEY
    const allowedId = process.env.MASTER_ADMIN_USER_ID
    if (!url || !key || !allowedId || !process.env.AUTH_SECRET) {
      return NextResponse.json({ message: 'Acceso Master no configurado.' }, { status: 503 })
    }

    // Cliente aislado por solicitud; la clave administrativa nunca sale al navegador.
    const master = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { data, error } = await master.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error || !data?.user || data.user.id !== allowedId) {
      return NextResponse.json({ message: 'Credenciales no autorizadas.' }, { status: 401 })
    }

    const token = await crearSesionMaster(data.user.id)
    const response = NextResponse.json({ ok: true })
    response.cookies.set(MASTER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/master',
      maxAge: MASTER_SESSION_SECONDS,
    })
    return response
  } catch {
    return NextResponse.json({ message: 'No fue posible iniciar sesión.' }, { status: 500 })
  }
}
