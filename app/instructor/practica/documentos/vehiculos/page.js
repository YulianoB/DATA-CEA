// app/instructor/practica/documentos/vehiculos/page.js

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Toaster, toast } from 'sonner'
import { cerrarSesion } from '@/lib/auth/logout'
import { CarFront, ShieldCheck, Wrench, IdCard, FileBadge } from 'lucide-react'
import { EncabezadoPractica } from '@/components/instructor/practica/EstilosModuloPractica'

// ============================================================
// CONSTANTES
// ============================================================

const DOCUMENTO_SOAT =
  'SOAT'

const DOCUMENTO_RTM =
  'RTM'

// ============================================================
// HELPERS
// ============================================================

function formatearFecha(fecha) {
  if (!fecha) {
    return '-'
  }

  try {
    return new Intl.DateTimeFormat(
      'es-CO',
      {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone:
          'America/Bogota',
      }
    ).format(
      new Date(
        `${fecha}T12:00:00`
      )
    )
  } catch {
    return fecha
  }
}

function esVencido(
  documento
) {
  return (
    documento?.estado_vigencia ===
    'VENCIDO'
  )
}

function esVigente(
  documento
) {
  return (
    documento?.estado_vigencia ===
    'VIGENTE'
  )
}

function claseTarjetaEstado(
  documento
) {
  if (!documento) {
    return (
      'border-gray-300 ' +
      'bg-gray-50'
    )
  }

  if (
    esVencido(
      documento
    )
  ) {
    return (
      'border-red-300 ' +
      'bg-red-50'
    )
  }

  if (
    esVigente(
      documento
    )
  ) {
    return (
      'border-green-300 ' +
      'bg-green-50'
    )
  }

  return (
    'border-gray-300 ' +
    'bg-gray-50'
  )
}

function EstadoDocumento({
  documento,
  femenino = false,
}) {
  if (!documento) {
    return null
  }

  if (
    documento.estado_vigencia ===
    'VENCIDO'
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">

        <i className="fas fa-exclamation-circle"></i>

        {femenino
          ? 'VENCIDA'
          : 'VENCIDO'}

      </span>
    )
  }

  if (
    documento.estado_vigencia ===
    'VIGENTE'
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-300 bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">

        <i className="fas fa-check-circle"></i>

        VIGENTE

      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">

      SIN VIGENCIA

    </span>
  )
}

function crearModalDocumento(
  tipoDocumento,
  documentoActual = null
) {
  return {
    tipoDocumento,

    documentoActual,

    numero_documento:
      documentoActual
        ?.numero_documento ||
      '',

    fecha_expedicion:
      documentoActual
        ?.fecha_expedicion ||
      '',

    fecha_vigencia:
      documentoActual
        ?.fecha_vigencia ||
      '',
  }
}

function documentosIniciales() {
  return {
    soat: null,

    rtm: null,

    tarjeta_servicio:
      null,

    licencia_transito: {
      numero: null,
      fecha_matricula: null,
      organismo_transito: null,
    },
  }
}

// ============================================================
// PÁGINA
// ============================================================

export default function DocumentosVehiculosPage() {
  const router =
    useRouter()

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
  // VEHÍCULOS
  // ==========================================================

  const [
    vehiculos,
    setVehiculos,
  ] =
    useState([])

  const [
    cargandoVehiculos,
    setCargandoVehiculos,
  ] =
    useState(false)

  const [
    vehiculoId,
    setVehiculoId,
  ] =
    useState('')

  const [
    vehiculoSeleccionado,
    setVehiculoSeleccionado,
  ] =
    useState(null)

  // ==========================================================
  // DOCUMENTOS
  // ==========================================================

  const [
    documentos,
    setDocumentos,
  ] =
    useState(
      documentosIniciales()
    )

  const [
    cargandoDocumentos,
    setCargandoDocumentos,
  ] =
    useState(false)

  // ==========================================================
  // MODAL SOAT / RTM
  // ==========================================================

  const [
    modalDocumento,
    setModalDocumento,
  ] =
    useState(null)

  const [
    guardando,
    setGuardando,
  ] =
    useState(false)

  // ==========================================================
  // SESIÓN
  // ==========================================================

  useEffect(() => {
    const stored =
      localStorage.getItem(
        'currentUser'
      )

    if (!stored) {
      router.push(
        '/login'
      )

      return
    }

    try {
      const parsed =
        JSON.parse(
          stored
        )

      setUser(
        parsed
      )

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
        String(
          nit
        ).trim()
      )
    } catch (error) {
      console.error(
        'Error leyendo sesión:',
        error
      )

      localStorage.removeItem(
        'currentUser'
      )

      router.push(
        '/login'
      )
    }
  }, [router])

  // ==========================================================
  // CARGAR VEHÍCULOS ACTIVOS
  // ==========================================================

  useEffect(() => {
    if (
      !nitActual
    ) {
      return
    }

    const cargarVehiculos =
      async () => {
        setCargandoVehiculos(
          true
        )

        try {
          const res =
            await fetch(
              `/api/documentos/vehiculos?nit=${encodeURIComponent(
                nitActual
              )}&recurso=vehiculos`,
              {
                cache:
                  'no-store',
              }
            )

          const json =
            await res.json()

          if (
            !res.ok ||
            json?.status !==
              'success'
          ) {
            toast.error(
              json?.message ||
                'No fue posible cargar los vehículos.'
            )

            setVehiculos(
              []
            )

            return
          }

          setVehiculos(
            Array.isArray(
              json.vehiculos
            )
              ? json.vehiculos
              : []
          )
        } catch (error) {
          console.error(
            'Error cargando vehículos:',
            error
          )

          toast.error(
            'No fue posible cargar los vehículos.'
          )

          setVehiculos(
            []
          )
        } finally {
          setCargandoVehiculos(
            false
          )
        }
      }

    cargarVehiculos()
  }, [nitActual])

  // ==========================================================
  // CARGAR DOCUMENTOS VEHÍCULO
  // ==========================================================

  const cargarDocumentos =
    async (
      vehiculo
    ) => {
      if (
        !vehiculo ||
        !nitActual
      ) {
        return
      }

      setCargandoDocumentos(
        true
      )

      try {
        const res =
          await fetch(
            `/api/documentos/vehiculos?nit=${encodeURIComponent(
              nitActual
            )}&recurso=documentos&vehiculo_id=${encodeURIComponent(
              vehiculo.id
            )}`,
            {
              cache:
                'no-store',
            }
          )

        const json =
          await res.json()

        if (
          !res.ok ||
          json?.status !==
            'success'
        ) {
          toast.error(
            json?.message ||
              'No fue posible cargar los documentos del vehículo.'
          )

          return
        }

        setVehiculoSeleccionado(
          json?.vehiculo ||
          vehiculo
        )

        setDocumentos({
          soat:
            json
              ?.documentos
              ?.soat ||
            null,

          rtm:
            json
              ?.documentos
              ?.rtm ||
            null,

          tarjeta_servicio:
            json
              ?.documentos
              ?.tarjeta_servicio ||
            null,

          licencia_transito: {
            numero:
              json
                ?.documentos
                ?.licencia_transito
                ?.numero ||
              null,

            fecha_matricula:
              json
                ?.documentos
                ?.licencia_transito
                ?.fecha_matricula ||
              null,

            organismo_transito:
              json
                ?.documentos
                ?.licencia_transito
                ?.organismo_transito ||
              null,
          },
        })
      } catch (error) {
        console.error(
          'Error cargando documentos:',
          error
        )

        toast.error(
          'No fue posible cargar los documentos del vehículo.'
        )
      } finally {
        setCargandoDocumentos(
          false
        )
      }
    }

  // ==========================================================
  // SELECCIONAR VEHÍCULO
  // ==========================================================

  const seleccionarVehiculo =
    async (
      nuevoId
    ) => {
      setVehiculoId(
        nuevoId
      )

      setVehiculoSeleccionado(
        null
      )

      setDocumentos(
        documentosIniciales()
      )

      setModalDocumento(
        null
      )

      if (
        !nuevoId ||
        !nitActual
      ) {
        return
      }

      const vehiculo =
        vehiculos.find(
          (item) =>
            String(
              item.id
            ) ===
            String(
              nuevoId
            )
        )

      if (
        !vehiculo
      ) {
        toast.error(
          'Vehículo inválido.'
        )

        return
      }

      setVehiculoSeleccionado(
        vehiculo
      )

      await cargarDocumentos(
        vehiculo
      )
    }

  // ==========================================================
  // ABRIR MODAL
  // ==========================================================

  const abrirModalDocumento =
    (
      tipoDocumento,
      documentoActual
    ) => {
      setModalDocumento(
        crearModalDocumento(
          tipoDocumento,
          documentoActual
        )
      )
    }

  // ==========================================================
  // GUARDAR SOAT / RTM
  // ==========================================================

  const guardarDocumento =
    async () => {
      if (
        !modalDocumento ||
        !vehiculoSeleccionado ||
        !nitActual ||
        guardando
      ) {
        return
      }

      const numeroDocumento =
        String(
          modalDocumento
            .numero_documento ||
            ''
        )
          .trim()
          .toUpperCase()

      const fechaExpedicion =
        String(
          modalDocumento
            .fecha_expedicion ||
            ''
        ).trim()

      const fechaVigencia =
        String(
          modalDocumento
            .fecha_vigencia ||
            ''
        ).trim()

      if (
        !numeroDocumento
      ) {
        toast.error(
          `Ingrese el número del ${modalDocumento.tipoDocumento}.`
        )

        return
      }

      if (
        !fechaExpedicion
      ) {
        toast.error(
          'Seleccione la fecha de expedición.'
        )

        return
      }

      if (
        !fechaVigencia
      ) {
        toast.error(
          'Seleccione la fecha de vigencia.'
        )

        return
      }

      if (
        fechaVigencia <
        fechaExpedicion
      ) {
        toast.error(
          'La fecha de vigencia no puede ser anterior a la fecha de expedición.'
        )

        return
      }

      setGuardando(
        true
      )

      try {
        const payload = {
          nit:
            nitActual,

          accion:
            'guardar_documento',

          vehiculo_id:
            vehiculoSeleccionado
              .id,

          placa:
            vehiculoSeleccionado
              .placa,

          documento:
            modalDocumento
              .tipoDocumento,

          numero_documento:
            numeroDocumento,

          fecha_expedicion:
            fechaExpedicion,

          fecha_vigencia:
            fechaVigencia,

          nombre_quien_actualiza:
            user?.nombreCompleto ||
            user?.nombre_completo ||
            user?.usuario ||
            '',
        }

        const res =
          await fetch(
            '/api/documentos/vehiculos',
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

        let json =
          null

        try {
          json =
            await res.json()
        } catch {
          toast.error(
            'La respuesta del servidor no es válida.'
          )

          return
        }

        if (
          res.status ===
            409 ||
          json?.status ===
            'warning'
        ) {
          toast.warning(
            json?.message ||
              'No fue posible registrar el documento.'
          )

          return
        }

        if (
          !res.ok ||
          json?.status !==
            'success'
        ) {
          toast.error(
            json?.message ||
              'No fue posible guardar el documento.'
          )

          return
        }

        toast.success(
          json?.message ||
            'Documento registrado correctamente.'
        )

        setModalDocumento(
          null
        )

        await cargarDocumentos(
          vehiculoSeleccionado
        )
      } catch (error) {
        console.error(
          'Error guardando documento:',
          error
        )

        toast.error(
          'No fue posible comunicarse con el servidor.'
        )
      } finally {
        setGuardando(
          false
        )
      }
    }

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout =
    () =>
      cerrarSesion(
        router
      )

  // ==========================================================
  // RENDER
  // ==========================================================

  if (
    !user
  ) {
    return (
      <p className="text-center mt-20">
        Cargando...
      </p>
    )
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-[#F5F7FA] p-2 sm:p-4">

      <Toaster
        position="top-center"
        richColors
      />

      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#DCE4EB] bg-white shadow-lg">

        <EncabezadoPractica
          titulo="Documentos de Vehículos"
          usuario={user.nombreCompleto || user.nombre_completo || user.usuario}
          cea={user.nombreEmpresa || user.nombre_empresa}
          onRegresar={() => router.push('/instructor/practica/documentos')}
          onCerrarSesion={handleLogout}
        />
        <main className="px-3 py-4 sm:px-5 sm:py-5">
        {/* ==================================================
            SELECT VEHÍCULO
        ================================================== */}

        <div className="mb-4 rounded-xl border border-[#DCE4EB] bg-slate-50 p-3">

          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#194567]"><CarFront size={18} /> Seleccionar vehículo</div>

          <div className="p-0">

            <select
              className="min-h-11 w-full rounded-lg border border-[#A9BDCC] bg-white p-2 text-sm"
              value={
                vehiculoId
              }
              disabled={
                cargandoVehiculos
              }
              onChange={(e) =>
                seleccionarVehiculo(
                  e.target.value
                )
              }
            >

              <option value="">

                {cargandoVehiculos
                  ? 'Cargando vehículos...'
                  : '-- Seleccione una placa --'}

              </option>

              {vehiculos.map(
                (vehiculo) => (

                  <option
                    key={
                      vehiculo.id
                    }
                    value={
                      vehiculo.id
                    }
                  >
                    {
                      vehiculo.placa
                    }
                  </option>

                )
              )}

            </select>

          </div>

        </div>

        {/* ==================================================
            INFORMACIÓN VEHÍCULO
        ================================================== */}

        {vehiculoSeleccionado && (

          <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg border border-[#DCE4EB] bg-slate-50 p-3 text-xs sm:grid-cols-4">

            <div>

              <p className="text-xs text-gray-500">
                Placa
              </p>

              <p className="font-semibold">
                {
                  vehiculoSeleccionado
                    .placa ||
                  '-'
                }
              </p>

            </div>

            <div>

              <p className="text-xs text-gray-500">
                Tipo
              </p>

              <p className="font-semibold">
                {
                  vehiculoSeleccionado
                    .tipo_vehiculo ||
                  '-'
                }
              </p>

            </div>

            <div>

              <p className="text-xs text-gray-500">
                Marca
              </p>

              <p className="font-semibold">
                {
                  vehiculoSeleccionado
                    .marca ||
                  '-'
                }
              </p>

            </div>

            <div>

              <p className="text-xs text-gray-500">
                Estado
              </p>

              <p className="font-semibold">
                {
                  vehiculoSeleccionado
                    .estado ||
                  '-'
                }
              </p>

            </div>

          </div>

        )}

        {/* ==================================================
            CARGANDO
        ================================================== */}

        {cargandoDocumentos && (

          <div className="text-center py-8 text-gray-500 text-sm">

            <i className="fas fa-spinner fa-spin mr-2"></i>

            Consultando documentos...

          </div>

        )}

        {/* ==================================================
            TARJETAS
        ================================================== */}

        {vehiculoSeleccionado &&
          !cargandoDocumentos && (

          <div className="grid grid-cols-2 items-stretch gap-2">

            {/* ==============================================
                SOAT
            ============================================== */}

            <div
              className={`flex h-full min-w-0 flex-col rounded-xl border p-2.5 shadow-sm sm:p-3 ${claseTarjetaEstado(
                documentos.soat
              )}`}
            >

              <div className="flex flex-wrap items-start justify-between gap-2">

                <div>

                  <div className="flex items-center gap-1.5">

                    <ShieldCheck size={18} className="shrink-0 text-[#194567]" />

                    <h3 className="text-xs font-bold text-[#173A57]">
                      SOAT
                    </h3>

                  </div>

                  <p className="mt-1 text-[10px] leading-snug text-slate-500">
                    Seguro Obligatorio de Accidentes de Tránsito
                  </p>

                </div>

                {documentos.soat && (

                  <EstadoDocumento
                    documento={
                      documentos.soat
                    }
                  />

                )}

              </div>

              {documentos.soat ? (

                <div className="flex flex-1 flex-col space-y-1.5 break-words text-xs">

                  <p>
                    <strong>
                      Número póliza:
                    </strong>{' '}

                    {documentos
                      .soat
                      .numero_documento ||
                      '-'}
                  </p>

                  <p>
                    <strong>
                      Fecha expedición:
                    </strong>{' '}

                    {formatearFecha(
                      documentos
                        .soat
                        .fecha_expedicion
                    )}
                  </p>

                  <p>
                    <strong>
                      Vigencia:
                    </strong>{' '}

                    {formatearFecha(
                      documentos
                        .soat
                        .fecha_vigencia
                    )}
                  </p>

                  <p>
                    <strong>
                      Última actualización:
                    </strong>{' '}

                    {formatearFecha(
                      documentos
                        .soat
                        .fecha_actualizacion
                    )}
                  </p>

                  <p>
                    <strong>
                      Actualizado por:
                    </strong>{' '}

                    {documentos
                      .soat
                      .nombre_quien_actualiza ||
                      '-'}
                  </p>

                  {esVencido(
                    documentos.soat
                  ) && (

                    <div className="border border-red-300 bg-red-100 text-red-700 rounded-lg p-3 text-xs">

                      <i className="fas fa-exclamation-triangle mr-1"></i>

                      El SOAT se encuentra vencido. Debe registrarse la renovación correspondiente.

                    </div>

                  )}

                  <button
                    onClick={() =>
                      abrirModalDocumento(
                        DOCUMENTO_SOAT,
                        documentos.soat
                      )
                    }
                    className={`mt-auto flex min-h-12 w-full items-center justify-center rounded-lg px-2 py-2 text-center text-xs font-semibold text-white ${
                      esVencido(
                        documentos.soat
                      )
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-[#367DA8] hover:bg-[#194567]'
                    }`}
                  >

                    <i className="fas fa-sync-alt mr-2"></i>

                    Actualizar

                  </button>

                </div>

              ) : (

                <div className="flex flex-1 flex-col">

                  <p className="mb-3 text-xs text-slate-500">
                    No existe un SOAT registrado para este vehículo.
                  </p>

                  <button
                    onClick={() =>
                      abrirModalDocumento(
                        DOCUMENTO_SOAT,
                        null
                      )
                    }
                    className="mt-auto flex min-h-12 w-full items-center justify-center rounded-lg bg-[#367DA8] px-2 py-2 text-center text-xs font-semibold text-white hover:bg-[#194567]"
                  >

                    <i className="fas fa-plus mr-2"></i>

                    Actualizar

                  </button>

                </div>

              )}

            </div>

            {/* ==============================================
                RTM
            ============================================== */}

            <div
              className={`flex h-full min-w-0 flex-col rounded-xl border p-2.5 shadow-sm sm:p-3 ${claseTarjetaEstado(
                documentos.rtm
              )}`}
            >

              <div className="flex flex-wrap items-start justify-between gap-2">

                <div>

                  <div className="flex items-center gap-1.5">

                    <Wrench size={18} className="shrink-0 text-[#194567]" />

                    <h3 className="text-xs font-bold text-[#173A57]">
                      Revisión Técnico-Mecánica
                    </h3>

                  </div>

                  <p className="mt-1 text-[10px] leading-snug text-slate-500">
                    RTM
                  </p>

                </div>

                {documentos.rtm && (

                  <EstadoDocumento
                    documento={
                      documentos.rtm
                    }
                  />

                )}

              </div>

              {documentos.rtm ? (

                <div className="flex flex-1 flex-col space-y-1.5 break-words text-xs">

                  <p>
                    <strong>
                      Número RTM:
                    </strong>{' '}

                    {documentos
                      .rtm
                      .numero_documento ||
                      '-'}
                  </p>

                  <p>
                    <strong>
                      Fecha expedición:
                    </strong>{' '}

                    {formatearFecha(
                      documentos
                        .rtm
                        .fecha_expedicion
                    )}
                  </p>

                  <p>
                    <strong>
                      Vigencia:
                    </strong>{' '}

                    {formatearFecha(
                      documentos
                        .rtm
                        .fecha_vigencia
                    )}
                  </p>

                  <p>
                    <strong>
                      Última actualización:
                    </strong>{' '}

                    {formatearFecha(
                      documentos
                        .rtm
                        .fecha_actualizacion
                    )}
                  </p>

                  <p>
                    <strong>
                      Actualizado por:
                    </strong>{' '}

                    {documentos
                      .rtm
                      .nombre_quien_actualiza ||
                      '-'}
                  </p>

                  {esVencido(
                    documentos.rtm
                  ) && (

                    <div className="border border-red-300 bg-red-100 text-red-700 rounded-lg p-3 text-xs">

                      <i className="fas fa-exclamation-triangle mr-1"></i>

                      La Revisión Técnico-Mecánica se encuentra vencida. Debe registrarse la renovación correspondiente.

                    </div>

                  )}

                  <button
                    onClick={() =>
                      abrirModalDocumento(
                        DOCUMENTO_RTM,
                        documentos.rtm
                      )
                    }
                    className={`mt-auto flex min-h-12 w-full items-center justify-center rounded-lg px-2 py-2 text-center text-xs font-semibold text-white ${
                      esVencido(
                        documentos.rtm
                      )
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-[#367DA8] hover:bg-[#194567]'
                    }`}
                  >

                    <i className="fas fa-sync-alt mr-2"></i>

                    Actualizar

                  </button>

                </div>

              ) : (

                <div className="flex flex-1 flex-col">

                  <p className="mb-3 text-xs text-slate-500">
                    No existe una RTM registrada para este vehículo.
                  </p>

                  <button
                    onClick={() =>
                      abrirModalDocumento(
                        DOCUMENTO_RTM,
                        null
                      )
                    }
                    className="mt-auto flex min-h-12 w-full items-center justify-center rounded-lg bg-[#367DA8] px-2 py-2 text-center text-xs font-semibold text-white hover:bg-[#194567]"
                  >

                    <i className="fas fa-plus mr-2"></i>

                    Actualizar

                  </button>

                </div>

              )}

            </div>

            {/* ==============================================
                TARJETA DE SERVICIO
            ============================================== */}

            <div
              className={`flex h-full min-w-0 flex-col rounded-xl border p-2.5 shadow-sm sm:p-3 ${claseTarjetaEstado(
                documentos
                  .tarjeta_servicio
              )}`}
            >

              <div className="flex flex-wrap items-start justify-between gap-2">

                <div>

                  <div className="flex items-center gap-1.5">

                    <FileBadge size={18} className="shrink-0 text-[#194567]" />

                    <h3 className="text-xs font-bold text-[#173A57]">
                      Tarjeta de Servicio
                    </h3>

                  </div>

                  <p className="mt-1 text-[10px] leading-snug text-slate-500">
                    Documento de vinculación del vehículo al CEA
                  </p>

                </div>

                {documentos
                  .tarjeta_servicio ? (

                  <EstadoDocumento
                    documento={
                      documentos
                        .tarjeta_servicio
                    }
                    femenino
                  />

                ) : (

                  <span className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">

                    SIN REGISTRO

                  </span>

                )}

              </div>

              {documentos
                .tarjeta_servicio ? (

                <div className="flex flex-1 flex-col space-y-1.5 break-words text-xs">

                  <p>
                    <strong>
                      Número:
                    </strong>{' '}

                    {documentos
                      .tarjeta_servicio
                      .numero_documento ||
                      '-'}
                  </p>

                  <p>
                    <strong>
                      Fecha expedición:
                    </strong>{' '}

                    {formatearFecha(
                      documentos
                        .tarjeta_servicio
                        .fecha_expedicion
                    )}
                  </p>

                  <p>
                    <strong>
                      Vigencia:
                    </strong>{' '}

                    {formatearFecha(
                      documentos
                        .tarjeta_servicio
                        .fecha_vigencia
                    )}
                  </p>

                  <p>
                    <strong>
                      Última actualización:
                    </strong>{' '}

                    {formatearFecha(
                      documentos
                        .tarjeta_servicio
                        .fecha_actualizacion
                    )}
                  </p>

                  <p>
                    <strong>
                      Actualizado por:
                    </strong>{' '}

                    {documentos
                      .tarjeta_servicio
                      .nombre_quien_actualiza ||
                      '-'}
                  </p>

                  {esVencido(
                    documentos
                      .tarjeta_servicio
                  ) && (

                    <div className="border border-red-300 bg-red-100 text-red-700 rounded-lg p-3 text-xs">

                      <i className="fas fa-exclamation-triangle mr-1"></i>

                      La Tarjeta de Servicio se encuentra vencida. El vehículo debe ser revisado administrativamente antes de continuar su operación en el CEA.

                    </div>

                  )}

                  <div className="border border-gray-200 bg-white rounded-lg p-3 text-xs text-gray-600">

                    <i className="fas fa-lock mr-1"></i>

                    La Tarjeta de Servicio solo puede ser registrada o actualizada desde el módulo administrativo.

                  </div>

                </div>

              ) : (

                <div className="flex flex-1 flex-col">

                  <p className="mb-3 text-xs text-slate-500">
                    No existe una Tarjeta de Servicio registrada para este vehículo.
                  </p>

                  <div className="border border-gray-200 bg-white rounded-lg p-3 text-xs text-gray-600">

                    <i className="fas fa-lock mr-1"></i>

                    Este documento debe registrarse desde el módulo administrativo.

                  </div>

                </div>

              )}

            </div>

            {/* ==============================================
                LICENCIA DE TRÁNSITO
            ============================================== */}

            <div className="flex h-full min-w-0 flex-col rounded-xl border border-slate-300 bg-slate-50 p-2.5 shadow-sm sm:p-3">

              <div className="flex flex-wrap items-start justify-between gap-2">

                <div>

                  <div className="flex items-center gap-1.5">

                    <IdCard size={18} className="shrink-0 text-[#194567]" />

                    <h3 className="text-xs font-bold text-[#173A57]">
                      Licencia de Tránsito
                    </h3>

                  </div>

                  <p className="mt-1 text-[10px] leading-snug text-slate-500">
                    Información de matrícula del vehículo
                  </p>

                </div>

                <span className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">

                  <i className="fas fa-lock"></i>

                  SOLO CONSULTA

                </span>

              </div>

              <div className="flex flex-1 flex-col space-y-1.5 break-words text-xs">

                <p>
                  <strong>
                    N.º Licencia de Tránsito:
                  </strong>{' '}

                  {documentos
                    .licencia_transito
                    .numero ||
                    '-'}
                </p>

                <p>
                  <strong>
                    Fecha de matrícula:
                  </strong>{' '}

                  {formatearFecha(
                    documentos
                      .licencia_transito
                      .fecha_matricula
                  )}
                </p>

                <p>
                  <strong>
                    Organismo de tránsito:
                  </strong>{' '}

                  {documentos
                    .licencia_transito
                    .organismo_transito ||
                    '-'}
                </p>

              </div>

            </div>

          </div>

        )}

        </main>

      </div>

      {/* ======================================================
          MODAL SOAT / RTM
      ====================================================== */}

      {modalDocumento && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102C43]/65 p-2 sm:p-4">

          <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[#DCE4EB] bg-white shadow-2xl">

            <div className="shrink-0 bg-[#173A57] px-4 py-3 text-white sm:px-5"><h3 className="text-base font-semibold leading-snug">

              Actualizar{' '}

              {
                modalDocumento
                  .tipoDocumento
              }

            </h3>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">

            {vehiculoSeleccionado && (

              <p className="mb-3 break-words text-xs text-slate-500">

                Placa{' '}

                <strong>
                  {
                    vehiculoSeleccionado
                      .placa
                  }
                </strong>

                {' '}•{' '}

                {
                  vehiculoSeleccionado
                    .tipo_vehiculo ||
                  '-'
                }

                {' '}•{' '}

                {
                  vehiculoSeleccionado
                    .marca ||
                  '-'
                }

              </p>

            )}

            {modalDocumento
              .documentoActual && (

              <div className="mb-4 rounded-lg border border-[#A9BDCC] bg-[#EFF7FC] p-3 text-xs leading-relaxed text-[#173A57]">

                <div className="flex gap-2 items-start">

                  <i className="fas fa-history mt-0.5"></i>

                  <p>

                    Esta renovación generará un

                    <strong>
                      {' '}nuevo registro histórico
                    </strong>.

                    {' '}El registro anterior se conservará para la Hoja de Vida del vehículo.

                  </p>

                </div>

              </div>

            )}

            <div className="space-y-3">

              {/* ============================================
                  NÚMERO DOCUMENTO
              ============================================ */}

              <div>

                <label className="mb-1 block text-xs font-semibold text-[#173A57]">

                  {modalDocumento
                    .tipoDocumento ===
                  DOCUMENTO_SOAT
                    ? 'Número de Póliza SOAT'
                    : 'Número RTM'}

                </label>

                <input
                  type="text"
                  className="min-h-11 w-full rounded-lg border border-[#A9BDCC] bg-white px-3 py-2 text-sm uppercase outline-none focus:border-[#367DA8] focus:ring-2 focus:ring-[#367DA8]/20"
                  value={
                    modalDocumento
                      .numero_documento
                  }
                  onChange={(e) =>
                    setModalDocumento(
                      (prev) => ({
                        ...prev,

                        numero_documento:
                          e.target
                            .value
                            .toUpperCase(),
                      })
                    )
                  }
                  placeholder={
                    modalDocumento
                      .tipoDocumento ===
                    DOCUMENTO_SOAT
                      ? 'Ingrese número de póliza'
                      : 'Ingrese número RTM'
                  }
                />

              </div>

              {/* ============================================
                  FECHA EXPEDICIÓN
              ============================================ */}

              <div>

                <label className="mb-1 block text-xs font-semibold text-[#173A57]">
                  Fecha de Expedición
                </label>

                <input
                  type="date"
                  className="min-h-11 w-full rounded-lg border border-[#A9BDCC] bg-white px-3 py-2 text-sm outline-none focus:border-[#367DA8] focus:ring-2 focus:ring-[#367DA8]/20"
                  value={
                    modalDocumento
                      .fecha_expedicion
                  }
                  onChange={(e) =>
                    setModalDocumento(
                      (prev) => ({
                        ...prev,

                        fecha_expedicion:
                          e.target
                            .value,
                      })
                    )
                  }
                />

              </div>

              {/* ============================================
                  FECHA VIGENCIA
              ============================================ */}

              <div>

                <label className="mb-1 block text-xs font-semibold text-[#173A57]">
                  Fecha de Vigencia
                </label>

                <input
                  type="date"
                  className="min-h-11 w-full rounded-lg border border-[#A9BDCC] bg-white px-3 py-2 text-sm outline-none focus:border-[#367DA8] focus:ring-2 focus:ring-[#367DA8]/20"
                  value={
                    modalDocumento
                      .fecha_vigencia
                  }
                  onChange={(e) =>
                    setModalDocumento(
                      (prev) => ({
                        ...prev,

                        fecha_vigencia:
                          e.target
                            .value,
                      })
                    )
                  }
                />

              </div>

              {/* ============================================
                  ACTUALIZADO POR
              ============================================ */}

              <div>

                <label className="mb-1 block text-xs font-semibold text-[#173A57]">
                  Actualizado por
                </label>

                <input
                  type="text"
                  readOnly
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700"
                  value={
                    user?.nombreCompleto ||
                    user?.nombre_completo ||
                    ''
                  }
                />

              </div>

            </div>

            {/* ==============================================
                BOTONES
            ============================================== */}

            <div className="sticky bottom-0 z-10 -mx-4 mt-5 flex gap-2 border-t border-[#DCE4EB] bg-white px-4 pb-1 pt-3 sm:-mx-5 sm:px-5">

              <button
                onClick={() =>
                  setModalDocumento(
                    null
                  )
                }
                disabled={
                  guardando
                }
                className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-slate-600 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
              >

                Cancelar

              </button>

              <button
                onClick={
                  guardarDocumento
                }
                disabled={
                  guardando
                }
                className={`flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-white ${
                  guardando
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#367DA8] hover:bg-[#194567]'
                }`}
              >

                {guardando ? 'Guardando...' : 'Guardar'}

              </button>

            </div>

            </div>
          </div>

        </div>

      )}

    </div>
  )
}