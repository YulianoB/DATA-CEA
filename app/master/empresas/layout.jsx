import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { MASTER_COOKIE, verificarSesionMaster } from '@/lib/masterAuthServer'

export default async function LayoutEmpresas({ children }) {
  const store = await cookies()
  if (!await verificarSesionMaster(store.get(MASTER_COOKIE)?.value)) {
    redirect('/master/login')
  }
  return children
}
