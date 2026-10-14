'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginMaster() {
  const router = useRouter()
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [loading,setLoading] = useState(false)
  const [error,setError] = useState('')
  const [mostrar,setMostrar] = useState(false)
  async function ingresar(event) {
    event.preventDefault();setLoading(true);setError('')
    try {
      const response = await fetch('/api/master/login',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({email,password})})
      const data = await response.json()
      if (!response.ok) throw Error(data.message || 'No fue posible ingresar.')
      router.replace('/master');router.refresh()
    } catch(err) {setError(err.message || 'Error de acceso.')} finally {setLoading(false)}
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-4 py-10 text-slate-900">
    <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-xl md:grid-cols-2">
      <section className="flex flex-col justify-between bg-[#204c93] p-9 text-white md:p-12">
        <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-200">DATA CEA</p><h1 className="mt-10 text-4xl font-bold leading-tight">Administración central</h1><p className="mt-5 text-sm leading-7 text-blue-100">Gestiona los centros de enseñanza automovilística y sus conexiones desde un entorno seguro y organizado.</p></div>
        <p className="mt-14 text-xs text-blue-200">Panel exclusivo del administrador Master</p>
      </section>
      <form onSubmit={ingresar} className="space-y-6 p-8 md:p-12">
        <div><p className="text-xs font-bold uppercase tracking-widest text-[#204c93]">Acceso seguro</p><h2 className="mt-2 text-2xl font-bold">Bienvenido al Panel Master</h2><p className="mt-2 text-sm text-slate-500">Ingresa con tus credenciales de administrador central.</p></div>
        <label className="block text-sm font-semibold text-slate-700">Correo electrónico<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="administrador@empresa.com" className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-[#204c93] focus:ring-2 focus:ring-blue-100"/></label>
        <label className="block text-sm font-semibold text-slate-700">Contraseña<div className="mt-2 flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-[#204c93] focus-within:ring-2 focus-within:ring-blue-100"><input type={mostrar?'text':'password'} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="min-w-0 flex-1 p-3 outline-none"/><button type="button" onClick={()=>setMostrar(!mostrar)} className="px-3 text-xs font-semibold text-[#204c93]">{mostrar?'Ocultar':'Mostrar'}</button></div></label>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#204c93] p-3.5 font-semibold text-white transition hover:bg-[#173a74] disabled:opacity-60">{loading?'Validando acceso…':'Ingresar al Panel Master →'}</button>
        <p className="text-center text-xs text-slate-400">Acceso restringido · DATA CEA</p>
      </form>
    </div>
  </main>
}
