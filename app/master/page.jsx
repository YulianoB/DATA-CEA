import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { MASTER_COOKIE, verificarSesionMaster } from '@/lib/masterAuthServer'
import EmpresasMaster from './EmpresasMaster'

export default async function MasterHome() {
  const cookieStore = await cookies()
  if (!await verificarSesionMaster(cookieStore.get(MASTER_COOKIE)?.value)) redirect('/login')
  return <EmpresasMaster />
}
