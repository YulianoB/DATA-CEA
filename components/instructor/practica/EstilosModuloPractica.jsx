'use client'

import Image from 'next/image'
import { ClipboardCheck, ArrowLeft, LogOut, CircleCheck, TriangleAlert, Save, ChevronRight, X, FileText, CarFront, Wrench, Gauge, ShieldCheck, LockKeyhole } from 'lucide-react'

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
    <section className={`mb-3 overflow-hidden rounded-xl border shadow-sm ${alerta ? 'border-red-400 bg-red-50/40' : 'border-slate-300 bg-white'}`}>
      <h2 className="bg-[#194567] px-3 py-2.5 text-xs font-bold text-white sm:text-sm">{titulo}</h2>
      <div className="p-3">
        <p className="mb-3 text-xs leading-relaxed text-slate-600">{descripcion}</p>
        <div className="grid grid-cols-2 gap-2">
          {['CONFORME', 'NO CONFORME'].map((opcion) => (
            <label key={opcion} className={`flex min-h-12 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition sm:text-sm ${estado === opcion ? (opcion === 'CONFORME' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-red-600 bg-red-50 text-red-800') : 'border-slate-300 bg-white text-slate-700'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}>
              <input type="radio" name={titulo} value={opcion} checked={estado === opcion} onChange={() => onChange(opcion)} disabled={disabled} className="h-4 w-4 accent-[#194567]" />
              {estado === opcion && (opcion === 'CONFORME' ? <CircleCheck size={17} aria-hidden="true" /> : <TriangleAlert size={17} aria-hidden="true" />)}
              {opcion === 'CONFORME' ? 'Conforme' : 'No conforme'}
            </label>
          ))}
        </div>
      </div>
    </section>
  )
}

const ICONOS_INSPECCION = [CarFront, Wrench, Gauge, ShieldCheck, FileText]
const COLORES_INSPECCION = [
  'bg-sky-200 text-sky-900 border-sky-400',
  'bg-amber-200 text-amber-900 border-amber-400',
  'bg-indigo-200 text-indigo-900 border-indigo-400',
  'bg-teal-200 text-teal-900 border-teal-400',
  'bg-violet-200 text-violet-900 border-violet-400',
]

export function TarjetaInspeccionCompacta({ numero, titulo, descripcion, estado, disabled, onClick, observacion }) {
  const conforme = estado === 'CONFORME'
  const noConforme = estado === 'NO CONFORME'
  const Icono = ICONOS_INSPECCION[numero - 1] || FileText
  const color = COLORES_INSPECCION[numero - 1] || COLORES_INSPECCION[0]
  const fondos = ['bg-sky-100 border-sky-400', 'bg-amber-100 border-amber-400', 'bg-indigo-100 border-indigo-400', 'bg-teal-100 border-teal-400', 'bg-violet-100 border-violet-400']
  const fondo = fondos[numero - 1] || fondos[0]
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className={`flex h-full min-h-44 w-full flex-col rounded-xl border-2 p-3 text-left shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${conforme ? 'border-emerald-500 bg-emerald-50' : noConforme ? 'border-red-500 bg-red-100' : fondo} ${disabled ? 'cursor-not-allowed opacity-55' : 'hover:border-blue-600 active:scale-[0.99]'}`}>
      <div className="mb-2 flex w-full items-center justify-between gap-2">
        <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 shadow-sm ${color}`}><Icono size={29} strokeWidth={2.3} aria-hidden="true" /></span>
        {disabled ? <LockKeyhole size={18} className="text-slate-500" /> : conforme ? <CircleCheck size={20} className="text-emerald-700" /> : noConforme ? <TriangleAlert size={20} className="text-red-700" /> : <ChevronRight size={20} className="text-slate-600" />}
      </div>
      <span className="text-[10px] font-bold tracking-wide text-[#194567]">SECCIÓN {numero}</span>
      <span className="mt-1 text-sm font-bold leading-snug text-slate-900">{titulo}</span>
      <span className="mt-1 text-xs leading-relaxed text-slate-600">{descripcion}</span>
      <span className={`mt-auto pt-3 text-xs font-semibold ${conforme ? 'text-emerald-700' : noConforme ? 'text-red-700' : 'text-slate-600'}`}>{disabled ? 'Bloqueada' : conforme ? 'Conforme' : noConforme ? 'No conforme' : 'Tocar para evaluar'}</span>
      {noConforme && observacion && <span className="mt-1 line-clamp-2 text-xs text-red-800">{observacion}</span>}
    </button>
  )
}

export function ModalEvaluacionPractica({ seccion, estado, observacion, onObservacionChange, onEvaluar, onCerrar, guia }) {
  if (!seccion) return null
  const requiereObservacion = estado === 'NO CONFORME'
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-3 sm:p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-evaluacion-practica" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-400 bg-white p-4 shadow-2xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-bold text-[#194567]">SECCIÓN {seccion.numero} DE 5</p><h2 id="titulo-evaluacion-practica" className="mt-1 text-lg font-bold text-slate-900">{seccion.titulo}</h2></div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar evaluación" className="rounded-lg border border-slate-300 p-2 text-slate-700"><X size={20}/></button>
        </div>
        <p className="mt-3 rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{seccion.compromiso || 'Confirmo que he realizado la inspección y que el resultado refleja el estado actual del vehículo.'}</p>
        <p className="mt-4 text-sm font-semibold text-slate-900">Resultado de la verificación</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onEvaluar('CONFORME')} className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-bold ${estado === 'CONFORME' ? 'border-emerald-600 bg-emerald-100 text-emerald-900' : 'border-slate-400 bg-white text-emerald-800'}`}><CircleCheck size={19}/> Conforme</button>
          <button type="button" onClick={() => onEvaluar('NO CONFORME')} className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-bold ${requiereObservacion ? 'border-red-600 bg-red-100 text-red-900' : 'border-slate-400 bg-white text-red-800'}`}><TriangleAlert size={19}/> No conforme</button>
        </div>
        {requiereObservacion && (
          <div className="mt-4 rounded-xl border border-amber-500 bg-amber-50 p-3">
            <p className="text-xs leading-relaxed text-amber-950">{guia}</p>
            <label htmlFor="observacion-seccion-practica" className="mt-3 block text-sm font-semibold text-slate-900">Observación obligatoria de esta sección</label>
            <textarea id="observacion-seccion-practica" rows={3} value={observacion} onChange={(e) => onObservacionChange(e.target.value)} placeholder="Describa la falla o incumplimiento que existe actualmente." className="mt-1 w-full rounded-lg border border-slate-400 bg-white p-3 text-base text-slate-900" />
            <button type="button" disabled={!observacion.trim()} onClick={() => onEvaluar('CONFIRMAR_NO_CONFORME')} className="mt-3 min-h-11 w-full rounded-lg bg-[#194567] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400">Confirmar y cerrar</button>
          </div>
        )}
        <p className="mt-3 text-center text-xs text-slate-500">Puede regresar a cualquier sección para corregirla antes de guardar.</p>
      </div>
    </div>
  )
}

export function AccionesModuloPractica({ onGuardar, onRegresar, onCerrarSesion, puedeGuardar = true, guardando = false, mostrarGuardar = true, textoGuardar = 'Guardar' }) {
  const botonBase = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700'
  return (
    <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 pb-2">
      {mostrarGuardar && (
        <button type="button" onClick={onGuardar} disabled={!puedeGuardar || guardando}
          className={`${botonBase} ${puedeGuardar && !guardando ? 'bg-[#194567] text-white hover:bg-[#082745]' : 'cursor-not-allowed bg-slate-300 text-slate-600'}`}>
          <Save size={17} aria-hidden="true" />
          {guardando ? 'Guardando...' : textoGuardar}
        </button>
      )}
      {onRegresar && (
        <button type="button" onClick={onRegresar} className={`${botonBase} bg-slate-600 text-white hover:bg-slate-700`}>
          <ArrowLeft size={17} aria-hidden="true" /> Regresar
        </button>
      )}
      {onCerrarSesion && (
        <button type="button" onClick={onCerrarSesion} className={`${botonBase} bg-red-700 text-white hover:bg-red-800`}>
          <LogOut size={17} aria-hidden="true" /> Cerrar sesión
        </button>
      )}
    </div>
  )
}

export const GUIAS_NO_CONFORMIDAD = {
  revisionExterior: 'Describa el daño real encontrado: por ejemplo, llanta en mal estado, luz que no funciona o espejo roto. No marque No conforme por mantenimiento futuro.',
  motor: 'Registre fugas, fallas o niveles fuera del rango permitido. Un cambio de aceite próximo no es una no conformidad; sí lo es cuando ya se superó el kilometraje establecido.',
  interiorFuncionamiento: 'Indique qué elemento presenta una falla actual, por ejemplo cinturón defectuoso, testigo de avería o luz interior que no funciona.',
  equiposPrevencion: 'Señale el elemento obligatorio faltante, vencido o defectuoso. No marque No conforme si todos los equipos están disponibles y en buen estado.',
  documentos: 'Si los documentos están vigentes, marque Conforme, aunque venzan pronto. Marque No conforme únicamente cuando exista un documento vencido, faltante o inválido.',
}
