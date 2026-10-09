// app/admin/mantenimientos/plan-mantenimiento/page.jsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Gauge,
  FileDown,
  Loader2,
  RefreshCw,
  TriangleAlert,
  Wrench,
  X,
} from 'lucide-react'

import EncabezadoModulo from '@/components/admin/EncabezadoModulo'
import ModalResultado from '@/components/admin/ModalResultado'
import { BotonAccion, ESTILO_SECCIONES, ESTILO_SECCIONES_SECUNDARIAS, ESTILO_FRANJA_SUPERIOR_MODAL, ESTILO_ENCABEZADO_TABLA, ESTILO_CELDAS_TABLA } from '@/components/admin/EstiloModulo'
import { cerrarSesion } from '@/lib/auth/logout'

const MESES = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
]

function numero(valor) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

function formatoNumero(valor, decimales = 0) {
  const n = numero(valor)
  if (n === null) return '—'

  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: decimales,
    minimumFractionDigits: decimales,
  }).format(n)
}

function formatoKm(valor) {
  const n = numero(valor)
  return n === null ? '—' : `${formatoNumero(n)} km`
}

function formatoFecha(fecha) {
  if (!fecha) return '—'
  const [anio, mes, dia] = String(fecha).slice(0, 10).split('-')
  if (!anio || !mes || !dia) return fecha
  return `${dia}/${mes}/${anio}`
}

function obtenerCurrentUser() {
  if (typeof window === 'undefined') return null

  try {
    return JSON.parse(localStorage.getItem('currentUser') || 'null')
  } catch {
    return null
  }
}

function obtenerNit(user) {
  return (
    user?.nitEmpresa ||
    user?.nit ||
    user?.empresa?.nit ||
    ''
  )
}

function claseEstado(tipo) {
  if (tipo === 'EJECUTADO') {
    return 'border-slate-300 bg-emerald-200 text-slate-900'
  }

  if (tipo === 'VENCIDO') {
    return 'border-slate-300 bg-orange-200 text-slate-900'
  }

  return 'border-slate-300 bg-blue-200 text-slate-900'
}

function etiquetaEstado(tipo) {
  return tipo || 'PROGRAMADO'
}

function PuntoChip({ punto, tipo, onClick }) {
  const actividades = punto?.actividades || []
  const frecuencias = [
    ...new Set(
      actividades
        .map((x) => numero(x.frecuencia_km))
        .filter(Boolean)
    ),
  ].sort((a, b) => a - b)

  return (
    <button
      type="button"
      onClick={() => onClick(punto, tipo)}
      className={`w-full rounded-lg border px-2 py-2 text-left shadow-sm transition hover:shadow ${claseEstado(tipo)}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-extrabold">
          P{punto?.punto || punto?.ciclo || '—'}
        </span>
        <span className="text-[9px] font-bold uppercase">
          {etiquetaEstado(tipo)}
        </span>
      </div>

      {frecuencias.length > 0 && (
        <div className="mt-1 text-[9px] font-semibold">
          {frecuencias.map((f) => `${formatoNumero(f / 1000)}k`).join(' + ')}
        </div>
      )}

      {punto?.historico_reconstruido && (
        <div className="mt-1 text-[8px] font-extrabold uppercase tracking-wide text-slate-600">
          Historial 2026
        </div>
      )}

      {punto?.fecha_debio_realizarse && (
        <div className="mt-1 text-[9px] text-slate-700">
          Debió: {formatoFecha(punto.fecha_debio_realizarse)}
        </div>
      )}

      {tipo === 'PROGRAMADO' && punto?.km_objetivo != null && (
        <div className="mt-1 text-[9px]">
          Objetivo {formatoKm(punto.km_objetivo)}
        </div>
      )}
    </button>
  )
}


function contarMes(mes) {
  const pendientes =
    (mes?.programados || []).length
  const ejecutados =
    (mes?.ejecutados || []).length
  const vencidos =
    (mes?.vencidos || []).length

  return {
    programados:
      pendientes + ejecutados + vencidos,
    ejecutados,
    vencidos,
  }
}

function sumarConteos(a, b) {
  return {
    programados: a.programados + b.programados,
    ejecutados: a.ejecutados + b.ejecutados,
    vencidos: a.vencidos + b.vencidos,
  }
}

function totalizarPlan(vehiculos) {
  const trimestres = [
    { nombre: 'I TRIMESTRE', meses: ['ENE', 'FEB', 'MAR'] },
    { nombre: 'II TRIMESTRE', meses: ['ABR', 'MAY', 'JUN'] },
    { nombre: 'III TRIMESTRE', meses: ['JUL', 'AGO', 'SEP'] },
    { nombre: 'IV TRIMESTRE', meses: ['OCT', 'NOV', 'DIC'] },
  ]

  const resultado = trimestres.map((trimestre) => {
    let total = {
      programados: 0,
      ejecutados: 0,
      vencidos: 0,
    }

    for (const vehiculo of vehiculos || []) {
      for (const mes of trimestre.meses) {
        total = sumarConteos(
          total,
          contarMes(vehiculo?.meses?.[mes])
        )
      }
    }

    return {
      ...trimestre,
      ...total,
    }
  })

  const anual = resultado.reduce(
    (acc, item) => sumarConteos(acc, item),
    {
      programados: 0,
      ejecutados: 0,
      vencidos: 0,
    }
  )

  return {
    trimestres: resultado,
    anual,
  }
}

export default function PlanMantenimientoPage() {
  const router = useRouter()

  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [vigencia, setVigencia] = useState(new Date().getFullYear())
  const [modal, setModal] = useState(null)
  const [justificacion, setJustificacion] = useState('')
  const [guardandoJustificacion, setGuardandoJustificacion] = useState(false)

  const currentUser = useMemo(() => obtenerCurrentUser(), [])
  const nit = useMemo(() => obtenerNit(currentUser), [currentUser])

  async function cargar({ silencioso = false } = {}) {
    if (!nit) {
      setError('No fue posible identificar la empresa de la sesión.')
      setCargando(false)
      return
    }

    if (silencioso) setActualizando(true)
    else setCargando(true)

    setError('')

    try {
      const respuesta = await fetch(
        `/api/admin/mantenimientos/plan-mantenimiento?vigencia=${vigencia}`,
        {
          method: 'GET',
          headers: {
            'x-cea-nit': nit,
          },
          cache: 'no-store',
        }
      )

      const json = await respuesta.json().catch(() => ({}))

      if (!respuesta.ok || json?.status !== 'success') {
        throw new Error(
          json?.message ||
            json?.error ||
            'No fue posible consultar el Plan de Mantenimiento.'
        )
      }

      setData(json)
    } catch (e) {
      console.error(e)
      setError(e?.message || 'Error consultando el Plan de Mantenimiento.')
    } finally {
      setCargando(false)
      setActualizando(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vigencia, nit])

  function abrirPunto(punto, tipo, vehiculo) {
    setJustificacion(punto?.justificacion_vencimiento || '')
    setModal({
      punto,
      tipo,
      vehiculo,
    })
  }

  function cerrarModal() {
    if (guardandoJustificacion) return
    setModal(null)
    setJustificacion('')
  }

  async function guardarJustificacion() {
    const punto = modal?.punto

    if (!punto) {
      setError(
        'No se encontró la información del vencimiento.'
      )
      return
    }

    if (!justificacion.trim()) {
      setError('La justificación del vencimiento es obligatoria.')
      return
    }

    setGuardandoJustificacion(true)
    setError('')

    try {
      const respuesta = await fetch(
        '/api/admin/mantenimientos/plan-mantenimiento',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cea-nit': nit,
          },
          body: JSON.stringify({
            accion:
              punto?.historico_reconstruido
                ? 'GESTIONAR_VENCIDO_HISTORICO'
                : 'JUSTIFICAR_VENCIDO',
            programacion_id:
              punto?.historico_reconstruido
                ? null
                : punto.id,
            vehiculo_id:
              punto?.historico_reconstruido
                ? modal?.vehiculo?.id
                : null,
            ciclo:
              punto?.historico_reconstruido
                ? (punto?.punto || punto?.ciclo)
                : null,
            fecha_vencimiento:
              punto?.historico_reconstruido
                ? punto?.fecha_vencimiento
                : null,
            km_vencimiento:
              punto?.historico_reconstruido
                ? punto?.km_vencimiento
                : null,
            km_objetivo:
              punto?.historico_reconstruido
                ? (punto?.km_objetivo || punto?.km_debio_realizarse)
                : null,
            justificacion: justificacion.trim(),
            responsable:
              currentUser?.nombre ||
              currentUser?.nombres ||
              currentUser?.usuario ||
              null,
            documento_responsable:
              currentUser?.documento ||
              currentUser?.numeroDocumento ||
              null,
          }),
        }
      )

      const json = await respuesta.json().catch(() => ({}))

      if (!respuesta.ok || json?.status !== 'success') {
        throw new Error(
          json?.message || 'No fue posible guardar la justificación.'
        )
      }

      setModal(null)
      setJustificacion('')
      await cargar({ silencioso: true })
    } catch (e) {
      console.error(e)
      setError(e?.message || 'Error guardando la justificación.')
    } finally {
      setGuardandoJustificacion(false)
    }
  }

  const vehiculos = data?.vehiculos || []
  const vigencias = data?.vigencias_disponibles || [vigencia]

  const totalizado = useMemo(
    () => totalizarPlan(vehiculos),
    [vehiculos]
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 p-3 md:p-5">
      <div className="mx-auto max-w-[1550px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <EncabezadoModulo
          icono={Wrench}
          titulo="PLAN DE MANTENIMIENTO"
          subtitulo="Matriz anual de programación preventiva por vehículo"
          currentUser={currentUser}
          permitirPersonalizacion={false}
          rutaRegreso="/admin/mantenimientos"
          textoRegreso="Mantenimiento Vehicular"
          onVolver={() => router.push('/admin/mantenimientos')}
          onCerrarSesion={() => cerrarSesion(router)}
        />

        <main className="p-4 md:p-5">

        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
            <CircleAlert size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {cargando ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
              <Loader2 size={20} className="animate-spin" />
              Calculando programación dinámica...
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-col gap-2 rounded-xl border border-slate-300 bg-slate-50 p-2.5 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                <Resumen
                  icono={Car}
                  titulo="Vehículos"
                  valor={vehiculos.length}
                />
                <Resumen
                  icono={CalendarDays}
                  titulo={`Programados ${vigencia}`}
                  valor={totalizado.anual.programados}
                />
                <Resumen
                  icono={CheckCircle2}
                  titulo="Ejecutados"
                  valor={totalizado.anual.ejecutados}
                />
                <Resumen
                  icono={TriangleAlert}
                  titulo="Vencidos"
                  valor={totalizado.anual.vencidos}
                />
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-2 xl:border-l xl:border-t-0 xl:pl-3 xl:pt-0">
                <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600">
                  Vigencia
                </label>

                <div className="relative">
                  <select
                    value={vigencia}
                    onChange={(e) => setVigencia(Number(e.target.value))}
                    className="appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-xs font-bold text-slate-800 outline-none focus:border-slate-500"
                  >
                    {vigencias.map((anio) => (
                      <option key={anio} value={anio}>
                        {anio}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>

                <BotonAccion tipo="actualizar"
                  type="button"
                  onClick={() => cargar({ silencioso: true })}
                  disabled={actualizando}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-700 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-slate-600 disabled:opacity-60"
                >
                  <RefreshCw
                    size={13}
                    className={actualizando ? 'animate-spin' : ''}
                  />
                  Actualizar
                </BotonAccion>

                <BotonAccion tipo="pdf"
                  type="button"
                  onClick={() =>
                    router.push(
                      `/admin/mantenimientos/plan-mantenimiento/documento?anio=${vigencia}`
                    )
                  }
                  disabled={cargando || vehiculos.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-white px-3 py-2 text-[11px] font-bold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileDown size={13} />
                  Generar PDF
                </BotonAccion>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
              <div className="border-b border-slate-300 px-4 py-3 text-white" style={{ backgroundColor: ESTILO_SECCIONES.fondo }}>
                <div className="text-sm font-extrabold">
                  Matriz de programación dinámica · {vigencia}
                </div>
                <div className="mt-1 text-[11px] font-medium text-white/85">
                  Los meses futuros se calculan automáticamente con la configuración, los mantenimientos reales y el kilometraje de los preoperacionales.
                </div>
              </div>

              {vehiculos.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-slate-500">
                  No hay vehículos con configuración de mantenimiento FINALIZADA.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1650px] w-full border-collapse">
                    <thead>
                      <tr className="text-[10px] font-extrabold uppercase tracking-wide" style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, color: ESTILO_ENCABEZADO_TABLA.texto }}>
                        <th className="sticky left-0 z-20 min-w-[250px] border-b border-r border-slate-300 px-3 py-3 text-left" style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo }}>
                          Vehículo
                        </th>
                        {MESES.map((mes) => (
                          <th
                            key={mes}
                            className="min-w-[112px] border-b border-r border-slate-300 px-2 py-3 text-center"
                          >
                            {mes}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {vehiculos.map((vista) => (
                        <FilaVehiculo
                          key={vista.vehiculo.id}
                          vista={vista}
                          abrirPunto={abrirPunto}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
              <div className="border-b border-slate-300 px-4 py-2.5 text-white" style={{ backgroundColor: ESTILO_SECCIONES_SECUNDARIAS.fondo }}>
                <div className="text-xs font-extrabold uppercase tracking-wide">
                  Totalizado trimestral y acumulado anual · {vigencia}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] border-collapse text-[11px]">
                  <thead>
                    <tr className="text-[10px] font-extrabold uppercase tracking-wide" style={{ backgroundColor: ESTILO_ENCABEZADO_TABLA.fondo, color: ESTILO_ENCABEZADO_TABLA.texto }}>
                      <th className="border-b border-r border-slate-300 px-3 py-2 text-left">
                        Período
                      </th>
                      <th className="border-b border-r border-slate-300 px-3 py-2 text-center">
                        Programados
                      </th>
                      <th className="border-b border-r border-slate-300 px-3 py-2 text-center">
                        Ejecutados
                      </th>
                      <th className="border-b border-slate-300 px-3 py-2 text-center">
                        Vencidos
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {totalizado.trimestres.map((item) => (
                      <tr key={item.nombre} className="text-slate-800">
                        <td className="border-b border-r border-slate-200 px-3 py-2 font-bold">
                          {item.nombre}
                        </td>
                        <td className="border-b border-r border-slate-200 px-3 py-2 text-center font-extrabold">
                          {item.programados}
                        </td>
                        <td className="border-b border-r border-slate-200 px-3 py-2 text-center font-extrabold">
                          {item.ejecutados}
                        </td>
                        <td className="border-b border-slate-200 px-3 py-2 text-center font-extrabold">
                          {item.vencidos}
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-slate-100 text-slate-900">
                      <td className="border-r border-slate-300 px-3 py-2.5 font-extrabold">
                        ACUMULADO ANUAL
                      </td>
                      <td className="border-r border-slate-300 px-3 py-2.5 text-center font-extrabold">
                        {totalizado.anual.programados}
                      </td>
                      <td className="border-r border-slate-300 px-3 py-2.5 text-center font-extrabold">
                        {totalizado.anual.ejecutados}
                      </td>
                      <td className="px-3 py-2.5 text-center font-extrabold">
                        {totalizado.anual.vencidos}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-600 shadow-sm">
              <span className="font-bold text-slate-800">Criterio:</span>{' '}
              la programación se genera automáticamente con la información existente. El mes proyectado se recalcula según el recorrido reciente y el vencimiento se determina al superar el kilometraje objetivo más la tolerancia configurada.
            </div>
          </>
        )}
        </main>
      </div>

      {modal && (
        <ModalPunto
          modal={modal}
          justificacion={justificacion}
          setJustificacion={setJustificacion}
          guardarJustificacion={guardarJustificacion}
          guardando={guardandoJustificacion}
          cerrar={cerrarModal}
        />
      )}
      <ModalResultado
        abierto={Boolean(error)}
        tipo={error ? 'error' : 'exito'}
        titulo={error ? 'No fue posible completar la operación' : 'Operación realizada satisfactoriamente'}
        mensaje={error || ''}
        onCerrar={() => { setError('');  }}
      />

    </div>
  )
}

function Resumen({ icono: Icono, titulo, valor }) {
  return (
    <div className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="rounded-md border border-slate-200 bg-slate-100 p-1.5 text-slate-700">
          <Icono size={14} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[9px] font-extrabold uppercase tracking-wide text-slate-500">
            {titulo}
          </div>
          <div className="text-base font-extrabold leading-none text-slate-900">
            {valor}
          </div>
        </div>
      </div>
    </div>
  )
}

function FilaVehiculo({ vista, abrirPunto }) {
  const v = vista.vehiculo
  const km = vista.kilometraje || {}
  const ciclo = vista.ciclo || {}

  return (
    <tr className="align-top">
      <td className="sticky left-0 z-10 border-b border-r border-slate-300 bg-white px-3 py-3">
        <div className="font-extrabold text-slate-900">
          {v.placa}
        </div>
        <div className="mt-0.5 text-[10px] font-semibold text-slate-500">
          {[v.marca, v.linea].filter(Boolean).join(' · ')}
        </div>

        <div className="mt-2 space-y-1 text-[10px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <Gauge size={12} />
            <span>
              Km actual: <b>{formatoKm(km.ultimo_km)}</b>
            </span>
          </div>
          <div>
            Promedio dinámico:{' '}
            <b>{formatoKm(km.promedio_km_mes)}/mes</b>
          </div>
          <div>
            Próximo punto:{' '}
            <b>P{ciclo.punto_actual || '—'}</b>
          </div>
          <div>
            Base:{' '}
            <b>{formatoKm(ciclo.frecuencia_base_km)}</b>
          </div>
        </div>

        {vista.errores?.length > 0 && (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[9px] font-bold text-amber-800">
            {vista.errores.join(' · ')}
          </div>
        )}
      </td>

      {MESES.map((mes) => {
        const celda = vista.meses?.[mes] || {
          programados: [],
          ejecutados: [],
          vencidos: [],
        }

        return (
          <td
            key={mes}
            className="border-b border-r border-slate-300 bg-slate-50/40 px-1.5 py-2"
          >
            <div className="space-y-1.5">
              {celda.vencidos.map((p) => (
                <PuntoChip
                  key={`v-${p.id || p.punto}`}
                  punto={p}
                  tipo="VENCIDO"
                  onClick={(punto, tipo) =>
                    abrirPunto(punto, tipo, v)
                  }
                />
              ))}

              {celda.ejecutados.map((p) => (
                <PuntoChip
                  key={`e-${p.id || p.punto}`}
                  punto={p}
                  tipo="EJECUTADO"
                  onClick={(punto, tipo) =>
                    abrirPunto(punto, tipo, v)
                  }
                />
              ))}

              {celda.programados.map((p) => (
                <PuntoChip
                  key={`p-${p.punto}`}
                  punto={p}
                  tipo={p.estado}
                  onClick={(punto, tipo) =>
                    abrirPunto(punto, tipo, v)
                  }
                />
              ))}
            </div>
          </td>
        )
      })}
    </tr>
  )
}

function ModalPunto({
  modal,
  justificacion,
  setJustificacion,
  guardarJustificacion,
  guardando,
  cerrar,
}) {
  const { punto, tipo, vehiculo } = modal
  const actividades = punto?.actividades || []

  const actividadesPorFrecuencia =
    actividades.reduce((mapa, actividad) => {
      const frecuencia =
        numero(actividad?.frecuencia_km) || 0

      if (!mapa.has(frecuencia)) {
        mapa.set(frecuencia, [])
      }

      mapa.get(frecuencia).push(actividad)
      return mapa
    }, new Map())

  const gruposFrecuencia =
    [...actividadesPorFrecuencia.entries()]
      .sort((a, b) => a[0] - b[0])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl">
        <div className="border-b border-slate-300 p-3" style={{ backgroundColor: ESTILO_FRANJA_SUPERIOR_MODAL.fondo }}>
          <div className="flex items-stretch gap-2">
            <div className="flex flex-1 items-center rounded-lg border border-slate-300 bg-white px-3 py-2">
              <div>
                <div className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500">
                  Vehículo
                </div>
                <div className="text-sm font-extrabold text-slate-900">
                  {vehiculo?.placa}
                </div>
              </div>
            </div>

            <div className="flex min-w-[92px] items-center rounded-lg border border-slate-300 bg-white px-3 py-2">
              <div>
                <div className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500">
                  Punto
                </div>
                <div className="text-sm font-extrabold text-slate-900">
                  P{punto?.punto || punto?.ciclo}
                </div>
              </div>
            </div>

            <div className={`flex min-w-[120px] items-center rounded-lg border px-3 py-2 ${claseEstado(tipo)}`}>
              <div>
                <div className="text-[9px] font-extrabold uppercase tracking-wide opacity-70">
                  Estado
                </div>
                <div className="text-xs font-extrabold">
                  {etiquetaEstado(tipo)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={cerrar}
              className="flex w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-200"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(92vh-58px)] overflow-y-auto p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Dato titulo="Km referencia" valor={formatoKm(punto?.km_referencia)} />
            <Dato titulo="Km objetivo" valor={formatoKm(punto?.km_objetivo)} />
            <Dato titulo="Tolerancia" valor={formatoKm(punto?.tolerancia_km)} />
            <Dato
              titulo="Límite máximo"
              valor={formatoKm(
                punto?.km_maximo ??
                  (numero(punto?.km_objetivo) !== null &&
                  numero(punto?.tolerancia_km) !== null
                    ? numero(punto.km_objetivo) + numero(punto.tolerancia_km)
                    : null)
              )}
            />
          </div>

          {tipo === 'PROGRAMADO' && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Dato titulo="Km actual" valor={formatoKm(punto?.km_actual)} />
              <Dato titulo="Km faltantes" valor={formatoKm(punto?.km_faltantes)} />
              <Dato titulo="Fecha estimada" valor={formatoFecha(punto?.fecha_proyectada)} />
            </div>
          )}

          {tipo === 'VENCIDO' && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Dato titulo="Fecha vencimiento" valor={formatoFecha(punto?.fecha_vencimiento)} />
              <Dato titulo="Km vencimiento" valor={formatoKm(punto?.km_vencimiento)} />
              <Dato
                titulo="Atendido posteriormente"
                valor={punto?.atendido ? 'SÍ' : 'NO'}
              />
            </div>
          )}

          {tipo === 'EJECUTADO' && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Dato titulo="Fecha ejecución" valor={formatoFecha(punto?.fecha_ejecucion)} />
              <Dato titulo="Km ejecución" valor={formatoKm(punto?.km_ejecucion)} />
            </div>
          )}

          {punto?.historico_reconstruido && (
            <div className="mt-4 rounded-xl border border-slate-300 bg-slate-50 p-3">
              <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600">
                Reconstrucción histórica 2026
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-2">
                  <div className="text-[9px] font-bold uppercase text-slate-500">
                    Fecha en que debió realizarse
                  </div>
                  <div className="mt-1 text-xs font-extrabold text-slate-800">
                    {formatoFecha(punto?.fecha_debio_realizarse)}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-2">
                  <div className="text-[9px] font-bold uppercase text-slate-500">
                    Km estimado de obligación
                  </div>
                  <div className="mt-1 text-xs font-extrabold text-slate-800">
                    {formatoKm(punto?.km_debio_realizarse || punto?.km_objetivo)}
                  </div>
                </div>
              </div>

              {punto?.actividad_historica && (
                <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2 text-[10px] text-slate-600">
                  <span className="font-extrabold">Registro histórico:</span>{' '}
                  {punto.actividad_historica}
                </div>
              )}
            </div>
          )}

          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-700">
              <Wrench size={14} />
              Actividades del punto
            </div>

            {actividades.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
                No se encontraron actividades para este punto.
              </div>
            ) : (
              <div className="space-y-3">
                {gruposFrecuencia.map(([frecuencia, lista]) => (
                  <div
                    key={frecuencia}
                    className="overflow-hidden rounded-xl border border-slate-300 bg-white"
                  >
                    <div className="flex items-center justify-between border-b border-slate-300 bg-slate-200 px-3 py-2">
                      <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-700">
                        Frecuencia {formatoKm(frecuencia)}
                      </div>
                      <div className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[9px] font-extrabold text-slate-600">
                        {lista.length} {lista.length === 1 ? 'actividad' : 'actividades'}
                      </div>
                    </div>

                    <div className="divide-y divide-slate-200">
                      {lista.map((a) => (
                        <div
                          key={`${a.configuracion_id}-${a.actividad_id}`}
                          className="px-3 py-2.5"
                        >
                          <div className="text-xs font-semibold text-slate-800">
                            {a.actividad}
                          </div>
                          {a.accion && (
                            <div className="mt-0.5 text-[10px] text-slate-500">
                              {a.accion}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {tipo === 'VENCIDO' &&
            punto?.justificacion_vencimiento && (
            <div className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
              <div className="text-xs font-extrabold uppercase tracking-wide text-emerald-900">
                Vencimiento gestionado
              </div>

              <div className="mt-2 text-[11px] text-slate-700">
                La justificación ya fue registrada. El punto conserva el estado
                VENCIDO y permanece visible como antecedente.
              </div>

              <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3">
                <div className="text-[9px] font-bold uppercase text-slate-500">
                  Justificación registrada
                </div>
                <div className="mt-1 whitespace-pre-wrap text-xs font-semibold text-slate-800">
                  {punto.justificacion_vencimiento}
                </div>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-emerald-200 bg-white p-2">
                  <div className="text-[9px] font-bold uppercase text-slate-500">
                    Responsable
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-800">
                    {punto?.responsable_justificacion || '—'}
                  </div>
                </div>

                <div className="rounded-lg border border-emerald-200 bg-white p-2">
                  <div className="text-[9px] font-bold uppercase text-slate-500">
                    Fecha de gestión
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-800">
                    {formatoFecha(punto?.justificado_at)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tipo === 'VENCIDO' &&
            !punto?.justificacion_vencimiento && (
            <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4">
              <div className="text-xs font-extrabold uppercase text-orange-900">
                Justificación del vencimiento
              </div>
              <p className="mt-1 text-[11px] text-orange-800">
                El vencimiento permanecerá visible en la matriz. La gestión registra la justificación y el responsable, pero no elimina ni cambia el estado VENCIDO.
              </p>

              <textarea
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                rows={4}
                placeholder="Registre la justificación..."
                className="mt-3 w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-orange-400"
              />

              <div className="mt-3 flex justify-end">
                <BotonAccion tipo="guardar"
                  type="button"
                  onClick={guardarJustificacion}
                  disabled={guardando || !justificacion.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardando && <Loader2 size={14} className="animate-spin" />}
                  Guardar justificación
                </BotonAccion>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Dato({ titulo, valor }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
        {titulo}
      </div>
      <div className="mt-0.5 text-xs font-extrabold text-slate-800">
        {valor}
      </div>

    </div>
  )
}
