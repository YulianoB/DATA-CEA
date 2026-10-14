import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { MASTER_COOKIE, verificarSesionMaster } from '@/lib/masterAuthServer'

export default async function MasterHome() {
  const cookieStore = await cookies()
  if (!await verificarSesionMaster(cookieStore.get(MASTER_COOKIE)?.value)) redirect('/master/login')
  return <main className="min-h-screen bg-[#f3f6fb] px-4 py-8 text-slate-900 md:px-8">
    <div className="mx-auto max-w-6xl space-y-7">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#204c93] p-7 text-white shadow-lg md:p-10">
        <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-200">DATA CEA · PANEL MASTER</p><h1 className="mt-3 text-3xl font-bold">Administración central</h1><p className="mt-2 max-w-xl text-sm text-blue-100">Control de empresas afiliadas y credenciales seguras desde un solo lugar.</p></div>
        <form action="/api/master/logout" method="post"><button type="submit" className="rounded-xl border border-white/40 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10">Cerrar sesión</button></form>
      </header>
      <section className="grid gap-5 md:grid-cols-2">
        <a href="/master/empresas" className="group rounded-2xl border border-slate-100 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="mb-5 inline-flex rounded-xl bg-blue-50 p-3 text-2xl">🏢</div><h2 className="text-xl font-bold">Empresas afiliadas</h2><p className="mt-2 text-sm leading-6 text-slate-500">Registra, consulta, edita y administra los CEA de la plataforma.</p><span className="mt-5 inline-block text-sm font-semibold text-[#204c93]">Administrar empresas →</span>
        </a>
        <a href="/master/empresas" className="group rounded-2xl border border-slate-100 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="mb-5 inline-flex rounded-xl bg-blue-50 p-3 text-2xl">🔐</div><h2 className="text-xl font-bold">Conexiones y Vault</h2><p className="mt-2 text-sm leading-6 text-slate-500">Consulta el estado de las credenciales administrativas y gestiona las claves por CEA.</p><span className="mt-5 inline-block text-sm font-semibold text-[#204c93]">Ver credenciales →</span>
        </a>
      </section>
      <p className="text-xs text-slate-400">Acceso exclusivo del administrador Master. Las claves privadas no se muestran en el navegador después de guardarlas.</p>
    </div>
  </main>
}
