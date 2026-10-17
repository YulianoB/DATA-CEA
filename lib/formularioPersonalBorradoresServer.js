import 'server-only'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { ErrorFormularioPersonal, resolverFormularioPersonal } from '@/lib/formularioPersonalPublicoServer'

export const hashToken = (token) => createHash('sha256').update(token).digest('hex')
export const crearToken = () => randomBytes(32).toString('base64url')

export function verificarToken(token, hash) {
  if (typeof token !== 'string' || token.length < 30 || token.length > 150 || !hash) return false
  const a = Buffer.from(hashToken(token), 'hex')
  const b = Buffer.from(hash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function contexto(body) {
  if (!body || typeof body !== 'object') throw new ErrorFormularioPersonal('Solicitud inválida.', 400)
  return resolverFormularioPersonal(body.cea, body.formulario)
}

export function errorPublico(error) {
  const status = error instanceof ErrorFormularioPersonal ? error.status : 503
  return { status, mensaje: status === 404 ? 'Enlace no disponible.' : status === 400 ? 'Solicitud inválida.' : status === 409 ? 'No es posible iniciar otro formulario. Comunícate con la administración del CEA.' : status === 401 ? 'No fue posible verificar la clave de recuperación.' : 'No fue posible completar la operación. Intenta más tarde.' }
}
