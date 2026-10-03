'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LogOut } from 'lucide-react'
import { cerrarSesion } from '@/lib/auth/logout'

// ============================================================
// ENCABEZADO DE PAGINAS DE TRABAJO - DATA CEA
// Los menus principales y submenus grandes NO usan este componente.
// ============================================================

// 1. FONDO E IDENTIDAD
export const ESTILO_ENCABEZADO = {
  tipoFondo: 'degradado', // 'solido' | 'degradado'
  direccionDegradado: '110deg',
  colorPrincipal: '#082745',
  colorSecundario: '#194567',
  colorTexto: '#FFFFFF',
  colorTextoSecundario: '#DCEAF5',
  colorAcento: '#7BEFB3',
  grosorAcento: 2,
}

// 2. ICONO DEL MODULO
export const ESTILO_ICONO_ENCABEZADO = {
  fondo: 'rgba(123, 239, 179, 0.09)',
  borde: 'rgba(123, 239, 179, 0.50)',
  texto: '#FFFFFF',
  radio: 8,
}

// 3. BOTONES DEL ENCABEZADO
export const ESTILO_BOTONES_ENCABEZADO = {
  regresar: {
    fondo: 'rgba(255, 255, 255, 0.08)',
    hover: 'rgba(255, 255, 255, 0.20)',
    texto: '#FFFFFF',
    borde: 'rgba(255, 255, 255, 0.27)',
  },
  cerrarSesion: {
    fondo: '#C93C3C',
    hover: '#A92F2F',
    texto: '#FFFFFF',
    borde: '#C93C3C',
  },
  movimientoHover: 'translateY(-2px)',
  transicion: 'all 180ms ease',
}

function estiloBoton(tipo) {
  const e = ESTILO_BOTONES_ENCABEZADO[tipo]
  return {
    backgroundColor: e.fondo,
    color: e.texto,
    borderColor: e.borde,
    transition: ESTILO_BOTONES_ENCABEZADO.transicion,
  }
}

function hoverBoton(event, tipo, activo) {
  const e = ESTILO_BOTONES_ENCABEZADO[tipo]
  event.currentTarget.style.backgroundColor = activo ? e.hover : e.fondo
  event.currentTarget.style.transform = activo
    ? ESTILO_BOTONES_ENCABEZADO.movimientoHover
    : 'translateY(0)'
  event.currentTarget.style.boxShadow = activo
    ? '0 5px 12px rgba(0, 0, 0, 0.18)'
    : 'none'
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
}) {
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

  const fondo =
    ESTILO_ENCABEZADO.tipoFondo === 'degradado'
      ? `linear-gradient(${ESTILO_ENCABEZADO.direccionDegradado}, ${ESTILO_ENCABEZADO.colorPrincipal} 0%, ${ESTILO_ENCABEZADO.colorSecundario} 100%)`
      : ESTILO_ENCABEZADO.colorPrincipal

  return (
    <header
      className="relative px-4 py-3 md:px-5"
      style={{
        background: fondo,
        color: ESTILO_ENCABEZADO.colorTexto,
        borderBottom: `${ESTILO_ENCABEZADO.grosorAcento}px solid ${ESTILO_ENCABEZADO.colorAcento}`,
      }}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
                className="flex h-9 w-9 shrink-0 items-center justify-center border"
                style={{
                  backgroundColor: ESTILO_ICONO_ENCABEZADO.fondo,
                  borderColor: ESTILO_ICONO_ENCABEZADO.borde,
                  color: ESTILO_ICONO_ENCABEZADO.texto,
                  borderRadius: `${ESTILO_ICONO_ENCABEZADO.radio}px`,
                }}
              >
                <Icono size={20} strokeWidth={2.2} />
              </div>
            )}

            <div className="min-w-0">
              <h1 className="text-sm font-black uppercase tracking-wide md:text-base">
                {titulo}
              </h1>
              {subtitulo && (
                <p className="mt-0.5 text-[10px]" style={{ color: ESTILO_ENCABEZADO.colorTextoSecundario }}>
                  {subtitulo}
                </p>
              )}
              {user && (
                <div className="mt-1 text-[10px]" style={{ color: ESTILO_ENCABEZADO.colorTextoSecundario }}>
                  Usuario:{' '}
                  <strong style={{ color: ESTILO_ENCABEZADO.colorTexto }}>
                    {user.nombreCompleto || user.nombre_completo || user.usuario || '-'}
                  </strong>
                  {(user.nombreEmpresa || user.nombre_empresa) && (
                    <>
                      <span className="mx-1.5 opacity-60">·</span>
                      CEA:{' '}
                      <strong style={{ color: ESTILO_ENCABEZADO.colorTexto }}>
                        {user.nombreEmpresa || user.nombre_empresa}
                      </strong>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mostrarRegresar && (
            <button
              type="button"
              onClick={() => router.push(rutaRegreso)}
              className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] font-semibold"
              style={estiloBoton('regresar')}
              onMouseEnter={(e) => hoverBoton(e, 'regresar', true)}
              onMouseLeave={(e) => hoverBoton(e, 'regresar', false)}
            >
              <ArrowLeft size={14} />
              {textoRegreso}
            </button>
          )}

          {mostrarCerrarSesion && (
            <button
              type="button"
              onClick={() => cerrarSesion(router)}
              className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] font-semibold"
              style={estiloBoton('cerrarSesion')}
              onMouseEnter={(e) => hoverBoton(e, 'cerrarSesion', true)}
              onMouseLeave={(e) => hoverBoton(e, 'cerrarSesion', false)}
            >
              <LogOut size={14} />
              Cerrar Sesión
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
