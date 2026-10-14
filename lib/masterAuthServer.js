import 'server-only'
import { jwtVerify, SignJWT } from 'jose'

export const MASTER_COOKIE = 'cea_master_session'
const SESSION_SECONDS = 60 * 60 * 4
const enc = new TextEncoder()

function secret() {
  if (!process.env.AUTH_SECRET) throw new Error('Falta AUTH_SECRET')
  return enc.encode(process.env.AUTH_SECRET)
}

export async function crearSesionMaster(userId) {
  return new SignJWT({ scope: 'master', sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('data-cea-master')
    .setAudience('data-cea-master')
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(secret())
}

export async function verificarSesionMaster(token) {
  if (!token || !process.env.MASTER_ADMIN_USER_ID || !process.env.AUTH_SECRET) return false
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ['HS256'],
      issuer: 'data-cea-master',
      audience: 'data-cea-master',
    })
    return payload.scope === 'master' &&
      payload.sub === process.env.MASTER_ADMIN_USER_ID
  } catch {
    return false
  }
}

export const MASTER_SESSION_SECONDS = SESSION_SECONDS
