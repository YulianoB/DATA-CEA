'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LogOut } from 'lucide-react'
import { cerrarSesion } from '@/lib/auth/logout'

// ============================================================
// TEMA INSTITUCIONAL DEL ENCABEZADO
// Cambie únicamente estos valores para modificar el aspecto
// de todos los encabezados que utilizan este componente.
// ============================================================

const TEMA_ENCABEZADO = {
  tipoFondo: 'degradado', // 'solido' | 'degradado'
  direccionDegradado: '110deg',
  colorPrincipal: '#082745',
  colorSecundario: '#194567',
  colorTexto: '#FFFFFF',
  colorSecundarioTexto: '#DCEAF5',
  colorAcento: '#7BEFB3',
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
  // ESTILO INSTITUCIONAL
  // ============================================================

  const estiloFondo = {
    background:
      TEMA_ENCABEZADO.tipoFondo === 'degradado'
        ? `linear-gradient(${TEMA_ENCABEZADO.direccionDegradado}, ${TEMA_ENCABEZADO.colorPrincipal} 0%, ${TEMA_ENCABEZADO.colorSecundario} 100%)`
        : TEMA_ENCABEZADO.colorPrincipal,
    color: TEMA_ENCABEZADO.colorTexto,
    borderBottomColor: TEMA_ENCABEZADO.colorAcento,
  }

  return (
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
                  borderColor: `${TEMA_ENCABEZADO.colorAcento}80`,
                  backgroundColor: `${TEMA_ENCABEZADO.colorAcento}18`,
                  color: TEMA_ENCABEZADO.colorTexto,
                }}
              >
                <Icono size={20} strokeWidth={2.2} />
              </div>
            )}

            <div className="min-w-0">
              <h1
                className="text-sm font-black uppercase tracking-wide md:text-base"
                style={{ color: TEMA_ENCABEZADO.colorTexto }}
              >
                {titulo}
              </h1>

              {subtitulo && (
                <p
                  className="mt-0.5 text-[10px]"
                  style={{ color: TEMA_ENCABEZADO.colorSecundarioTexto }}
                >
                  {subtitulo}
                </p>
              )}

              {user && (
                <div
                  className="mt-1 text-[10px]"
                  style={{ color: TEMA_ENCABEZADO.colorSecundarioTexto }}
                >
                  Usuario:{' '}
                  <strong style={{ color: TEMA_ENCABEZADO.colorTexto }}>
                    {user.nombreCompleto ||
                      user.nombre_completo ||
                      user.usuario ||
                      '-'}
                  </strong>

                  {(user.nombreEmpresa || user.nombre_empresa) && (
                    <>
                      <span className="mx-1.5 opacity-60">·</span>
                      CEA:{' '}
                      <strong style={{ color: TEMA_ENCABEZADO.colorTexto }}>
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
          {mostrarRegresar && (
            <button
              type="button"
              onClick={() => router.push(rutaRegreso)}
              className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] font-semibold transition hover:bg-white/20"
              style={{
                borderColor: `${TEMA_ENCABEZADO.colorTexto}45`,
                backgroundColor: `${TEMA_ENCABEZADO.colorTexto}14`,
                color: TEMA_ENCABEZADO.colorTexto,
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
  )
}
