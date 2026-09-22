'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  LogOut,
  Palette,
  RotateCcw,
  X,
} from 'lucide-react'
import { cerrarSesion } from '@/lib/auth/logout'

const STORAGE_KEY = 'dataCeaTemaEncabezadoAdmin'

const TEMA_PREDETERMINADO = {
  tipoFondo: 'solido',
  direccionDegradado: '110deg',
  colorPrincipal: '#082745',
  colorSecundario: '#245A82',
  colorTexto: '#FFFFFF',
  colorSecundarioTexto: '#DCEAF5',
  colorAcento: '#38aada',
}

function normalizarTema(valor) {
  return {
    ...TEMA_PREDETERMINADO,
    ...(valor || {}),
  }
}

export default function EncabezadoModulo({
  titulo,
  subtitulo,
  icono: Icono,
  rutaRegreso = '/admin',
  textoRegreso = 'Menú Administrativo',
  mostrarLogo = true,
  mostrarRegresar = true,
  mostrarCerrarSesion = true,

  // Déjelo true mientras se define la identidad visual.
  // Cuando el diseño quede aprobado puede cambiarse a false.
  permitirPersonalizacion = true,
}) {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [tema, setTema] = useState(TEMA_PREDETERMINADO)
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [temaCargado, setTemaCargado] = useState(false)

  // ============================================================
  // SESIÓN
  // ============================================================

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

  // ============================================================
  // TEMA GUARDADO
  // ============================================================

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY)

      if (guardado) {
        setTema(normalizarTema(JSON.parse(guardado)))
      }
    } catch (error) {
      console.error('Error leyendo tema del encabezado:', error)
    } finally {
      setTemaCargado(true)
    }
  }, [])

  useEffect(() => {
    if (!temaCargado) return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tema))
    } catch (error) {
      console.error('Error guardando tema del encabezado:', error)
    }
  }, [tema, temaCargado])

  // ============================================================
  // ESTILO DINÁMICO
  // ============================================================

  const estiloFondo = useMemo(() => {
    if (tema.tipoFondo === 'degradado') {
      return {
        background: `linear-gradient(${tema.direccionDegradado}, ${tema.colorPrincipal} 0%, ${tema.colorSecundario} 100%)`,
        color: tema.colorTexto,
        borderBottomColor: tema.colorAcento,
      }
    }

    return {
      background: tema.colorPrincipal,
      color: tema.colorTexto,
      borderBottomColor: tema.colorAcento,
    }
  }, [tema])

  function actualizar(campo, valor) {
    setTema(actual => ({
      ...actual,
      [campo]: valor,
    }))
  }

  function restablecer() {
    setTema(TEMA_PREDETERMINADO)
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <header
        className="relative border-b-2 px-4 py-3 md:px-5"
        style={estiloFondo}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

          {/* IDENTIDAD */}
          <div className="flex min-w-0 items-center gap-3">
            {mostrarLogo && (
              <Image
                src="/logo.png"
                alt="DATA CEA"
                width={125}
                height={58}
                priority
                className="hidden h-[44px] w-auto shrink-0 object-contain opacity-95 sm:block"
              />
            )}

            <div className="flex min-w-0 items-center gap-2.5">
              {Icono && (
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                  style={{
                    borderColor: `${tema.colorAcento}80`,
                    backgroundColor: `${tema.colorAcento}18`,
                    color: tema.colorTexto,
                  }}
                >
                  <Icono size={20} strokeWidth={2.2} />
                </div>
              )}

              <div className="min-w-0">
                <h1
                  className="text-sm font-black uppercase tracking-wide md:text-base"
                  style={{ color: tema.colorTexto }}
                >
                  {titulo}
                </h1>

                {subtitulo && (
                  <p
                    className="mt-0.5 text-[10px]"
                    style={{ color: tema.colorSecundarioTexto }}
                  >
                    {subtitulo}
                  </p>
                )}

                {user && (
                  <div
                    className="mt-1 text-[10px]"
                    style={{ color: tema.colorSecundarioTexto }}
                  >
                    Usuario:{' '}
                    <strong style={{ color: tema.colorTexto }}>
                      {user.nombreCompleto ||
                        user.nombre_completo ||
                        user.usuario ||
                        '-'}
                    </strong>

                    {(user.nombreEmpresa || user.nombre_empresa) && (
                      <>
                        <span className="mx-1.5 opacity-60">·</span>
                        CEA:{' '}
                        <strong style={{ color: tema.colorTexto }}>
                          {user.nombreEmpresa || user.nombre_empresa}
                        </strong>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ACCIONES */}
          <div className="flex flex-wrap items-center gap-2">
            {permitirPersonalizacion && (
              <button
                type="button"
                onClick={() => setPanelAbierto(true)}
                title="Personalizar colores del encabezado"
                className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] font-semibold transition hover:bg-white/20"
                style={{
                  borderColor: `${tema.colorTexto}45`,
                  backgroundColor: `${tema.colorTexto}14`,
                  color: tema.colorTexto,
                }}
              >
                <Palette size={14} />
                Colores
              </button>
            )}

            {mostrarRegresar && (
              <button
                type="button"
                onClick={() => router.push(rutaRegreso)}
                className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] font-semibold transition hover:bg-white/20"
                style={{
                  borderColor: `${tema.colorTexto}45`,
                  backgroundColor: `${tema.colorTexto}14`,
                  color: tema.colorTexto,
                }}
              >
                <ArrowLeft size={14} />
                {textoRegreso}
              </button>
            )}

            {mostrarCerrarSesion && (
              <button
                type="button"
                onClick={() => cerrarSesion(router)}
                className="inline-flex items-center gap-1.5 rounded bg-[var(--danger)] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[var(--danger-dark)]"
              >
                <LogOut size={14} />
                Cerrar Sesión
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================
          PANEL DE PERSONALIZACIÓN
      ======================================================== */}

      {permitirPersonalizacion && panelAbierto && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-end bg-slate-950/20 p-3 pt-20 backdrop-blur-[1px]"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              setPanelAbierto(false)
            }
          }}
        >
          <div className="w-full max-w-[340px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <Palette size={17} className="text-slate-700" />
                  <h2 className="text-xs font-black uppercase text-slate-800">
                    Personalizar encabezado
                  </h2>
                </div>
                <p className="mt-1 text-[9px] text-gray-500">
                  Los cambios se muestran inmediatamente.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPanelAbierto(false)}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Cerrar"
              >
                <X size={17} />
              </button>
            </div>

            <div className="space-y-4 p-4">

              {/* TIPO DE FONDO */}
              <div>
                <div className="mb-1.5 text-[9px] font-black uppercase text-gray-500">
                  Tipo de fondo
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => actualizar('tipoFondo', 'solido')}
                    className={`rounded-md border px-3 py-2 text-[10px] font-bold ${
                      tema.tipoFondo === 'solido'
                        ? 'border-slate-700 bg-slate-100 text-slate-800'
                        : 'border-gray-200 bg-white text-gray-500'
                    }`}
                  >
                    Sólido
                  </button>

                  <button
                    type="button"
                    onClick={() => actualizar('tipoFondo', 'degradado')}
                    className={`rounded-md border px-3 py-2 text-[10px] font-bold ${
                      tema.tipoFondo === 'degradado'
                        ? 'border-slate-700 bg-slate-100 text-slate-800'
                        : 'border-gray-200 bg-white text-gray-500'
                    }`}
                  >
                    Degradado
                  </button>
                </div>
              </div>

              <SelectorColor
                label="Color principal"
                value={tema.colorPrincipal}
                onChange={valor => actualizar('colorPrincipal', valor)}
              />

              {tema.tipoFondo === 'degradado' && (
                <SelectorColor
                  label="Color secundario del degradado"
                  value={tema.colorSecundario}
                  onChange={valor => actualizar('colorSecundario', valor)}
                />
              )}

              {tema.tipoFondo === 'degradado' && (
                <div>
                  <div className="mb-1.5 text-[9px] font-black uppercase text-gray-500">
                    Dirección del degradado
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: '90deg', label: 'Horizontal →' },
                      { value: '270deg', label: 'Horizontal ←' },
                      { value: '180deg', label: 'Vertical ↓' },
                      { value: '0deg', label: 'Vertical ↑' },
                      { value: '135deg', label: 'Diagonal ↘' },
                      { value: '225deg', label: 'Diagonal ↖' },
                    ].map(opcion => (
                      <button
                        key={opcion.value}
                        type="button"
                        onClick={() => actualizar('direccionDegradado', opcion.value)}
                        className={`rounded-md border px-2 py-2 text-[9px] font-bold transition ${
                          tema.direccionDegradado === opcion.value
                            ? 'border-slate-700 bg-slate-100 text-slate-800'
                            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {opcion.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tema.tipoFondo === 'degradado' && (
                <button
                  type="button"
                  onClick={() =>
                    setTema(actual => ({
                      ...actual,
                      colorPrincipal: actual.colorSecundario,
                      colorSecundario: actual.colorPrincipal,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[9px] font-bold text-gray-600 hover:bg-gray-50"
                >
                  Intercambiar colores del degradado
                </button>
              )}

              <SelectorColor
                label="Texto principal"
                value={tema.colorTexto}
                onChange={valor => actualizar('colorTexto', valor)}
              />

              <SelectorColor
                label="Texto secundario"
                value={tema.colorSecundarioTexto}
                onChange={valor => actualizar('colorSecundarioTexto', valor)}
              />

              <SelectorColor
                label="Acento / borde"
                value={tema.colorAcento}
                onChange={valor => actualizar('colorAcento', valor)}
              />

              {/* VISTA PREVIA */}
              <div>
                <div className="mb-1.5 text-[9px] font-black uppercase text-gray-500">
                  Vista previa
                </div>

                <div
                  className="rounded-lg border-2 px-3 py-3 shadow-sm"
                  style={{
                    background:
                      tema.tipoFondo === 'degradado'
                        ? `linear-gradient(${tema.direccionDegradado}, ${tema.colorPrincipal} 0%, ${tema.colorSecundario} 100%)`
                        : tema.colorPrincipal,
                    borderColor: tema.colorAcento,
                  }}
                >
                  <div
                    className="text-[10px] font-black uppercase"
                    style={{ color: tema.colorTexto }}
                  >
                    Encabezado DATA CEA
                  </div>
                  <div
                    className="mt-1 text-[9px]"
                    style={{ color: tema.colorSecundarioTexto }}
                  >
                    Vista previa de título, texto y acento.
                  </div>
                </div>
              </div>

              {/* VISTA DE COLORES */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="mb-2 text-[9px] font-black uppercase text-gray-500">
                  Colores seleccionados
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    tema.colorPrincipal,
                    tema.colorSecundario,
                    tema.colorTexto,
                    tema.colorSecundarioTexto,
                    tema.colorAcento,
                  ].map((color, index) => (
                    <div
                      key={`${color}-${index}`}
                      className="h-7 rounded border border-black/10"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
              <button
                type="button"
                onClick={restablecer}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[10px] font-bold text-gray-600 hover:bg-gray-100"
              >
                <RotateCcw size={13} />
                Restablecer
              </button>

              <button
                type="button"
                onClick={() => setPanelAbierto(false)}
                className="rounded-md bg-slate-800 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-slate-900"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function SelectorColor({
  label,
  value,
  onChange,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[9px] font-black uppercase text-gray-500">
        {label}
      </label>

      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
        <label
          className="relative h-9 w-11 shrink-0 cursor-pointer overflow-hidden rounded-md border border-gray-300 shadow-sm"
          style={{ backgroundColor: value }}
          title="Abrir paleta de colores"
        >
          <input
            type="color"
            value={value}
            onChange={event => onChange(event.target.value.toUpperCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>

        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={value}
            maxLength={7}
            onChange={event => {
              const valor = event.target.value.toUpperCase()

              if (/^#[0-9A-F]{0,6}$/.test(valor)) {
                onChange(valor)
              }
            }}
            onBlur={event => {
              if (!/^#[0-9A-F]{6}$/.test(event.target.value)) {
                onChange(TEMA_PREDETERMINADO.colorPrincipal)
              }
            }}
            className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 font-mono text-[11px] font-bold uppercase text-gray-700 outline-none focus:border-slate-500"
          />

          <div className="mt-0.5 text-[8px] text-gray-400">
            Pulse el cuadro para abrir la paleta.
          </div>
        </div>
      </div>
    </div>
  )
}
