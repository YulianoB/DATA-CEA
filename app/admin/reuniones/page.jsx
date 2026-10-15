// app/admin/reuniones/page.jsx
'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import { Toaster, toast } from 'sonner'
import { CalendarDays, CalendarPlus, RefreshCw, FilterX, Eye, FileSpreadsheet, Ban, X, Clock, CheckCircle2, ShieldCheck, Users, Save } from 'lucide-react'
import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
import { BotonAccion, BotonAgregar, BotonActualizar, BotonLimpiar, BotonGuardar, BotonCancelar, BotonVerDetalle, BotonExcel, BotonEliminar, TarjetaModulo, MarcoTabla, FranjaSuperiorModal, ESTILO_SECCIONES, ESTILO_CELDAS_TABLA } from '@/components/admin/EstiloModulo'


// ============================================================
// OPCIONES
// ============================================================

const TIPOS = [
  'Reunión General',
  'Capacitación',
  'Socialización',
  'Sensibilización',
  'Comité',
  'Otra',
]


const ORIGENES_MODULO = [
  {
    value: 'GENERAL',
    label: 'General',
  },
  {
    value: 'PESV',
    label: 'PESV',
  },
]


const MODALIDADES = [
  'Presencial',
  'Virtual',
]


const DIRIGIDO_A = [
  'Todo el personal',
  'Instructores',
  'Administrativo',
]


const ESTADOS = [
  'Programada',
  'Ejecutada',
  'Cancelada',
]


// ============================================================
// FORMULARIO INICIAL
// ============================================================

const FORM_INICIAL = {
  tipo_reunion: '',
  origen_modulo: 'GENERAL',
  descripcion: '',
  fecha_programada: '',
  hora_inicio: '',
  hora_fin: '',
  modalidad: 'Presencial',
  responsable: '',
  dirigido_a: 'Todo el personal',
  lugar: '',
}


// ============================================================
// FILTROS INICIALES
// ============================================================

const FILTROS_INICIALES = {
  origen_modulo: '',
  tipo_reunion: '',
  estado: '',
  dirigido_a: '',
  fecha_desde: '',
  fecha_hasta: '',
}


// ============================================================
// UTILIDADES
// ============================================================

function fechaBogotaActual() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  ).format(
    new Date()
  )
}


function horaBogotaActual() {
  return new Intl.DateTimeFormat(
    'en-GB',
    {
      timeZone:
        'America/Bogota',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }
  ).format(
    new Date()
  )
}


function normalizarTexto(valor) {
  return String(
    valor || ''
  )
    .trim()
    .toLowerCase()
}


function formatearFecha(fecha) {
  if (!fecha) {
    return '-'
  }

  const partes =
    String(fecha)
      .split('-')

  if (
    partes.length !== 3
  ) {
    return fecha
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}


function obtenerEtiquetaOrigen(
  origen
) {
  const valor =
    String(
      origen ||
      'GENERAL'
    )
      .trim()
      .toUpperCase()

  if (
    valor === 'PESV'
  ) {
    return 'PESV'
  }

  return 'GENERAL'
}


// ============================================================
// ESTADO VISUAL
// ============================================================

function EstadoPill({
  estado,
}) {
  const valor =
    normalizarTexto(
      estado
    )

  const estilos = {
    programada:
      'bg-amber-100 text-amber-800 border-amber-200',

    ejecutada:
      'bg-emerald-100 text-emerald-800 border-emerald-200',

    cancelada:
      'bg-rose-100 text-rose-800 border-rose-200',
  }

  const clase =
    estilos[valor] ||
    'bg-slate-100 text-slate-700 border-slate-200'

  return (
    <span
      className={`
        inline-flex
        items-center
        justify-center
        px-2
        py-[2px]
        rounded-full
        border
        text-[10px]
        font-semibold
        whitespace-nowrap
        ${clase}
      `}
    >
      {estado || '-'}
    </span>
  )
}


// ============================================================
// ORIGEN VISUAL
// ============================================================

function OrigenPill({
  origen,
}) {
  const valor =
    obtenerEtiquetaOrigen(
      origen
    )

  const esPesv =
    valor === 'PESV'

  return (
    <span
      className={`
        inline-flex
        items-center
        justify-center
        px-2
        py-[2px]
        rounded-full
        border
        text-[10px]
        font-semibold
        whitespace-nowrap
        ${
          esPesv
            ? 'bg-blue-100 text-blue-800 border-blue-200'
            : 'bg-slate-100 text-slate-700 border-slate-200'
        }
      `}
    >
      {valor}
    </span>
  )
}


// ============================================================
// TARJETA RESUMEN
// ============================================================

function ResumenCard({
  icono,
  titulo,
  valor,
  detalle,
}) {
  return (
    <div
      className="
        bg-white
        border
        border-slate-200
        rounded-xl
        shadow-sm
        p-3
        min-h-[92px]
        flex
        items-center
        gap-3
      "
    >
      <div
        className="
          w-10
          h-10
          rounded-lg
          bg-slate-100
          flex
          items-center
          justify-center
          text-[var(--primary)]
          shrink-0
        "
      >
        <i
          className={`
            fas
            ${icono}
          `}
        ></i>
      </div>

      <div
        className="
          min-w-0
        "
      >
        <p
          className="
            text-[10px]
            uppercase
            tracking-wide
            text-slate-500
            font-semibold
          "
        >
          {titulo}
        </p>

        <p
          className="
            text-xl
            font-bold
            text-slate-800
            leading-tight
          "
        >
          {valor}
        </p>

        {detalle && (
          <p
            className="
              text-[10px]
              text-slate-500
              mt-1
            "
          >
            {detalle}
          </p>
        )}
      </div>
    </div>
  )
}


// ============================================================
// PÁGINA
// ============================================================

function reunionFinalizada(reunion) {
  if (!reunion?.fecha_programada || !reunion?.hora_fin) return false
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const dato = (tipo) => partes.find((parte) => parte.type === tipo)?.value || ''
  const hoy = `${dato('year')}-${dato('month')}-${dato('day')}`
  const hora = `${dato('hour')}:${dato('minute')}`
  const fechaReunion = String(reunion.fecha_programada).slice(0, 10)
  const horaFin = String(reunion.hora_fin).slice(0, 5)
  return fechaReunion < hoy || (fechaReunion === hoy && horaFin <= hora)
}

export default function AdminReunionesPage() {
  const router =
    useRouter()


  // ==========================================================
  // SESIÓN
  // ==========================================================

  const [
    user,
    setUser,
  ] =
    useState(null)

  const [
    nitActual,
    setNitActual,
  ] =
    useState('')


  // ==========================================================
  // FORMULARIO
  // ==========================================================

  const [
    form,
    setForm,
  ] =
    useState(
      FORM_INICIAL
    )


  // ==========================================================
  // FILTROS
  // ==========================================================

  const [
    filtros,
    setFiltros,
  ] =
    useState(
      FILTROS_INICIALES
    )


  // ==========================================================
  // ESTADO UI
  // ==========================================================

  const [guardando, setGuardando] = useState(false)
  const [modalNuevaReunion, setModalNuevaReunion] = useState(false)

  const [
    cargandoLista,
    setCargandoLista,
  ] =
    useState(false)

  const [
    reuniones,
    setReuniones,
  ] =
    useState([])

  const [
    reunionDetalle,
    setReunionDetalle,
  ] =
    useState(null)


  // ==========================================================
  // SESIÓN
  // ==========================================================

  useEffect(
    () => {
      const storedUser =
        localStorage.getItem(
          'currentUser'
        )

      if (!storedUser) {
        router.push(
          '/login'
        )

        return
      }

      try {
        const usuarioSesion =
          JSON.parse(
            storedUser
          )

        setUser(
          usuarioSesion
        )

        const nit =
          usuarioSesion
            ?.nitEmpresa ||
          localStorage.getItem(
            'currentEmpresaNit'
          ) ||
          ''

        if (!nit) {
          toast.error(
            'No se encontró el CEA asociado a la sesión.'
          )

          return
        }

        setNitActual(
          nit
        )
      } catch (error) {
        console.error(
          'Error leyendo sesión:',
          error
        )

        localStorage.removeItem(
          'currentUser'
        )

        localStorage.removeItem(
          'currentEmpresaNit'
        )

        localStorage.removeItem(
          'currentEmpresaNombre'
        )

        localStorage.removeItem(
          'currentPerfilRol'
        )

        localStorage.removeItem(
          'currentPerfilMenu'
        )

        router.push(
          '/login'
        )
      }
    },
    [
      router,
    ]
  )


  // ==========================================================
  // CARGAR REUNIONES
  // ==========================================================

  useEffect(
    () => {
      if (
        !user ||
        !nitActual
      ) {
        return
      }

      cargarReuniones()
    },
    [
      user,
      nitActual,
    ]
  )


  const cargarReuniones =
    async () => {
      if (!nitActual) {
        return
      }

      setCargandoLista(
        true
      )

      try {
        const res =
          await fetch(
            `/api/reuniones?nit=${encodeURIComponent(
              nitActual
            )}&limit=100`,
            {
              cache:
                'no-store',
            }
          )

        const json =
          await res.json()

        if (
          json?.status ===
          'success'
        ) {
          const arr =
            Array.isArray(
              json.data
            )
              ? [
                  ...json.data,
                ]
              : []

          arr.sort(
            (
              a,
              b
            ) => {
              const fechaComparacion =
                String(
                  b.fecha_programada
                ).localeCompare(
                  String(
                    a.fecha_programada
                  )
                )

              if (
                fechaComparacion !==
                0
              ) {
                return fechaComparacion
              }

              return String(
                a.hora_inicio
              ).localeCompare(
                String(
                  b.hora_inicio
                )
              )
            }
          )

          setReuniones(
            arr
          )
        } else {
          console.error(
            'Error API reuniones:',
            json
          )

          toast.error(
            json?.message ||
              'No se pudo cargar la lista de reuniones.'
          )
        }
      } catch (error) {
        console.error(
          'Error cargando reuniones:',
          error
        )

        toast.error(
          'Error al cargar reuniones.'
        )
      } finally {
        setCargandoLista(
          false
        )
      }
    }


  // ==========================================================
  // FORMULARIO - CAMBIOS
  // ==========================================================

  const onChange =
    (e) => {
      const {
        name,
        value,
      } =
        e.target

      setForm(
        (
          prev
        ) => ({
          ...prev,
          [name]:
            value,
        })
      )
    }


  // ==========================================================
  // FILTROS - CAMBIOS
  // ==========================================================

  const onChangeFiltro =
    (e) => {
      const {
        name,
        value,
      } =
        e.target

      setFiltros(
        (
          prev
        ) => ({
          ...prev,
          [name]:
            value,
        })
      )
    }


  // ==========================================================
  // LIMPIAR FORM
  // ==========================================================

  const limpiarForm =
    () => {
      setForm(
        FORM_INICIAL
      )
    }


  // ==========================================================
  // LIMPIAR FILTROS
  // ==========================================================

  const limpiarFiltros =
    () => {
      setFiltros(
        FILTROS_INICIALES
      )
    }


  // ==========================================================
  // VALIDAR FORM
  // ==========================================================

  const validarForm =
    () => {
      if (
        !form.tipo_reunion ||
        !form.origen_modulo ||
        !form.descripcion ||
        !form.fecha_programada ||
        !form.hora_inicio ||
        !form.hora_fin
      ) {
        toast.warning(
          'Completa los campos obligatorios: Tipo, Contexto, Descripción, Fecha, Hora Inicio y Hora Fin.'
        )

        return false
      }

      if (
        form.hora_fin <=
        form.hora_inicio
      ) {
        toast.warning(
          'Hora Fin debe ser mayor a Hora Inicio.'
        )

        return false
      }

      return true
    }


  // ==========================================================
  // CREAR REUNIÓN
  // ==========================================================

  const crearReunion =
    async () => {
      if (!user) {
        toast.error(
          'Sesión no válida.'
        )

        return
      }

      if (!nitActual) {
        toast.error(
          'No se encontró el CEA de la sesión.'
        )

        return
      }

      if (
        !validarForm()
      ) {
        return
      }

      setGuardando(
        true
      )

      try {
        const payload = {
          nit:
            nitActual,

          ...form,

          origen_modulo:
            form.origen_modulo,

          creado_por:
            user
              ?.nombreCompleto ||
            'Desconocido',
        }

        const res =
          await fetch(
            '/api/reuniones',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify(
                  payload
                ),
            }
          )

        const json =
          await res.json()

        if (
          json?.status ===
          'success'
        ) {
          toast.success(
            'Reunión creada y notificaciones enviadas.'
          )

          limpiarForm()
          setModalNuevaReunion(false)

          await cargarReuniones()
        } else {
          console.error(
            'Error creando reunión:',
            json
          )

          toast.error(
            json?.message ||
              json?.detail ||
              'No se pudo crear la reunión.'
          )
        }
      } catch (error) {
        console.error(
          'Error creando reunión:',
          error
        )

        toast.error(
          'Error al crear reunión.'
        )
      } finally {
        setGuardando(
          false
        )
      }
    }


  // ==========================================================
  // CANCELAR
  // ==========================================================

  const cancelarReunion =
    async (
      id,
      estadoActual
    ) => {
      if (
        estadoActual !==
        'Programada'
      ) {
        return
      }

      if (!nitActual) {
        toast.error(
          'No se encontró el CEA de la sesión.'
        )

        return
      }

      const confirmar =
        window.confirm(
          '¿Confirmas cancelar esta reunión?'
        )

      if (!confirmar) {
        return
      }

      try {
        const res =
          await fetch(
            `/api/reuniones/${id}/estado`,
            {
              method:
                'PATCH',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  nit:
                    nitActual,
                }),
            }
          )

        const json =
          await res.json()

        if (
          json?.status ===
          'success'
        ) {
          toast.success(
            'Reunión cancelada.'
          )

          setReunionDetalle(
            null
          )

          await cargarReuniones()
        } else {
          toast.error(
            json?.message ||
              'No se pudo cancelar.'
          )
        }
      } catch (error) {
        console.error(
          'Error cancelando reunión:',
          error
        )

        toast.error(
          'Error al cancelar reunión.'
        )
      }
    }


  // ==========================================================
  // DESCARGAR EXCEL
  // ==========================================================

  const descargarExcel =
    (id) => {
      if (!nitActual) {
        toast.error(
          'No se encontró el CEA de la sesión.'
        )

        return
      }

      window.open(
        `/api/reuniones/${id}/asistentes.xlsx?nit=${encodeURIComponent(
          nitActual
        )}`,
        '_blank'
      )
    }


  // ==========================================================
  // RESÚMENES
  // ==========================================================

  const resumen =
    useMemo(
      () => {
        const total =
          reuniones.length

        const programadas =
          reuniones.filter(
            (reunion) =>
              normalizarTexto(
                reunion.estado
              ) ===
              'programada'
          ).length

        const ejecutadas =
          reuniones.filter(
            (reunion) =>
              normalizarTexto(
                reunion.estado
              ) ===
              'ejecutada'
          ).length

        const canceladas =
          reuniones.filter(
            (reunion) =>
              normalizarTexto(
                reunion.estado
              ) ===
              'cancelada'
          ).length

        const pesv =
          reuniones.filter(
            (reunion) =>
              String(
                reunion.origen_modulo ||
                'GENERAL'
              )
                .trim()
                .toUpperCase() ===
              'PESV'
          ).length

        return {
          total,
          programadas,
          ejecutadas,
          canceladas,
          pesv,
        }
      },
      [
        reuniones,
      ]
    )


  // ==========================================================
  // FILTRADO LOCAL
  // ==========================================================

  const reunionesFiltradas =
    useMemo(
      () => {


        return reuniones.filter(
          (
            reunion
          ) => {
            if (
              filtros.origen_modulo &&
              String(
                reunion.origen_modulo ||
                'GENERAL'
              )
                .trim()
                .toUpperCase() !==
              filtros.origen_modulo
            ) {
              return false
            }

            if (
              filtros.tipo_reunion &&
              reunion.tipo_reunion !==
              filtros.tipo_reunion
            ) {
              return false
            }

            if (
              filtros.estado &&
              reunion.estado !==
              filtros.estado
            ) {
              return false
            }

            if (
              filtros.dirigido_a &&
              reunion.dirigido_a !==
              filtros.dirigido_a
            ) {
              return false
            }

            if (
              filtros.fecha_desde &&
              String(
                reunion.fecha_programada
              ) <
              filtros.fecha_desde
            ) {
              return false
            }

            if (
              filtros.fecha_hasta &&
              String(
                reunion.fecha_programada
              ) >
              filtros.fecha_hasta
            ) {
              return false
            }


            return true
          }
        )
      },
      [
        reuniones,
        filtros,
      ]
    )


  // ==========================================================
  // CARGANDO
  // ==========================================================

  if (!user) {
    return (
      <p
        className="
          text-center
          mt-20
        "
      >
        Cargando...
      </p>
    )
  }



  // ==========================================================
  // INTERFAZ INSTITUCIONAL - REUNIONES
  // ==========================================================
  const campoClase = 'w-full min-w-0 rounded-lg border border-[#94A3B8] bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#24638C] focus:ring-1 focus:ring-[#24638C]'
  const etiquetaClase = 'mb-1 block text-xs font-semibold text-slate-700'
  const filtroSelect = (nombre, opciones, etiqueta) => (
    <select aria-label={etiqueta} name={nombre} value={filtros[nombre]} onChange={onChangeFiltro} className={campoClase}>
      <option value="">{etiqueta}</option>
      {opciones.map((item) => {
        const value = typeof item === 'string' ? item : item.value
        const label = typeof item === 'string' ? item : item.label
        return <option key={value} value={value}>{label}</option>
      })}
    </select>
  )
  const campo = (nombre, titulo, tipo = 'text', obligatorio = false) => (
    <label className="block min-w-0">
      <span className={etiquetaClase}>{titulo}{obligatorio ? ' *' : ''}</span>
      <input name={nombre} type={tipo} value={form[nombre]} onChange={onChange} required={obligatorio} className={campoClase} />
    </label>
  )
  const selector = (nombre, titulo, opciones, obligatorio = false) => (
    <label className="block min-w-0">
      <span className={etiquetaClase}>{titulo}{obligatorio ? ' *' : ''}</span>
      <select name={nombre} value={form[nombre]} onChange={onChange} required={obligatorio} className={campoClase}>
        <option value="">Seleccione</option>
        {opciones.map((item) => {
          const value = typeof item === 'string' ? item : item.value
          const label = typeof item === 'string' ? item : item.label
          return <option key={value} value={value}>{label}</option>
        })}
      </select>
    </label>
  )
  const abrirNuevaReunion = () => { limpiarForm(); setModalNuevaReunion(true) }
  const cerrarNuevaReunion = () => { if (!guardando) setModalNuevaReunion(false) }
  const bordeTarjeta = { borderColor: '#9BB2C6', borderWidth: '1px' }
  const resumenItems = [
    { titulo: 'Registradas', valor: resumen.total, Icono: CalendarDays, detalle: 'Últimas 100 consultadas' },
    { titulo: 'Programadas', valor: resumen.programadas, Icono: Clock },
    { titulo: 'Ejecutadas', valor: resumen.ejecutadas, Icono: CheckCircle2 },
    { titulo: 'Canceladas', valor: resumen.canceladas, Icono: Ban },
    { titulo: 'Contexto PESV', valor: resumen.pesv, Icono: ShieldCheck },
  ]
  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 md:px-5">
      <Toaster position="top-center" richColors />
      <div className="mx-auto max-w-[1500px] space-y-4">
        <EncabezadoModulo titulo="Gestión de Reuniones y Capacitaciones" subtitulo="Programación, seguimiento y control de asistencia" icono={CalendarDays} rutaRegreso="/admin" textoRegreso="Menú Administrativo" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {resumenItems.map(({ titulo, valor, Icono, detalle }) => (
            <TarjetaModulo key={titulo} interactiva={false} className="flex min-h-[90px] items-center gap-3 p-3" style={bordeTarjeta}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#24638C]"><Icono size={21}/></div>
              <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">{titulo}</p><p className="text-xl font-bold text-slate-800">{valor}</p>{detalle && <p className="text-[10px] text-slate-500">{detalle}</p>}</div>
            </TarjetaModulo>
          ))}
        </div>
        <section className="rounded-xl border border-[#9BB2C6] bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
              {filtroSelect('origen_modulo', ORIGENES_MODULO, 'Todos los contextos')}
              {filtroSelect('tipo_reunion', TIPOS, 'Todos los tipos')}
              {filtroSelect('estado', ESTADOS, 'Todos los estados')}
              {filtroSelect('dirigido_a', DIRIGIDO_A, 'Todos los destinatarios')}
              <input aria-label="Fecha desde" title="Fecha desde" type="date" name="fecha_desde" value={filtros.fecha_desde} onChange={onChangeFiltro} className={campoClase} />
              <input aria-label="Fecha hasta" title="Fecha hasta" type="date" name="fecha_hasta" value={filtros.fecha_hasta} onChange={onChangeFiltro} className={campoClase} />
            </div>
            <BotonLimpiar type="button" onClick={limpiarFiltros} className="shrink-0"><FilterX size={15}/> Limpiar</BotonLimpiar>
          </div>
        </section>
        <section className="overflow-hidden rounded-xl border border-[#9BB2C6] bg-white shadow-sm">
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" style={{ backgroundColor: ESTILO_SECCIONES.fondo, color: ESTILO_SECCIONES.texto }}>
            <h2 className="flex items-center gap-2 text-sm font-bold"><CalendarDays size={18}/> Registro de Reuniones/Capacitaciones <span className="text-xs font-normal opacity-80">({reunionesFiltradas.length})</span></h2>
            <div className="flex flex-wrap items-center gap-2">
              <BotonAgregar type="button" onClick={abrirNuevaReunion}><CalendarPlus size={15}/> Programar nueva reunión</BotonAgregar>
              <BotonActualizar type="button" onClick={cargarReuniones} disabled={cargandoLista}><RefreshCw size={15} className={cargandoLista ? 'animate-spin' : ''}/> Actualizar</BotonActualizar>
            </div>
          </div>
          <div className="overflow-x-auto">
            <MarcoTabla className="!rounded-none !border-0">
              <table className="w-full min-w-[1000px] text-center text-xs">
                <thead><tr>{['Fecha / Hora', 'Tipo', 'Contexto', 'Descripción', 'Dirigido a', 'Responsable', 'Estado', 'Acciones'].map((titulo) => <th key={titulo} className="border border-[#CBD5E1] px-3 py-3 text-center font-bold">{titulo}</th>)}</tr></thead>
                <tbody>
                  {cargandoLista ? <tr><td colSpan={8} className="p-8 text-center">Cargando reuniones...</td></tr> :
                    reunionesFiltradas.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-slate-500">No se encontraron reuniones.</td></tr> :
                    reunionesFiltradas.map((reunion) => (
                      <tr key={reunion.id} className="hover:bg-slate-50">
                        <td className="border border-[#CBD5E1] px-3 py-2 text-center">{formatearFecha(reunion.fecha_programada)}<div className="text-slate-500">{reunion.hora_inicio} - {reunion.hora_fin}</div></td>
                        <td className="border border-[#CBD5E1] px-3 py-2 text-center">{reunion.tipo_reunion || '-'}</td>
                        <td className="border border-[#CBD5E1] px-3 py-2 text-center"><OrigenPill origen={reunion.origen_modulo}/></td>
                        <td className="max-w-[280px] border border-[#CBD5E1] px-3 py-2 text-center break-words">{reunion.descripcion || '-'}</td>
                        <td className="border border-[#CBD5E1] px-3 py-2 text-center">{reunion.dirigido_a || '-'}</td>
                        <td className="border border-[#CBD5E1] px-3 py-2 text-center">{reunion.responsable || '-'}</td>
                        <td className="border border-[#CBD5E1] px-3 py-2 text-center"><EstadoPill estado={reunion.estado}/></td>
                        <td className="border border-[#CBD5E1] px-3 py-2 text-center">
                          <div className="flex flex-wrap justify-center gap-1.5">
                            <BotonVerDetalle type="button" title="Ver detalle" aria-label="Ver detalle" onClick={() => setReunionDetalle(reunion)}><Eye size={15}/></BotonVerDetalle>
                            <BotonExcel type="button" title="Descargar asistentes Excel" aria-label="Descargar Excel" onClick={() => descargarExcel(reunion.id)}><FileSpreadsheet size={15}/></BotonExcel>
                            {reunion.estado === 'Programada' && !reunionFinalizada(reunion) && <BotonEliminar type="button" title="Cancelar reunión" aria-label="Cancelar reunión" onClick={() => cancelarReunion(reunion.id, reunion.estado)}><Ban size={15}/></BotonEliminar>}
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </MarcoTabla>
          </div>
        </section>
      </div>

      {modalNuevaReunion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3" onMouseDown={(e) => { if (e.target === e.currentTarget) cerrarNuevaReunion() }}>
          <section role="dialog" aria-modal="true" aria-labelledby="titulo-nueva-reunion" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <FranjaSuperiorModal className="flex items-center justify-between gap-3 px-5 py-4">
              <h2 id="titulo-nueva-reunion" className="flex items-center gap-2 text-base font-bold"><CalendarPlus size={19}/> Programar nueva reunión</h2>
              <button type="button" aria-label="Cerrar" onClick={cerrarNuevaReunion} disabled={guardando}><X size={20}/></button>
            </FranjaSuperiorModal>
            <div className="space-y-4 overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {selector('tipo_reunion', 'Tipo de reunión', TIPOS, true)}
                {selector('origen_modulo', 'Área / Contexto', ORIGENES_MODULO, true)}
                {selector('dirigido_a', 'Dirigido a', DIRIGIDO_A)}
                {campo('fecha_programada', 'Fecha programada', 'date', true)}
                {campo('hora_inicio', 'Hora inicio', 'time', true)}
                {campo('hora_fin', 'Hora fin', 'time', true)}
                {selector('modalidad', 'Modalidad', MODALIDADES)}
                {campo('responsable', 'Responsable')}
                {campo('lugar', 'Lugar')}
              </div>
              <label className="block"><span className={etiquetaClase}>Descripción *</span><textarea name="descripcion" value={form.descripcion} onChange={onChange} rows={4} className={campoClase} /></label>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <BotonCancelar type="button" onClick={cerrarNuevaReunion} disabled={guardando}><X size={15}/> Cerrar</BotonCancelar>
              <BotonGuardar type="button" onClick={crearReunion} disabled={guardando}><Save size={15}/> {guardando ? 'Registrando...' : 'Registrar reunión'}</BotonGuardar>
            </div>
          </section>
        </div>
      )}
      {reunionDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3" onMouseDown={(e) => { if (e.target === e.currentTarget) setReunionDetalle(null) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="titulo-detalle-reunion" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <FranjaSuperiorModal className="flex items-center justify-between gap-3 px-5 py-4">
              <h2 id="titulo-detalle-reunion" className="flex items-center gap-2 text-base font-bold"><Eye size={19}/> Detalle de reunión: {reunionDetalle.tipo_reunion}</h2>
              <button type="button" aria-label="Cerrar detalle" onClick={() => setReunionDetalle(null)}><X size={20}/></button>
            </FranjaSuperiorModal>
            <div className="space-y-4 overflow-y-auto p-5">
              <div className="flex flex-wrap gap-2"><OrigenPill origen={reunionDetalle.origen_modulo}/><EstadoPill estado={reunionDetalle.estado}/></div>
              <div className="rounded-lg border border-[#9BB2C6] bg-slate-50 p-3 text-sm text-slate-800">{reunionDetalle.descripcion || 'Sin descripción'}</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  ['Fecha programada', formatearFecha(reunionDetalle.fecha_programada)],
                  ['Horario', `${reunionDetalle.hora_inicio} - ${reunionDetalle.hora_fin}`],
                  ['Modalidad', reunionDetalle.modalidad],
                  ['Lugar', reunionDetalle.lugar],
                  ['Responsable', reunionDetalle.responsable],
                  ['Dirigido a', reunionDetalle.dirigido_a],
                  ['Creado por', reunionDetalle.creado_por],
                  ['Contexto', obtenerEtiquetaOrigen(reunionDetalle.origen_modulo)],
                ].map(([titulo, valor]) => <div key={titulo} className="rounded-lg border border-[#9BB2C6] bg-white p-3"><p className="text-[10px] font-bold uppercase text-slate-500">{titulo}</p><p className="mt-1 text-xs font-medium text-slate-800">{valor || '-'}</p></div>)}
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
              {reunionDetalle.estado === 'Ejecutada' && <BotonExcel type="button" onClick={() => descargarExcel(reunionDetalle.id)}><FileSpreadsheet size={15}/> Descargar asistentes</BotonExcel>}
              <BotonCancelar type="button" onClick={() => setReunionDetalle(null)}><X size={15}/> Cerrar</BotonCancelar>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}


// ============================================================
// CAMPO DETALLE
// ============================================================

function DetalleCampo({
  titulo,
  valor,
  icono,
}) {
  return (
    <div
      className="
        border
        border-slate-200
        rounded-xl
        p-3
        bg-white
      "
    >
      <div
        className="
          flex
          items-start
          gap-2
        "
      >
        <div
          className="
            w-7
            h-7
            rounded-lg
            bg-slate-100
            text-slate-600
            flex
            items-center
            justify-center
            shrink-0
          "
        >
          <i
            className={`
              fas
              ${icono}
              text-[11px]
            `}
          ></i>
        </div>

        <div
          className="
            min-w-0
          "
        >
          <p
            className="
              text-[9px]
              uppercase
              tracking-wide
              font-bold
              text-slate-500
            "
          >
            {titulo}
          </p>

          <p
            className="
              text-xs
              text-slate-800
              font-medium
              mt-1
              break-words
            "
          >
            {valor}
          </p>
        </div>
      </div>
    </div>
  )
}