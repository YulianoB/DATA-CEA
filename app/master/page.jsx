import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { MASTER_COOKIE, verificarSesionMaster } from '@/lib/masterAuthServer'

export default async function MasterHome() {
  const cookieStore = await cookies()
  if (!await verificarSesionMaster(cookieStore.get(MASTER_COOKIE)?.value)) {
    redirect('/master/login')
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-slate-900">Administración Central — DATA CEA</h1>
        <p className="mt-3 text-slate-700">Acceso Master autorizado. La administración de empresas y Vault se implementará en la siguiente etapa.</p>
        <form action="/api/master/logout" method="post" className="mt-6">
          <button className="rounded-lg bg-slate-800 px-5 py-3 text-white" type="submit">Cerrar sesión Master</button>
        </form>
      </div>
    </main>
  )
}
