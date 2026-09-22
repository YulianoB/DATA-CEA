// app/instructor/practica/documentos/instructores/page.js


'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Toaster, toast } from 'sonner'
import { cerrarSesion } from '@/lib/auth/logout'

// ============================================================
// CONSTANTES
// ============================================================

const CATEGORIA_A2 = 'A2'

const CATEGORIAS_BC = [
  'B1',
  'B1-C1',
  'B2-C2',
  'B3-C3',
]

const TIPO_CONDUCCION =
  'CONDUCCION'

const TIPO_INSTRUCTOR =
  'INSTRUCTOR'

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

function crearModalVacio({
  tipo,
  grupo,
}) {
  return {
    tipo,
    grupo,

    licenciaId:
      null,

    categoria:
      grupo === 'a2'
        ? CATEGORIA_A2
        : '',

    vigencia:
      '',

    numero_certificado:
      '',
  }
}

function esVencida(
  licencia
) {
  return (
    licencia
      ?.estado_vigencia ===
    'VENCIDA'
  )
}

function esVigente(
  licencia
) {
  return (
    licencia
      ?.estado_vigencia ===
    'VIGENTE'
  )
}

function claseTarjetaEstado(
  licencia
) {
  if (!licencia) {
    return (
      'border-gray-300 ' +
      'bg-gray-50'
    )
  }

  if (
    esVencida(
      licencia
    )
  ) {
    return (
      'border-red-300 ' +
      'bg-red-50'
    )
  }

  if (
    esVigente(
      licencia
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
  licencia,
}) {
  if (!licencia) {
    return null
  }

  if (
    esVencida(
      licencia
    )
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
        <i className="fas fa-exclamation-circle"></i>

        VENCIDA
      </span>
    )
  }

  if (
    esVigente(
      licencia
    )
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

// ============================================================
// PÁGINA
// ============================================================

export default function DocumentosInstructorPage() {
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
  // Instructor actual
  // ==========================================================

  const [
    instructorSeleccionado,
    setInstructorSeleccionado,
  ] =
    useState(null)

  // ==========================================================
  // Licencias
  // ==========================================================

  const [
    licencias,
    setLicencias,
  ] =
    useState({
      conduccion: {
        a2: null,
        bc: null,
      },

      instructor: {
        a2: null,
        bc: null,
      },
    })

  const [
    cargandoLicencias,
    setCargandoLicencias,
  ] =
    useState(false)

  // ==========================================================
  // Modales
  // ==========================================================

  const [
    modalSinLicencias,
    setModalSinLicencias,
  ] =
    useState(false)

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
  // Sesión
  // ==========================================================

  useEffect(() => {
    const stored =
      localStorage.getItem(
        'currentUser'
      )

    if (!stored) {
      router.push('/login')
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
  // Consultar licencias
  // ==========================================================

  const cargarLicencias =
    async (
      instructor,
      mostrarModalVacio = true
    ) => {
      if (
        !instructor ||
        !nitActual
      ) {
        return
      }

      setCargandoLicencias(
        true
      )

      try {
        const res =
          await fetch(
            `/api/documentos/instructores?nit=${encodeURIComponent(
              nitActual
            )}&recurso=licencias&personal_id=${encodeURIComponent(
              instructor.personal_id
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
              'No fue posible cargar los documentos del instructor.'
          )

          return
        }

        const nuevasLicencias = {
          conduccion: {
            a2:
              json
                ?.licencias
                ?.conduccion
                ?.a2 ||
              null,

            bc:
              json
                ?.licencias
                ?.conduccion
                ?.bc ||
              null,
          },

          instructor: {
            a2:
              json
                ?.licencias
                ?.instructor
                ?.a2 ||
              null,

            bc:
              json
                ?.licencias
                ?.instructor
                ?.bc ||
              null,
          },
        }

        setLicencias(
          nuevasLicencias
        )

        if (
          mostrarModalVacio &&
          !json
            ?.tiene_licencias
        ) {
          setModalSinLicencias(
            true
          )
        } else {
          setModalSinLicencias(
            false
          )
        }
      } catch (error) {
        console.error(
          'Error cargando documentos:',
          error
        )

        toast.error(
          'No fue posible cargar los documentos del instructor.'
        )
      } finally {
        setCargandoLicencias(
          false
        )
      }
    }

  // ==========================================================
  // Cargar automáticamente el instructor logueado
  // ==========================================================

  useEffect(() => {
    if (
      !nitActual ||
      !user
    ) {
      return
    }

    const cargarInstructorActual =
      async () => {
        const documento =
          String(
            user?.documento ||
            ''
          ).trim()

        if (
          !documento
        ) {
          toast.error(
            'No fue posible identificar el documento del usuario.'
          )

          setInstructorSeleccionado(
            null
          )

          return
        }

        setCargandoLicencias(
          true
        )

        try {
          const res =
            await fetch(
              `/api/documentos/instructores?nit=${encodeURIComponent(
                nitActual
              )}&recurso=instructor_actual&documento=${encodeURIComponent(
                documento
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
                'No fue posible cargar la información del instructor.'
            )

            setInstructorSeleccionado(
              null
            )

            return
          }

          const instructor =
            json?.instructor ||
            null

          if (
            !instructor
          ) {
            toast.error(
              'No fue posible identificar al instructor.'
            )

            setInstructorSeleccionado(
              null
            )

            return
          }

          setInstructorSeleccionado(
            instructor
          )

          await cargarLicencias(
            instructor
          )
        } catch (error) {
          console.error(
            'Error cargando instructor actual:',
            error
          )

          toast.error(
            'No fue posible cargar la información del instructor.'
          )

          setInstructorSeleccionado(
            null
          )
        } finally {
          setCargandoLicencias(
            false
          )
        }
      }

    cargarInstructorActual()
  }, [
    nitActual,
    user,
  ])

  // ==========================================================
  // Abrir modal
  // ==========================================================

  const abrirModalDocumento =
    ({
      tipo,
      grupo,
      licencia,
    }) => {
      if (
        !licencia
      ) {
        setModalDocumento(
          crearModalVacio({
            tipo,
            grupo,
          })
        )

        return
      }

      setModalDocumento({
        tipo,

        grupo,

        licenciaId:
          licencia.id,

        categoria:
          licencia.categoria ||
          (
            grupo ===
            'a2'
              ? CATEGORIA_A2
              : ''
          ),

        vigencia:
          licencia.vigencia ||
          '',

        numero_certificado:
          tipo ===
          TIPO_INSTRUCTOR
            ? (
                licencia
                  .numero_certificado ||
                ''
              )
            : '',
      })
    }

  // ==========================================================
  // Guardar / renovar / recategorizar
  // ==========================================================

  const guardarDocumento =
    async () => {
      if (
        !modalDocumento ||
        !instructorSeleccionado ||
        !nitActual ||
        guardando
      ) {
        return
      }

      const categoria =
        String(
          modalDocumento
            .categoria ||
            ''
        ).trim()

      const vigencia =
        String(
          modalDocumento
            .vigencia ||
            ''
        ).trim()

      const numeroCertificado =
        String(
          modalDocumento
            .numero_certificado ||
            ''
        )
          .trim()
          .toUpperCase()

      if (
        !categoria
      ) {
        toast.error(
          'Seleccione una categoría.'
        )

        return
      }

      if (
        modalDocumento
          .grupo ===
          'a2' &&
        categoria !==
          CATEGORIA_A2
      ) {
        toast.error(
          'Este registro corresponde únicamente a la categoría A2.'
        )

        return
      }

      if (
        modalDocumento
          .grupo ===
          'bc' &&
        !CATEGORIAS_BC.includes(
          categoria
        )
      ) {
        toast.error(
          'Seleccione una categoría válida de la línea B/C.'
        )

        return
      }

      if (
        !vigencia
      ) {
        toast.error(
          'Seleccione la fecha de vigencia.'
        )

        return
      }

      if (
        modalDocumento
          .tipo ===
          TIPO_INSTRUCTOR &&
        !numeroCertificado
      ) {
        toast.error(
          'Ingrese el número de certificado de instructor.'
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
            'guardar_licencia',

          personal_id:
            instructorSeleccionado
              .personal_id,

          perfil_id:
            instructorSeleccionado
              .perfil_id,

          licencia_id:
            modalDocumento
              .licenciaId ||
            null,

          tipo_licencia:
            modalDocumento.tipo,

          categoria,

          vigencia,

          numero_certificado:
            modalDocumento
              .tipo ===
            TIPO_INSTRUCTOR
              ? numeroCertificado
              : null,

          nombre_quien_actualiza:
            user?.nombreCompleto ||
            user?.nombre_completo ||
            user?.usuario ||
            '',
        }

        const res =
          await fetch(
            '/api/documentos/instructores',
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

        // ====================================================
        // REGLAS DE NEGOCIO
        // ====================================================

        if (
          res.status ===
            409 ||
          json?.status ===
            'warning'
        ) {
          toast.warning(
            json?.message ||
              'No es posible realizar esta actualización.'
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
            'Documento guardado correctamente.'
        )

        setModalDocumento(
          null
        )

        setModalSinLicencias(
          false
        )

        await cargarLicencias(
          instructorSeleccionado,
          false
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
  // Logout
  // ==========================================================

  const handleLogout =
    () =>
      cerrarSesion(
        router
      )

  // ==========================================================
  // Render
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">

      <Toaster
        position="top-center"
        richColors
      />

      <div className="w-full max-w-5xl bg-white rounded-xl shadow-lg p-5 sm:p-6">

        {/* ==================================================
            TÍTULO
        ================================================== */}

        <h2 className="text-2xl font-bold mb-6 text-center text-[var(--primary)] flex items-center justify-center gap-2">

          <i className="fas fa-id-card-alt"></i>

          Documentos del Instructor de Práctica

        </h2>

        {/* ==================================================
            USUARIO
        ================================================== */}

        <div className="bg-blue-50 border border-blue-200 text-[var(--primary-dark)] p-2 rounded-md mb-6 text-center text-sm">

          <span>
            Usuario:{' '}

            <strong>
              {user.nombreCompleto ||
                user.nombre_completo}
            </strong>
          </span>

          {user.rol && (
            <span>
              {' '}
              ({user.rol})
            </span>
          )}

          {user.nombreEmpresa && (
            <span className="block mt-1">
              CEA:{' '}

              <strong>
                {
                  user.nombreEmpresa
                }
              </strong>
            </span>
          )}

        </div>

        {/* ==================================================
            INFORMACIÓN INSTRUCTOR
        ================================================== */}

        {cargandoLicencias &&
          !instructorSeleccionado && (

          <div className="text-center py-8 text-gray-500 text-sm">

            <i className="fas fa-spinner fa-spin mr-2"></i>

            Cargando información del instructor...

          </div>

        )}

        {instructorSeleccionado && (

          <div className="bg-gray-50 border rounded-lg p-3 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">

            <div>

              <p className="text-xs text-gray-500">
                Instructor
              </p>

              <p className="font-semibold">
                {
                  instructorSeleccionado
                    .nombre_completo
                }
              </p>

            </div>

            <div>

              <p className="text-xs text-gray-500">
                Documento
              </p>

              <p className="font-semibold">
                {
                  instructorSeleccionado
                    .documento ||
                  '-'
                }
              </p>

            </div>

            <div>

              <p className="text-xs text-gray-500">
                Rol
              </p>

              <p className="font-semibold">
                INSTRUCTOR PRÁCTICA
              </p>

            </div>

          </div>

        )}

        {/* ==================================================
            CARGANDO LICENCIAS
        ================================================== */}

        {instructorSeleccionado &&
          cargandoLicencias && (

          <div className="text-center py-8 text-gray-500 text-sm">

            <i className="fas fa-spinner fa-spin mr-2"></i>

            Consultando documentos...

          </div>

        )}

        {/* ==================================================
            DOCUMENTOS
        ================================================== */}

        {instructorSeleccionado &&
          !cargandoLicencias && (

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ==============================================
                LICENCIA DE CONDUCCIÓN
            ============================================== */}

            <div className="border rounded-xl overflow-hidden shadow-sm">

              <div className="bg-gray-900 text-white px-4 py-3 flex items-center gap-2">

                <i className="fas fa-car"></i>

                <span className="font-semibold">
                  Licencia de Conducción
                </span>

              </div>

              <div className="p-4 space-y-4">

                {/* ==========================================
                    CONDUCCIÓN A2
                ========================================== */}

                <div
                  className={`border rounded-lg p-4 ${claseTarjetaEstado(
                    licencias
                      .conduccion
                      .a2
                  )}`}
                >

                  <div className="flex justify-between gap-3 items-start">

                    <div>

                      <p className="font-semibold text-sm">
                        Motocicleta
                      </p>

                      <p className="text-xs text-gray-500">
                        Categoría A2
                      </p>

                    </div>

                    {licencias
                      .conduccion
                      .a2 ? (

                      <EstadoDocumento
                        licencia={
                          licencias
                            .conduccion
                            .a2
                        }
                      />

                    ) : (

                      <span className="text-xs bg-gray-200 rounded px-2 py-1">
                        A2
                      </span>

                    )}

                  </div>

                  {licencias
                    .conduccion
                    .a2 ? (

                    <div className="mt-4 text-sm space-y-2">

                      <p>
                        <strong>
                          Categoría:
                        </strong>{' '}
                        A2
                      </p>

                      <p>
                        <strong>
                          Vigencia:
                        </strong>{' '}

                        {formatearFecha(
                          licencias
                            .conduccion
                            .a2
                            .vigencia
                        )}
                      </p>

                      <p>
                        <strong>
                          Última actualización:
                        </strong>{' '}

                        {formatearFecha(
                          licencias
                            .conduccion
                            .a2
                            .fecha_actualizacion
                        )}
                      </p>

                      <p>
                        <strong>
                          Actualizado por:
                        </strong>{' '}

                        {licencias
                          .conduccion
                          .a2
                          .nombre_quien_actualiza ||
                          '-'}
                      </p>

                      {esVencida(
                        licencias
                          .conduccion
                          .a2
                      ) && (

                        <p className="text-xs font-semibold text-red-700">
                          Esta licencia se encuentra vencida. Registre la nueva vigencia para renovarla.
                        </p>

                      )}

                      <button
                        onClick={() =>
                          abrirModalDocumento({
                            tipo:
                              TIPO_CONDUCCION,

                            grupo:
                              'a2',

                            licencia:
                              licencias
                                .conduccion
                                .a2,
                          })
                        }
                        className={`mt-2 px-4 py-2 rounded-lg text-sm text-white ${
                          esVencida(
                            licencias
                              .conduccion
                              .a2
                          )
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-[var(--primary)] hover:bg-[var(--primary-dark)]'
                        }`}
                      >

                        <i className="fas fa-sync-alt mr-2"></i>

                        Renovar

                      </button>

                    </div>

                  ) : (

                    <div className="mt-4">

                      <p className="text-sm text-gray-500 mb-3">
                        Sin registro.
                      </p>

                      <button
                        onClick={() =>
                          abrirModalDocumento({
                            tipo:
                              TIPO_CONDUCCION,

                            grupo:
                              'a2',

                            licencia:
                              null,
                          })
                        }
                        className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-2 rounded-lg text-sm"
                      >

                        <i className="fas fa-plus mr-2"></i>

                        Registrar A2

                      </button>

                    </div>

                  )}

                </div>

                {/* ==========================================
                    CONDUCCIÓN B/C
                ========================================== */}

                <div
                  className={`border rounded-lg p-4 ${claseTarjetaEstado(
                    licencias
                      .conduccion
                      .bc
                  )}`}
                >

                  <div className="flex justify-between gap-3 items-start">

                    <div>

                      <p className="font-semibold text-sm">
                        Automóvil / Categoría B-C
                      </p>

                      <p className="text-xs text-gray-500">
                        B1, B1-C1, B2-C2 o B3-C3
                      </p>

                    </div>

                    {licencias
                      .conduccion
                      .bc && (

                      <EstadoDocumento
                        licencia={
                          licencias
                            .conduccion
                            .bc
                        }
                      />

                    )}

                  </div>

                  {licencias
                    .conduccion
                    .bc ? (

                    <div className="mt-4 text-sm space-y-2">

                      <p>
                        <strong>
                          Categoría:
                        </strong>{' '}

                        {licencias
                          .conduccion
                          .bc
                          .categoria}
                      </p>

                      <p>
                        <strong>
                          Vigencia:
                        </strong>{' '}

                        {formatearFecha(
                          licencias
                            .conduccion
                            .bc
                            .vigencia
                        )}
                      </p>

                      <p>
                        <strong>
                          Última actualización:
                        </strong>{' '}

                        {formatearFecha(
                          licencias
                            .conduccion
                            .bc
                            .fecha_actualizacion
                        )}
                      </p>

                      <p>
                        <strong>
                          Actualizado por:
                        </strong>{' '}

                        {licencias
                          .conduccion
                          .bc
                          .nombre_quien_actualiza ||
                          '-'}
                      </p>

                      {esVencida(
                        licencias
                          .conduccion
                          .bc
                      ) && (

                        <p className="text-xs font-semibold text-red-700">
                          Esta licencia se encuentra vencida. Puede renovarla o registrar una recategorización superior.
                        </p>

                      )}

                      <button
                        onClick={() =>
                          abrirModalDocumento({
                            tipo:
                              TIPO_CONDUCCION,

                            grupo:
                              'bc',

                            licencia:
                              licencias
                                .conduccion
                                .bc,
                          })
                        }
                        className={`mt-2 px-4 py-2 rounded-lg text-sm text-white ${
                          esVencida(
                            licencias
                              .conduccion
                              .bc
                          )
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-[var(--primary)] hover:bg-[var(--primary-dark)]'
                        }`}
                      >

                        <i className="fas fa-sync-alt mr-2"></i>

                        Renovar / Recategorizar

                      </button>

                    </div>

                  ) : (

                    <div className="mt-4">

                      <p className="text-sm text-gray-500 mb-3">
                        Sin registro.
                      </p>

                      <button
                        onClick={() =>
                          abrirModalDocumento({
                            tipo:
                              TIPO_CONDUCCION,

                            grupo:
                              'bc',

                            licencia:
                              null,
                          })
                        }
                        className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-2 rounded-lg text-sm"
                      >

                        <i className="fas fa-plus mr-2"></i>

                        Registrar categoría

                      </button>

                    </div>

                  )}

                </div>

              </div>

            </div>

            {/* ==============================================
                CERTIFICADO DE INSTRUCTOR
            ============================================== */}

            <div className="border rounded-xl overflow-hidden shadow-sm">

              <div className="bg-gray-900 text-white px-4 py-3 flex items-center gap-2">

                <i className="fas fa-id-badge"></i>

                <span className="font-semibold">
                  Certificado de Instructor
                </span>

              </div>

              <div className="p-4 space-y-4">

                {/* ==========================================
                    CERTIFICADO A2
                ========================================== */}

                <div
                  className={`border rounded-lg p-4 ${claseTarjetaEstado(
                    licencias
                      .instructor
                      .a2
                  )}`}
                >

                  <div className="flex justify-between gap-3 items-start">

                    <div>

                      <p className="font-semibold text-sm">
                        Motocicleta
                      </p>

                      <p className="text-xs text-gray-500">
                        Categoría A2
                      </p>

                    </div>

                    {licencias
                      .instructor
                      .a2 ? (

                      <EstadoDocumento
                        licencia={
                          licencias
                            .instructor
                            .a2
                        }
                      />

                    ) : (

                      <span className="text-xs bg-gray-200 rounded px-2 py-1">
                        A2
                      </span>

                    )}

                  </div>

                  {licencias
                    .instructor
                    .a2 ? (

                    <div className="mt-4 text-sm space-y-2">

                      <p>
                        <strong>
                          Certificado:
                        </strong>{' '}

                        {licencias
                          .instructor
                          .a2
                          .numero_certificado ||
                          '-'}
                      </p>

                      <p>
                        <strong>
                          Vigencia:
                        </strong>{' '}

                        {formatearFecha(
                          licencias
                            .instructor
                            .a2
                            .vigencia
                        )}
                      </p>

                      <p>
                        <strong>
                          Última actualización:
                        </strong>{' '}

                        {formatearFecha(
                          licencias
                            .instructor
                            .a2
                            .fecha_actualizacion
                        )}
                      </p>

                      <p>
                        <strong>
                          Actualizado por:
                        </strong>{' '}

                        {licencias
                          .instructor
                          .a2
                          .nombre_quien_actualiza ||
                          '-'}
                      </p>

                      {esVencida(
                        licencias
                          .instructor
                          .a2
                      ) && (

                        <p className="text-xs font-semibold text-red-700">
                          Este certificado se encuentra vencido. Registre la nueva vigencia para renovarlo.
                        </p>

                      )}

                      <button
                        onClick={() =>
                          abrirModalDocumento({
                            tipo:
                              TIPO_INSTRUCTOR,

                            grupo:
                              'a2',

                            licencia:
                              licencias
                                .instructor
                                .a2,
                          })
                        }
                        className={`mt-2 px-4 py-2 rounded-lg text-sm text-white ${
                          esVencida(
                            licencias
                              .instructor
                              .a2
                          )
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-[var(--primary)] hover:bg-[var(--primary-dark)]'
                        }`}
                      >

                        <i className="fas fa-sync-alt mr-2"></i>

                        Renovar

                      </button>

                    </div>

                  ) : (

                    <div className="mt-4">

                      <p className="text-sm text-gray-500 mb-3">
                        Sin registro.
                      </p>

                      <button
                        onClick={() =>
                          abrirModalDocumento({
                            tipo:
                              TIPO_INSTRUCTOR,

                            grupo:
                              'a2',

                            licencia:
                              null,
                          })
                        }
                        className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-2 rounded-lg text-sm"
                      >

                        <i className="fas fa-plus mr-2"></i>

                        Registrar A2

                      </button>

                    </div>

                  )}

                </div>

                {/* ==========================================
                    CERTIFICADO B/C
                ========================================== */}

                <div
                  className={`border rounded-lg p-4 ${claseTarjetaEstado(
                    licencias
                      .instructor
                      .bc
                  )}`}
                >

                  <div className="flex justify-between gap-3 items-start">

                    <div>

                      <p className="font-semibold text-sm">
                        Automóvil / Categoría B-C
                      </p>

                      <p className="text-xs text-gray-500">
                        B1, B1-C1, B2-C2 o B3-C3
                      </p>

                    </div>

                    {licencias
                      .instructor
                      .bc && (

                      <EstadoDocumento
                        licencia={
                          licencias
                            .instructor
                            .bc
                        }
                      />

                    )}

                  </div>

                  {licencias
                    .instructor
                    .bc ? (

                    <div className="mt-4 text-sm space-y-2">

                      <p>
                        <strong>
                          Categoría:
                        </strong>{' '}

                        {licencias
                          .instructor
                          .bc
                          .categoria}
                      </p>

                      <p>
                        <strong>
                          Certificado:
                        </strong>{' '}

                        {licencias
                          .instructor
                          .bc
                          .numero_certificado ||
                          '-'}
                      </p>

                      <p>
                        <strong>
                          Vigencia:
                        </strong>{' '}

                        {formatearFecha(
                          licencias
                            .instructor
                            .bc
                            .vigencia
                        )}
                      </p>

                      <p>
                        <strong>
                          Última actualización:
                        </strong>{' '}

                        {formatearFecha(
                          licencias
                            .instructor
                            .bc
                            .fecha_actualizacion
                        )}
                      </p>

                      <p>
                        <strong>
                          Actualizado por:
                        </strong>{' '}

                        {licencias
                          .instructor
                          .bc
                          .nombre_quien_actualiza ||
                          '-'}
                      </p>

                      {esVencida(
                        licencias
                          .instructor
                          .bc
                      ) && (

                        <p className="text-xs font-semibold text-red-700">
                          Este certificado se encuentra vencido. Puede renovarlo o registrar una recategorización superior.
                        </p>

                      )}

                      <button
                        onClick={() =>
                          abrirModalDocumento({
                            tipo:
                              TIPO_INSTRUCTOR,

                            grupo:
                              'bc',

                            licencia:
                              licencias
                                .instructor
                                .bc,
                          })
                        }
                        className={`mt-2 px-4 py-2 rounded-lg text-sm text-white ${
                          esVencida(
                            licencias
                              .instructor
                              .bc
                          )
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-[var(--primary)] hover:bg-[var(--primary-dark)]'
                        }`}
                      >

                        <i className="fas fa-sync-alt mr-2"></i>

                        Renovar / Recategorizar

                      </button>

                    </div>

                  ) : (

                    <div className="mt-4">

                      <p className="text-sm text-gray-500 mb-3">
                        Sin registro.
                      </p>

                      <button
                        onClick={() =>
                          abrirModalDocumento({
                            tipo:
                              TIPO_INSTRUCTOR,

                            grupo:
                              'bc',

                            licencia:
                              null,
                          })
                        }
                        className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-2 rounded-lg text-sm"
                      >

                        <i className="fas fa-plus mr-2"></i>

                        Registrar categoría

                      </button>

                    </div>

                  )}

                </div>

              </div>

            </div>

          </div>

        )}

        {/* ==================================================
            NAVEGACIÓN
        ================================================== */}

        <div className="flex justify-center gap-3 mt-8 flex-wrap">

          <button
            onClick={() =>
              router.push(
                '/instructor/practica/documentos'
              )
            }
            className="bg-gray-600 hover:bg-gray-800 text-white py-2 px-4 rounded-lg shadow-md flex items-center gap-2 text-sm"
          >

            <i className="fas fa-arrow-left"></i>

            Regresar

          </button>

          <button
            onClick={
              handleLogout
            }
            className="bg-[var(--danger)] hover:bg-[var(--danger-dark)] text-white py-2 px-4 rounded-lg shadow-md flex items-center gap-2 text-sm"
          >

            <i className="fas fa-sign-out-alt"></i>

            Cerrar Sesión

          </button>

        </div>

      </div>

      {/* ======================================================
          MODAL SIN DOCUMENTOS
      ====================================================== */}

      {modalSinLicencias &&
        instructorSeleccionado && (

        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">

          <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full">

            <div className="flex items-center gap-3 mb-4">

              <i className="fas fa-info-circle text-[var(--primary)] text-2xl"></i>

              <h3 className="text-lg font-bold">
                Sin documentos registrados
              </h3>

            </div>

            <p className="text-sm text-gray-700 mb-3">
              No existen licencias ni certificados registrados para este instructor.
            </p>

            <div className="bg-gray-50 border rounded-lg p-3 text-sm mb-5">

              <p>
                <strong>
                  Instructor:
                </strong>{' '}

                {
                  instructorSeleccionado
                    .nombre_completo
                }
              </p>

              <p>
                <strong>
                  Documento:
                </strong>{' '}

                {
                  instructorSeleccionado
                    .documento ||
                  '-'
                }
              </p>

            </div>

            <p className="text-sm text-gray-700 mb-5">
              Puede registrar Licencias de Conducción y Certificados de Instructor desde las opciones disponibles.
            </p>

            <div className="flex justify-end">

              <button
                onClick={() =>
                  setModalSinLicencias(
                    false
                  )
                }
                className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 py-2 rounded-lg"
              >
                Entendido
              </button>

            </div>

          </div>

        </div>

      )}

      {/* ======================================================
          MODAL DOCUMENTO
      ====================================================== */}

      {modalDocumento && (

        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">

          <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full">

            <h3 className="text-lg font-bold text-[var(--primary)] mb-1">

              {modalDocumento
                .licenciaId
                ? 'Renovar / Actualizar'
                : 'Registrar'}{' '}

              {modalDocumento.tipo ===
              TIPO_INSTRUCTOR
                ? 'Certificado de Instructor'
                : 'Licencia de Conducción'}

            </h3>

            {instructorSeleccionado && (

              <p className="text-xs text-gray-500 mb-4">

                {
                  instructorSeleccionado
                    .nombre_completo
                }{' '}
                •{' '}
                {
                  instructorSeleccionado
                    .documento
                }

              </p>

            )}

            {modalDocumento
              .licenciaId && (

              <div className="mb-5 border border-blue-200 bg-blue-50 text-blue-800 rounded-lg p-3 text-xs">

                <div className="flex gap-2 items-start">

                  <i className="fas fa-history mt-0.5"></i>

                  <p>
                    Esta actualización generará un
                    <strong>
                      {' '}nuevo registro histórico
                    </strong>.
                    El documento anterior se conservará para mantener la trazabilidad.
                  </p>

                </div>

              </div>

            )}

            <div className="space-y-4">

              {/* ============================================
                  CATEGORÍA
              ============================================ */}

              <div>

                <label className="block mb-1 font-semibold text-sm">
                  Categoría
                </label>

                {modalDocumento
                  .grupo ===
                'a2' ? (

                  <input
                    type="text"
                    readOnly
                    className="w-full border p-2 rounded-lg text-sm bg-gray-100"
                    value="A2"
                  />

                ) : (

                  <select
                    className="w-full border p-2 rounded-lg text-sm"
                    value={
                      modalDocumento
                        .categoria
                    }
                    onChange={(e) =>
                      setModalDocumento(
                        (prev) => ({
                          ...prev,

                          categoria:
                            e.target
                              .value,
                        })
                      )
                    }
                  >

                    <option value="">
                      -- Seleccione categoría --
                    </option>

                    {CATEGORIAS_BC.map(
                      (categoria) => (

                        <option
                          key={
                            categoria
                          }
                          value={
                            categoria
                          }
                        >
                          {categoria}
                        </option>

                      )
                    )}

                  </select>

                )}

              </div>

              {/* ============================================
                  CERTIFICADO
              ============================================ */}

              {modalDocumento
                .tipo ===
                TIPO_INSTRUCTOR && (

                <div>

                  <label className="block mb-1 font-semibold text-sm">
                    Número de Certificado de Instructor
                  </label>

                  <input
                    type="text"
                    className="w-full border p-2 rounded-lg text-sm uppercase"
                    value={
                      modalDocumento
                        .numero_certificado
                    }
                    onChange={(e) =>
                      setModalDocumento(
                        (prev) => ({
                          ...prev,

                          numero_certificado:
                            e.target
                              .value
                              .toUpperCase(),
                        })
                      )
                    }
                    placeholder="Ingrese número de certificado"
                  />

                </div>

              )}

              {/* ============================================
                  VIGENCIA
              ============================================ */}

              <div>

                <label className="block mb-1 font-semibold text-sm">
                  Fecha de Vigencia
                </label>

                <input
                  type="date"
                  className="w-full border p-2 rounded-lg text-sm"
                  value={
                    modalDocumento
                      .vigencia
                  }
                  onChange={(e) =>
                    setModalDocumento(
                      (prev) => ({
                        ...prev,

                        vigencia:
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

                <label className="block mb-1 font-semibold text-sm">
                  Actualizado por
                </label>

                <input
                  type="text"
                  readOnly
                  className="w-full border p-2 rounded-lg text-sm bg-gray-100"
                  value={
                    user?.nombreCompleto ||
                    user?.nombre_completo ||
                    ''
                  }
                />

              </div>

            </div>

            {/* ==============================================
                BOTONES MODAL
            ============================================== */}

            <div className="flex justify-end gap-3 mt-6">

              <button
                onClick={() =>
                  setModalDocumento(
                    null
                  )
                }
                disabled={
                  guardando
                }
                className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
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
                className={`px-4 py-2 rounded-lg text-white ${
                  guardando
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[var(--primary)] hover:bg-[var(--primary-dark)]'
                }`}
              >

                {guardando
                  ? 'Guardando...'
                  : modalDocumento
                      .licenciaId
                  ? modalDocumento
                      .grupo ===
                    'bc'
                    ? 'Renovar / Recategorizar'
                    : 'Renovar'
                  : 'Registrar'}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  )
}