'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, LogOut } from 'lucide-react'
import { cerrarSesion } from '@/lib/auth/logout'

// ============================================================
// MENU DE NAVEGACION - DATA CEA
// Para menus principales y submenus grandes.
// NO utiliza EncabezadoModulo.
// ============================================================

// 1. PAGINA Y CABECERA BLANCA
export const ESTILO_MENU = {
  fondoPagina: '#F5F7FA',
  fondoCabecera: '#FFFFFF',
  textoTitulo: '#173A57',
  textoSubtitulo: '#64748B',
  textoUsuario: '#475569',
  bordeCabecera: '#DCE4EB',
  lineaTitulo: '#173A57',
  grosorLineaTitulo: 3,
  anchoMaximo: '1500px',
}

// 2. GRUPOS DE NAVEGACION
export const ESTILO_GRUPO_MENU = {
  titulo: '#3B617D',
  linea: '#DCE4EB',
  separacionSuperior: 22,
}

// 3. TARJETAS DE NAVEGACION
export const ESTILO_TARJETA_MENU = {
  fondo: '#EAF4FB',
  borde: '#A9BDCC',
  bordeHover: '#173A57',
  fondoHover: '#173A57',
  textoTitulo: '#263746',
  textoTituloHover: '#FFFFFF',
  textoDescripcion: '#64748B',
  fondoIcono: 'transparent',
  textoIcono: '#36566F',
  fondoIconoHover: '#FFFFFF',
  textoIconoHover: '#173A57',
  radio: 12,
  sombra: '0 2px 8px rgba(15, 23, 42, 0.05)',
  sombraHover: '0 10px 24px rgba(15, 23, 42, 0.12)',
  movimientoHover: 'translateY(-4px)',
  transicion: 'all 180ms ease',
}

// 4. BOTONES SUPERIORES
export const ESTILO_BOTONES_MENU = {
  regresar: { fondo: '#FFFFFF', hover: '#F1F5F9', texto: '#36566F', borde: '#CBD5E1' },
  cerrarSesion: { fondo: '#C93C3C', hover: '#A92F2F', texto: '#FFFFFF', borde: '#C93C3C' },
  movimientoHover: 'translateY(-2px)',
  transicion: 'all 180ms ease',
}

function BotonMenuSuperior({ tipo, children, ...props }) {
  const e = ESTILO_BOTONES_MENU[tipo]
  return (
    <button
      {...props}
      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold shadow-sm"
      style={{ backgroundColor: e.fondo, color: e.texto, borderColor: e.borde, transition: ESTILO_BOTONES_MENU.transicion }}
      onMouseEnter={(event) => {
        event.currentTarget.style.backgroundColor = e.hover
        event.currentTarget.style.transform = ESTILO_BOTONES_MENU.movimientoHover
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.backgroundColor = e.fondo
        event.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {children}
    </button>
  )
}

export function TarjetaNavegacion({ titulo, descripcion, icono: Icono, onClick, deshabilitada = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitada}
      className="group relative flex min-h-[112px] w-full flex-col items-center justify-center gap-2 border p-3 text-center disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        backgroundColor: ESTILO_TARJETA_MENU.fondo,
        borderColor: ESTILO_TARJETA_MENU.borde,
        borderRadius: `${ESTILO_TARJETA_MENU.radio}px`,
        boxShadow: ESTILO_TARJETA_MENU.sombra,
        transition: ESTILO_TARJETA_MENU.transicion,
      }}
      onMouseEnter={(event) => {
        if (deshabilitada) return
        event.currentTarget.style.backgroundColor = ESTILO_TARJETA_MENU.fondoHover
        event.currentTarget.style.borderColor = ESTILO_TARJETA_MENU.bordeHover
        event.currentTarget.style.boxShadow = ESTILO_TARJETA_MENU.sombraHover
        event.currentTarget.style.transform = ESTILO_TARJETA_MENU.movimientoHover
        const icono = event.currentTarget.querySelector('[data-menu-icon]')
        const titulo = event.currentTarget.querySelector('[data-menu-title]')
        const flecha = event.currentTarget.querySelector('[data-menu-arrow]')
        if (icono) {
          icono.style.backgroundColor = ESTILO_TARJETA_MENU.fondoIconoHover
          icono.style.color = ESTILO_TARJETA_MENU.textoIconoHover
        }
        if (titulo) titulo.style.color = ESTILO_TARJETA_MENU.textoTituloHover
        if (flecha) flecha.style.color = ESTILO_TARJETA_MENU.textoTituloHover
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.backgroundColor = ESTILO_TARJETA_MENU.fondo
        event.currentTarget.style.borderColor = ESTILO_TARJETA_MENU.borde
        event.currentTarget.style.boxShadow = ESTILO_TARJETA_MENU.sombra
        event.currentTarget.style.transform = 'translateY(0)'
        const icono = event.currentTarget.querySelector('[data-menu-icon]')
        const titulo = event.currentTarget.querySelector('[data-menu-title]')
        const flecha = event.currentTarget.querySelector('[data-menu-arrow]')
        if (icono) {
          icono.style.backgroundColor = ESTILO_TARJETA_MENU.fondoIcono
          icono.style.color = ESTILO_TARJETA_MENU.textoIcono
        }
        if (titulo) titulo.style.color = ESTILO_TARJETA_MENU.textoTitulo
        if (flecha) flecha.style.color = ''
      }}
    >
      {Icono && (
        <span
          data-menu-icon
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: ESTILO_TARJETA_MENU.fondoIcono, color: ESTILO_TARJETA_MENU.textoIcono, transition: ESTILO_TARJETA_MENU.transicion }}
        >
          <Icono size={29} strokeWidth={2} />
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span data-menu-title className="block text-sm font-semibold leading-snug tracking-normal" style={{ color: ESTILO_TARJETA_MENU.textoTitulo, transition: ESTILO_TARJETA_MENU.transicion }}>{titulo}</span>
        {descripcion && (
          <span className="mt-1 block text-[11px] leading-4" style={{ color: ESTILO_TARJETA_MENU.textoDescripcion }}>{descripcion}</span>
        )}
      </span>

      <ChevronRight data-menu-arrow size={15} className="absolute right-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-70" />
    </button>
  )
}

export function GrupoNavegacion({ titulo, opciones = [], columnas = 5 }) {
  const columnasClase = {
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
  }[columnas] || 'lg:grid-cols-5'

  return (
    <section style={{ marginTop: ESTILO_GRUPO_MENU.separacionSuperior }}>
      {titulo && (
        <div className="mb-3 flex items-center gap-3 border-b pb-2" style={{ borderColor: ESTILO_GRUPO_MENU.linea }}>
          <h2 className="text-xs font-black uppercase tracking-[0.08em]" style={{ color: ESTILO_GRUPO_MENU.titulo }}>{titulo}</h2>
        </div>
      )}
      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${columnasClase}`}>
        {opciones.map((opcion) => <TarjetaNavegacion key={opcion.id || opcion.titulo} {...opcion} />)}
      </div>
    </section>
  )
}

export default function MenuNavegacion({
  titulo,
  subtitulo,
  grupos = [],
  mostrarRegresar = false,
  rutaRegreso = '/admin',
  textoRegreso = 'Menú anterior',
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

  const gruposConNavegacion = grupos.map((grupo) => ({
    ...grupo,
    opciones: (grupo.opciones || []).map((opcion) => ({
      ...opcion,
      onClick: opcion.onClick || (opcion.ruta ? () => router.push(opcion.ruta) : undefined),
    })),
  }))

  return (
    <main className="min-h-screen" style={{ backgroundColor: ESTILO_MENU.fondoPagina }}>
      <header className="border-b" style={{ backgroundColor: ESTILO_MENU.fondoCabecera, borderColor: ESTILO_MENU.bordeCabecera }}>
        <div className="mx-auto flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6" style={{ maxWidth: ESTILO_MENU.anchoMaximo }}>
          <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-4">
            <Image src="/logo.png" alt="DATA CEA" width={145} height={68} priority className="h-[50px] w-auto shrink-0 object-contain" />

            <div className="min-w-0 text-center">
              <h1 className="text-base font-black uppercase tracking-wide md:text-xl" style={{ color: ESTILO_MENU.textoTitulo }}>{titulo}</h1>
              {subtitulo && <p className="mt-0.5 text-xs" style={{ color: ESTILO_MENU.textoSubtitulo }}>{subtitulo}</p>}
              {user && (
                <p className="mt-1 text-[10px]" style={{ color: ESTILO_MENU.textoUsuario }}>
                  {user.nombreCompleto || user.nombre_completo || user.usuario || '-'}
                  {(user.nombreEmpresa || user.nombre_empresa) && <> · {user.nombreEmpresa || user.nombre_empresa}</>}
                </p>
              )}
            </div>

            <div className="flex min-w-[145px] flex-wrap items-center justify-end gap-2">
            {mostrarRegresar && (
              <BotonMenuSuperior tipo="regresar" onClick={() => router.push(rutaRegreso)}>
                <ArrowLeft size={14} />{textoRegreso}
              </BotonMenuSuperior>
            )}
            {mostrarCerrarSesion && (
              <BotonMenuSuperior tipo="cerrarSesion" onClick={() => cerrarSesion(router)}>
                <LogOut size={14} />Cerrar Sesión
              </BotonMenuSuperior>
            )}
            </div>
          </div>
        </div>
        <div className="mx-auto px-4 md:px-6" style={{ maxWidth: ESTILO_MENU.anchoMaximo }}>
          <div
            className="w-full"
            style={{
              height: `${ESTILO_MENU.grosorLineaTitulo}px`,
              backgroundColor: ESTILO_MENU.lineaTitulo,
            }}
          />
        </div>
      </header>

      <div className="mx-auto px-4 pb-10 pt-2 md:px-6" style={{ maxWidth: ESTILO_MENU.anchoMaximo }}>
        {gruposConNavegacion.map((grupo) => (
          <GrupoNavegacion key={grupo.id || grupo.titulo} titulo={grupo.titulo} opciones={grupo.opciones} columnas={grupo.columnas} />
        ))}
      </div>
    </main>
  )
}
