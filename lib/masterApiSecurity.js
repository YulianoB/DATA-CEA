import { MASTER_COOKIE, verificarSesionMaster } from '@/lib/masterAuthServer'

export async function autorizadoMaster(request) {
  return verificarSesionMaster(request.cookies.get(MASTER_COOKIE)?.value)
}

export function origenValido(request) {
  const origin = request.headers.get('origin')
  if (!origin) return false
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}
