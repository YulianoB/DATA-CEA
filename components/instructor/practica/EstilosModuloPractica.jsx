'use client'

import Image from 'next/image'
import { ClipboardCheck, ArrowLeft, LogOut } from 'lucide-react'

export function EncabezadoPractica({ titulo, usuario, cea, onRegresar, onCerrarSesion }) {
  return (
    <header className="rounded-t-2xl border-b-2 border-emerald-300 bg-gradient-to-r from-[#082745] to-[#194567] px-3 py-3 text-white sm:px-5">
      <div className="flex items-center gap-2.5">
        <Image src="/logo.png" alt="DATA CEA" width={80} height={40} priority className="h-9 w-auto max-w-[76px] shrink-0 object-contain" />
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-300/40 bg-white/10">
          <ClipboardCheck size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-bold leading-tight sm:text-base">{titulo}</h1>
          <p className="text-[10px] text-slate-200">Instructor de práctica</p>
        </div>
        <button type="button" onClick={onRegresar} aria-label="Regresar" title="Regresar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/30 bg-white/10"><ArrowLeft size={18} /></button>
        <button type="button" onClick={onCerrarSesion} aria-label="Cerrar sesión" title="Cerrar sesión" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-700"><LogOut size={18} /></button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-white/20 pt-2 text-[10px] text-slate-200">
        <span className="min-w-0 truncate">Usuario: <strong className="text-white">{usuario || '-'}</strong></span>
        <span className="min-w-0 truncate">CEA: <strong className="text-white">{cea || '-'}</strong></span>
      </div>
    </header>
  )
}

export function TarjetaInspeccion({ titulo, descripcion, estado, disabled, onChange }) {
  const alerta = estado === 'NO CONFORME'
  return (
    <section className={`mb-3 overflow-hidden rounded-xl border shadow-sm ${alerta ? 'border-amber-500 bg-amber-50/50' : 'border-slate-300 bg-white'}`}>
      <h2 className="bg-[#194567] px-3 py-2.5 text-xs font-bold text-white sm:text-sm">{titulo}</h2>
      <div className="p-3">
        <p className="mb-3 text-xs leading-relaxed text-slate-600">{descripcion}</p>
        <div className="grid grid-cols-2 gap-2">
          {['CONFORME', 'NO CONFORME'].map((opcion) => (
            <label key={opcion} className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 text-xs font-semibold transition sm:text-sm ${estado === opcion ? (opcion === 'CONFORME' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-amber-600 bg-amber-100 text-amber-900') : 'border-slate-300 bg-white text-slate-700'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}>
              <input type="radio" name={titulo} value={opcion} checked={estado === opcion} onChange={() => onChange(opcion)} disabled={disabled} className="h-4 w-4 accent-[#194567]" />
              {opcion === 'CONFORME' ? 'Conforme' : 'No conforme'}
            </label>
          ))}
        </div>
      </div>
    </section>
  )
}

export const GUIAS_NO_CONFORMIDAD = {
  revisionExterior: 'Describa el daño real encontrado: por ejemplo, llanta en mal estado, luz que no funciona o espejo roto. No marque No conforme por mantenimiento futuro.',
  motor: 'Registre fugas, fallas o niveles fuera del rango permitido. Un cambio de aceite próximo no es una no conformidad; sí lo es cuando ya se superó el kilometraje establecido.',
  interiorFuncionamiento: 'Indique qué elemento presenta una falla actual, por ejemplo cinturón defectuoso, testigo de avería o luz interior que no funciona.',
  equiposPrevencion: 'Señale el elemento obligatorio faltante, vencido o defectuoso. No marque No conforme si todos los equipos están disponibles y en buen estado.',
  documentos: 'Si los documentos están vigentes, marque Conforme, aunque venzan pronto. Marque No conforme únicamente cuando exista un documento vencido, faltante o inválido.',
}
