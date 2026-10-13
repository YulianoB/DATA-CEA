// app/instructor/practica/documentos/page.js
'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CarFront, FileUp, LogOut, ArrowLeft, UserRoundPen } from 'lucide-react'
import { cerrarSesion } from '@/lib/auth/logout'

export default function DocumentosPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    if (!storedUser) {
      router.push('/login')
      return
    }
    try {
      setUser(JSON.parse(storedUser))
    } catch (error) {
      console.error('Error leyendo sesión:', error)
      localStorage.removeItem('currentUser')
      router.push('/login')
    }
  }, [router])

  if (!user) return <p className="mt-20 text-center">Cargando...</p>

  const opciones = [
    { icono: UserRoundPen, titulo: 'Instructores', ruta: '/instructor/practica/documentos/instructores' },
    { icono: CarFront, titulo: 'Vehículos', ruta: '/instructor/practica/documentos/vehiculos' },
  ]

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA] p-4">
      <div className="w-full max-w-2xl rounded-xl border border-[#DCE4EB] bg-white p-4 shadow-lg sm:p-6">
        <div className="relative mb-3 grid grid-cols-[52px_1fr_52px] items-start gap-2">
          <div className="flex justify-start">
            <img src="/logo.png" alt="DATA CEA" className="h-11 w-auto object-contain" />
          </div>
          <div className="min-w-0 text-center">
            <h1 className="text-lg font-semibold uppercase leading-tight text-[#173A57]">Actualizar Documentos</h1>
            <p className="mt-1 truncate text-[11px] leading-tight text-[#64748B]">{user.nombreCompleto || user.usuario}</p>
            {user.nombreEmpresa && <p className="mt-0.5 truncate text-[10px] leading-tight text-[#64748B]">{user.nombreEmpresa}</p>}
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => cerrarSesion(router)} title="Cerrar sesión" aria-label="Cerrar sesión" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#C93C3C] bg-[#C93C3C] text-white shadow-sm transition-all hover:bg-[#A92F2F]">
              <LogOut size={18} />
            </button>
          </div>
        </div>
        <div className="mb-4 h-[3px] w-full rounded-full bg-[#173A57]" />
        <p className="mb-4 text-center text-xs text-slate-600">Seleccione los documentos que desea actualizar.</p>
        <div className="grid grid-cols-2 gap-4">
          {opciones.map(({ icono: Icono, titulo, ruta }) => (
            <button key={ruta} type="button" onClick={() => router.push(ruta)} className="flex h-24 flex-col items-center justify-center gap-2 rounded-lg border border-[#A9BDCC] bg-[#DCEEF9] px-2 text-center text-sm font-medium text-[#263746] shadow-md transition-all duration-200 hover:-translate-y-1 hover:bg-[#173A57] hover:text-white hover:shadow-xl">
              <Icono size={26} strokeWidth={2} aria-hidden="true" />
              {titulo}
            </button>
          ))}
        </div>
        <div className="mt-5 flex justify-center">
          <button type="button" onClick={() => router.push('/instructor/practica')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
            <ArrowLeft size={17} /> Regresar
          </button>
        </div>
      </div>
    </div>
  )
}
