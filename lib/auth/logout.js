'use client'

// export nombrado (con llaves en el import)
export const cerrarSesion = async (router) => {
  try {
    await fetch('/api/logout', { method: 'POST' }) // invalida cookie si la hubiera
  } catch (_) {
    // no bloqueamos el cierre de sesión por un fallo de red
  } finally {
    try { localStorage.removeItem('currentUser') } catch {}
    router.push('/login')
  }
}
