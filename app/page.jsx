// app/page.jsx (Server Component)
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { jwtVerify } from 'jose'

const COOKIE_NAME = process.env.COOKIE_NAME || 'cea_session'
const ENC = new TextEncoder()

async function getSession() {
  const token = cookies().get(COOKIE_NAME)?.value // ← sin await
  if (!token) return null
  const secret = process.env.AUTH_SECRET
  if (!secret) return null
  try {
    const { payload } = await jwtVerify(token, ENC.encode(secret))
    return payload // { rol, nombreCompleto, usuario, ... }
  } catch {
    return null
  }
}

export default async function Home() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const rol = String(session.rol || '').toUpperCase()

  if (rol === 'SUPERUSUARIO') {
    redirect('/superusuario')
  } else if (rol === 'INSTRUCTOR PRÁCTICA') {
    redirect('/instructor/practica')
  } else if (rol === 'INSTRUCTOR TEORÍA' || rol === 'AUXILIAR ADMINISTRATIVO') {
    redirect('/instructor/teoria')
  } else if (rol === 'ADMINISTRATIVO') {
    redirect('/admin')
  } else {
    redirect('/login')
  }
}
