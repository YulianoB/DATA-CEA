// app/instructor/practica/plan-mantenimiento/page.js

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Toaster, toast } from 'sonner'
import { cerrarSesion } from '@/lib/auth/logout'

const MESES = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
]

const NOMBRES_MESES = {
  ENE: 'Enero',
  FEB: 'Febrero',
  MAR: 'Marzo',
  ABR: 'Abril',
  MAY: 'Mayo',
  JUN: 'Junio',
  JUL: 'Julio',
  AGO: 'Agosto',
  SEP: 'Septiembre',
  OCT: 'Octubre',
  NOV: 'Noviembre',
  DIC: 'Diciembre',
}

function claseEstado(tipo) {
  if (tipo === 'EJECUTADO') {
    return {
      tarjeta: 'border-emerald-300 bg-emerald-50',
      insignia: 'border-emerald-300 bg-emerald-100 text-emerald-800',
      icono: 'fa-circle-check text-emerald-700',
    }
  }

  if (tipo === 'VENCIDO') {
    return {
      tarjeta: 'border-orange-300 bg-orange-50',
      insignia: 'border-orange-300 bg-orange-100 text-orange-800',
      icono: 'fa-triangle-exclamation text-orange-700',
    }
  }

  return {
    tarjeta: 'border-blue-300 bg-blue-50',
    insignia: 'border-blue-300 bg-blue-100 text-blue-800',
    icono: 'fa-calendar-check text-blue-700',
  }
}

function formatoKm(valor) {
  const numero = Number(valor)

  if (!Number.isFinite(numero)) {
    return '—'
  }

  return `${Math.round(numero).toLocaleString('es-CO')} km`
}

function formatoFecha(valor) {
  if (!valor) {
    return '—'
  }

  const fecha = String(valor).slice(0, 10)
  const [anio, mes, dia] = fecha.split('-')

  if (!anio || !mes || !dia) {
    return fecha
  }

  return `${dia}/${mes}/${anio}`
}


function obtenerUltimoMantenimiento(vista) {
  const candidatos = [
    vista?.ultimo_mantenimiento,
    vista?.mantenimiento_ultimo,
    vista?.ultimo_mantenimiento_registrado,
  ]

  for (const item of candidatos) {
    if (item && typeof item === 'object') {
      return item
    }
  }

  return null
}

function fechaOrdenPunto(punto, tipo) {
  const valor =
    tipo === 'EJECUTADO'
      ? punto?.fecha_ejecucion
      : tipo === 'VENCIDO'
        ? (
            punto?.fecha_vencimiento ||
            punto?.fecha_debio_realizarse ||
            punto?.fecha_proyectada
          )
        : punto?.fecha_proyectada

  return String(valor || '').slice(0, 10)
}

function obtenerActividades(punto) {
  const posibles = [
    punto?.actividades,
    punto?.actividades_programadas,
    punto?.detalle_actividades,
  ]

  for (const lista of posibles) {
    if (Array.isArray(lista)) {
      return lista
    }
  }

  return []
}

function nombreActividad(actividad) {
  return (
    actividad?.nombre ||
    actividad?.actividad ||
    actividad?.nombre_actividad ||
    actividad?.actividad_nombre ||
    'Actividad de mantenimiento'
  )
}

function frecuenciaActividad(actividad) {
  const valor = Number(
    actividad?.frecuencia_km ??
    actividad?.frecuencia ??
    actividad?.frecuencia_configurada_km
  )

  return Number.isFinite(valor) && valor > 0
    ? valor
    : null
}

function TarjetaMantenimiento({
  punto,
  tipo,
  mes,
  abierta,
  onToggle,
}) {
  const clases = claseEstado(tipo)
  const actividades = obtenerActividades(punto)

  const grupos = useMemo(() => {
    const mapa = new Map()

    actividades.forEach((actividad) => {
      const frecuencia = frecuenciaActividad(actividad)
      const clave = frecuencia || 0

      if (!mapa.has(clave)) {
        mapa.set(clave, [])
      }

      mapa.get(clave).push(actividad)
    })

    return [...mapa.entries()].sort(
      ([a], [b]) => a - b
    )
  }, [actividades])

  const fecha =
    tipo === 'EJECUTADO'
      ? punto?.fecha_ejecucion
      : tipo === 'VENCIDO'
        ? (
            punto?.fecha_vencimiento ||
            punto?.fecha_debio_realizarse ||
            punto?.fecha_proyectada
          )
        : punto?.fecha_proyectada

  const km =
    punto?.km_objetivo ??
    punto?.km_vencimiento ??
    punto?.km_debio_realizarse

  return (
    <article
      className={`overflow-hidden rounded-xl border shadow-sm ${clases.tarjeta}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start gap-3">
          <div className="pt-0.5">
            <i className={`fas ${clases.icono} text-lg`}></i>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-black text-slate-900">
                P{punto?.punto || punto?.ciclo || '—'}
              </span>

              <span
                className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${clases.insignia}`}
              >
                {tipo}
              </span>

              <span className="text-[10px] font-bold uppercase text-slate-500">
                {NOMBRES_MESES[mes] || mes}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-700">
              <div>
                <span className="block text-[9px] font-black uppercase text-slate-500">
                  {tipo === 'EJECUTADO'
                    ? 'Fecha ejecución'
                    : 'Fecha estimada'}
                </span>
                <strong>{formatoFecha(fecha)}</strong>
              </div>

              <div>
                <span className="block text-[9px] font-black uppercase text-slate-500">
                  Kilometraje objetivo
                </span>
                <strong>{formatoKm(km)}</strong>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-300/70 pt-2">
              <span className="text-[10px] font-bold text-slate-600">
                {actividades.length > 0
                  ? `${actividades.length} actividad${
                      actividades.length === 1 ? '' : 'es'
                    }`
                  : 'Ver detalle'}
              </span>

              <span className="flex items-center gap-1 text-[10px] font-black text-slate-700">
                {abierta ? 'Ocultar actividades' : 'Ver actividades'}
                <i
                  className={`fas ${
                    abierta
                      ? 'fa-chevron-up'
                      : 'fa-chevron-down'
                  }`}
                ></i>
              </span>
            </div>
          </div>
        </div>
      </button>

      {abierta && (
        <div className="border-t border-slate-300 bg-white px-4 py-4">
          <div className="mb-3">
            <h3 className="text-xs font-black uppercase text-slate-800">
              Actividades del punto P{punto?.punto || punto?.ciclo || '—'}
            </h3>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">
              Estas son las actividades que conforman este mantenimiento programado.
            </p>
          </div>

          {grupos.length > 0 ? (
            <div className="space-y-3">
              {grupos.map(([frecuencia, lista]) => (
                <div
                  key={frecuencia}
                  className="overflow-hidden rounded-lg border border-slate-300"
                >
                  <div className="flex items-center justify-between bg-slate-100 px-3 py-2">
                    <span className="text-[10px] font-black uppercase text-slate-700">
                      {frecuencia > 0
                        ? `Frecuencia ${frecuencia.toLocaleString('es-CO')} km`
                        : 'Actividades programadas'}
                    </span>

                    <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[9px] font-black text-slate-600">
                      {lista.length}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-200 bg-white">
                    {lista.map((actividad, index) => (
                      <div
                        key={actividad?.id || index}
                        className="flex items-start gap-2 px-3 py-2.5"
                      >
                        <i className="fas fa-wrench mt-0.5 text-[10px] text-slate-500"></i>

                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold leading-4 text-slate-800">
                            {nombreActividad(actividad)}
                          </p>

                          {actividad?.ejecutada === true && (
                            <p className="mt-1 text-[9px] font-black uppercase text-emerald-700">
                              Actividad acreditada
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-[11px] text-slate-600">
              No se recibió el detalle de actividades para este punto.
            </div>
          )}

          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-[10px] leading-4 text-slate-700">
            <strong>Importante:</strong> el mantenimiento se considera completo cuando
            queden acreditadas todas las actividades correspondientes al punto programado.
          </div>
        </div>
      )}
    </article>
  )
}

export default function PlanMantenimientoInstructorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [user, setUser] = useState(null)
  const [nitActual, setNitActual] = useState('')
  const [cargando, setCargando] = useState(false)
  const [data, setData] = useState(null)
  const [placa, setPlaca] = useState('')
  const [tarjetaAbierta, setTarjetaAbierta] = useState('')
  const [vigencia, setVigencia] = useState(
    new Date().getFullYear()
  )

  useEffect(() => {
    const storedUser =
      localStorage.getItem('currentUser')

    if (!storedUser) {
      router.push('/login')
      return
    }

    try {
      const parsed =
        JSON.parse(storedUser)

      setUser(parsed)

      const nit =
        parsed?.nitEmpresa ||
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
        String(nit).trim()
      )
    } catch {
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    if (!nitActual) {
      return
    }

    const cargar = async () => {
      setCargando(true)

      try {
        const res =
          await fetch(
            `/api/admin/mantenimientos/plan-mantenimiento?vigencia=${vigencia}`,
            {
              cache:
                'no-store',

              headers: {
                'x-cea-nit':
                  nitActual,
              },
            }
          )

        const json =
          await res.json()

        if (
          !res.ok ||
          json?.status !==
            'success'
        ) {
          throw new Error(
            json?.message ||
            'No fue posible consultar el plan de mantenimiento.'
          )
        }

        setData(json)

        const lista =
          Array.isArray(
            json?.vehiculos
          )
            ? json.vehiculos
            : []

        const placaUrl =
          String(
            searchParams.get(
              'placa'
            ) ||
            ''
          )
            .trim()
            .toUpperCase()

        setPlaca(
          actual => {
            const candidata =
              placaUrl ||
              actual

            if (
              candidata &&
              lista.some(
                item =>
                  String(
                    item?.vehiculo
                      ?.placa ||
                    item?.placa ||
                    ''
                  )
                    .trim()
                    .toUpperCase() ===
                  candidata
                    .trim()
                    .toUpperCase()
              )
            ) {
              return candidata
            }

            return ''
          }
        )
      } catch (error) {
        console.error(
          error
        )

        toast.error(
          error?.message ||
          'Error consultando el plan.'
        )

        setData(null)
      } finally {
        setCargando(false)
      }
    }

    cargar()
  }, [
    nitActual,
    vigencia,
    searchParams,
  ])

  const vehiculos =
    useMemo(
      () =>
        Array.isArray(
          data?.vehiculos
        )
          ? data.vehiculos
          : [],
      [data]
    )

  const vista =
    useMemo(
      () =>
        vehiculos.find(
          item =>
            String(
              item?.vehiculo
                ?.placa ||
              item?.placa ||
              ''
            )
              .trim()
              .toUpperCase() ===
            placa
              .trim()
              .toUpperCase()
        ) ||
        null,
      [
        vehiculos,
        placa,
      ]
    )

  const tarjetas =
    useMemo(
      () => {
        if (!vista) {
          return []
        }

        const resultado = []

        MESES.forEach(
          (mes, indiceMes) => {
            const datos =
              vista?.meses?.[mes] ||
              {
                programados: [],
                ejecutados: [],
                vencidos: [],
              }

            const agregar =
              (lista, tipo) => {
                ;(
                  Array.isArray(lista)
                    ? lista
                    : []
                ).forEach(
                  (punto, index) => {
                    resultado.push({
                      punto,
                      tipo,
                      mes,
                      indiceMes,
                      index,
                    })
                  }
                )
              }

            agregar(
              datos.ejecutados,
              'EJECUTADO'
            )

            agregar(
              datos.vencidos,
              'VENCIDO'
            )

            agregar(
              datos.programados,
              'PROGRAMADO'
            )
          }
        )

        const ordenados =
          resultado.sort(
            (a, b) => {
              if (
                a.indiceMes !==
                b.indiceMes
              ) {
                return (
                  a.indiceMes -
                  b.indiceMes
                )
              }

              return (
                Number(
                  a.punto?.punto ||
                  a.punto?.ciclo ||
                  0
                ) -
                Number(
                  b.punto?.punto ||
                  b.punto?.ciclo ||
                  0
                )
              )
            }
          )

        const anioActual =
          new Date().getFullYear()

        // Al consultar una vigencia histórica se muestra el historial completo.
        if (
          Number(vigencia) <
          anioActual
        ) {
          return ordenados
        }

        // En la vigencia actual/futura la vista se concentra en el plan por venir:
        // comienza en la primera tarjeta PROGRAMADO.
        const indicePrimerProgramado =
          ordenados.findIndex(
            item =>
              item.tipo ===
              'PROGRAMADO'
          )

        if (
          indicePrimerProgramado <
          0
        ) {
          return ordenados
        }

        const primerProgramado =
          ordenados[
            indicePrimerProgramado
          ]

        const fechaInicio =
          fechaOrdenPunto(
            primerProgramado.punto,
            primerProgramado.tipo
          )

        return ordenados.filter(
          (item, indice) => {
            if (
              indice >=
              indicePrimerProgramado
            ) {
              return true
            }

            // Si un ejecutado/vencido coincide con la misma fecha del
            // primer programado, se conserva para dar contexto.
            return (
              fechaInicio &&
              fechaOrdenPunto(
                item.punto,
                item.tipo
              ) ===
                fechaInicio
            )
          }
        )
      },
      [vista, vigencia]
    )

  if (!user) {
    return (
      <p className="mt-20 text-center">
        Cargando...
      </p>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <Toaster
        position="top-center"
        richColors
      />

      <div className="mx-auto min-h-screen w-full max-w-xl bg-white shadow-xl">
        <div className="sticky top-2 z-30 mx-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() =>
                router.push(
                  '/instructor/practica'
                )
              }
              className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700 px-3 text-[10px] font-black"
            >
              <i className="fas fa-arrow-left text-[10px]"></i>
              Regresar
            </button>

            <div className="min-w-0 flex-1 text-center">
              <h1 className="truncate text-xs font-black uppercase sm:text-sm">
                Plan de Mantenimiento
              </h1>

              <p className="mt-0.5 text-[8px] text-slate-300">
                Consulta por vehículo
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                cerrarSesion(
                  router
                )
              }
              className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--danger)] px-3 text-[10px] font-black"
            >
              <i className="fas fa-sign-out-alt text-[10px]"></i>
              Salir
            </button>
          </div>
        </div>

        <main className="p-3 pb-8">
          <section className="rounded-xl border border-slate-300 bg-slate-50 p-3">
            <div className="grid grid-cols-[minmax(0,1fr)_76px_92px] gap-2">
              <div>
                <label className="mb-1 block text-[8px] font-black uppercase text-slate-600">
                  Seleccione vehículo
                </label>

                <select
                  value={placa}
                  onChange={
                    event => {
                      setPlaca(
                        event.target
                          .value
                      )

                      setTarjetaAbierta(
                        ''
                      )
                    }
                  }
                  disabled={cargando}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-black text-slate-800"
                >
                  <option value="">
                    {cargando
                      ? 'Cargando...'
                      : '-- Placa --'}
                  </option>

                  {vehiculos.map(
                    item => {
                      const p =
                        item?.vehiculo
                          ?.placa ||
                        item?.placa ||
                        ''

                      return (
                        <option
                          key={p}
                          value={p}
                        >
                          {p}
                        </option>
                      )
                    }
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[8px] font-black uppercase text-slate-600">
                  Vigencia
                </label>

                <select
                  value={vigencia}
                  onChange={
                    event => {
                      setVigencia(
                        Number(
                          event.target
                            .value
                        )
                      )

                      setTarjetaAbierta(
                        ''
                      )
                    }
                  }
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold"
                >
                  {(
                    data
                      ?.vigencias_disponibles ||
                    [vigencia]
                  ).map(
                    anio => (
                      <option
                        key={anio}
                        value={anio}
                      >
                        {anio}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[8px] font-black uppercase text-slate-600">
                  Frecuencia base
                </label>

                <div className="flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-[10px] font-black text-slate-800">
                  {vista
                    ? formatoKm(
                        vista?.frecuencia_base_km ??
                        vista?.ciclo?.frecuencia_base_km
                      )
                    : '—'}
                </div>
              </div>
            </div>
          </section>

          {!placa &&
            !cargando && (
              <section className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-5 text-center">
                <i className="fas fa-car text-2xl text-blue-700"></i>

                <p className="mt-2 text-xs font-bold leading-5 text-slate-800">
                  Seleccione la placa del vehículo para consultar sus mantenimientos programados.
                </p>
              </section>
            )}

          {vista && (
            <>
              <section className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-slate-300 bg-white p-2">
                  <div className="text-[7px] font-black uppercase leading-3 text-slate-500">
                    Último km
                    <span className="block normal-case font-bold">
                      Preoperacional
                    </span>
                  </div>

                  <div className="mt-1 text-[11px] font-black text-slate-900">
                    {formatoKm(
                      vista
                        ?.kilometraje
                        ?.ultimo_km
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-300 bg-white p-2">
                  <div className="text-[7px] font-black uppercase leading-3 text-slate-500">
                    Promedio km
                    <span className="block normal-case font-bold">
                      mensual
                    </span>
                  </div>

                  <div className="mt-1 text-[11px] font-black text-slate-900">
                    {formatoKm(
                      vista
                        ?.kilometraje
                        ?.promedio_km_mes
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-300 bg-white p-2">
                  <div className="text-[7px] font-black uppercase leading-3 text-slate-500">
                    Último km
                    <span className="block normal-case font-bold">
                      mantenimiento
                    </span>
                  </div>

                  <div className="mt-1 text-[11px] font-black text-slate-900">
                    {formatoKm(
                      vista
                        ?.ultimo_mantenimiento
                        ?.kilometraje
                    )}
                  </div>

                  {vista
                    ?.ultimo_mantenimiento
                    ?.fecha_registro && (
                    <div className="mt-0.5 text-[7px] font-bold text-slate-400">
                      {formatoFecha(
                        vista
                          .ultimo_mantenimiento
                          .fecha_registro
                      )}
                    </div>
                  )}
                </div>
              </section>

              <section className="mt-4">
                <div className="mb-2 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-xs font-black uppercase text-slate-900">
                      Programación {vigencia}
                    </h2>

                    <p className="mt-0.5 text-[9px] text-slate-500">
                      {Number(vigencia) < new Date().getFullYear()
                        ? 'Historial de la vigencia seleccionada.'
                        : 'Desde el primer mantenimiento programado hacia adelante.'}
                    </p>
                  </div>

                  <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-600">
                    {tarjetas.length}{' '}
                    registro{tarjetas.length === 1 ? '' : 's'}
                  </span>
                </div>

                {tarjetas.length > 0 ? (
                  <div className="space-y-2.5">
                    {tarjetas.map(
                      ({
                        punto,
                        tipo,
                        mes,
                        index,
                      }) => {
                        const clave =
                          `${tipo}-${mes}-${punto?.id || punto?.punto || punto?.ciclo || index}`

                        return (
                          <TarjetaMantenimiento
                            key={clave}
                            punto={punto}
                            tipo={tipo}
                            mes={mes}
                            abierta={
                              tarjetaAbierta ===
                              clave
                            }
                            onToggle={() =>
                              setTarjetaAbierta(
                                actual =>
                                  actual ===
                                  clave
                                    ? ''
                                    : clave
                              )
                            }
                          />
                        )
                      }
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-600">
                    No hay mantenimientos para mostrar en esta vigencia.
                  </div>
                )}
              </section>

              <section className="mt-4 rounded-xl border border-slate-300 bg-slate-50 p-3 text-[10px] leading-4 text-slate-700">
                Esta vista es informativa. Las actividades pueden ejecutarse en diferentes intervenciones o talleres, pero el punto programado solamente debe considerarse completo cuando todas sus actividades queden registradas y acreditadas.
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
