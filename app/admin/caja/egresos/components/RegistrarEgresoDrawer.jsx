// app/admin/caja/egresos/components/RegistrarEgresoDrawer.jsx

'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

// =========================================================
// HELPERS
// =========================================================

function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}

function mayusculas(
  valor
) {
  return texto(
    valor
  ).toUpperCase()
}

function hoyColombia() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'America/Bogota',

      year:
        'numeric',

      month:
        '2-digit',

      day:
        '2-digit',
    }
  ).format(
    new Date()
  )
}

function formatearMoneda(
  valor
) {
  return new Intl.NumberFormat(
    'es-CO',
    {
      style:
        'currency',

      currency:
        'COP',

      minimumFractionDigits:
        0,

      maximumFractionDigits:
        0,
    }
  ).format(
    Number(
      valor ||
      0
    )
  )
}

function nombreCompletoPersonal(
  persona
) {
  return (
    persona?.nombre_completo ||
    [
      persona?.nombres,
      persona?.apellidos,
    ]
      .filter(
        Boolean
      )
      .join(
        ' '
      )
      .trim() ||
    '-'
  )
}

function descripcionVehiculo(
  vehiculo
) {
  const partes = [
    mayusculas(
      vehiculo?.placa
    ),

    mayusculas(
      vehiculo?.tipo_vehiculo
    ),

    mayusculas(
      vehiculo?.marca
    ),

    mayusculas(
      vehiculo?.linea
    ),

    texto(
      vehiculo?.modelo
    ),
  ].filter(
    Boolean
  )

  return partes.join(
    ' · '
  )
}

// =========================================================
// FORMULARIO INICIAL
// =========================================================

function formularioInicial() {
  return {
    fecha:
      hoyColombia(),

    concepto_id:
      '',

    medio_pago_id:
      '',

    valor:
      '',

    tipo_beneficiario:
      'FUNCIONARIO',

    personal_id:
      '',

    beneficiario:
      '',

    tipo_documento_beneficiario:
      'CC',

    documento_beneficiario:
      '',

    cargo_beneficiario:
      '',

    vehiculo_id:
      '',

    placa:
      '',

    descripcion:
      '',

    numero_factura:
      '',

    referencia_pago:
      '',

    observaciones:
      '',
  }
}

function conceptoInicial() {
  return {
    nombre:
      '',

    descripcion:
      '',

    naturaleza:
      'EGRESO',

    requiere_aprendiz:
      false,

    requiere_vehiculo:
      false,
  }
}

// =========================================================
// COMPONENTE
// =========================================================

export default function RegistrarEgresoDrawer({
  abierto,
  onCerrar,

  empresaNombre = '',

  conceptos = [],
  mediosPago = [],
  personal = [],
  vehiculos = [],

  postEgreso,
  postCatalogos,

  onActualizado,
  onCatalogosActualizados,

  onImprimirCuentaCobro,
}) {
  const drawerRef =
    useRef(
      null
    )

  // =======================================================
  // PESTAÑA
  // =======================================================

  const [
    pestana,
    setPestana,
  ] =
    useState(
      'REGISTRAR'
    )

  // =======================================================
  // FORMULARIO EGRESO
  // =======================================================

  const [
    form,
    setForm,
  ] =
    useState(
      formularioInicial()
    )

  const [
    procesando,
    setProcesando,
  ] =
    useState(
      false
    )

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    mensaje,
    setMensaje,
  ] =
    useState('')

  const [
    egresoRegistrado,
    setEgresoRegistrado,
  ] =
    useState(
      null
    )

  // =======================================================
  // PERSONAL
  // =======================================================

  const [
    buscarPersonal,
    setBuscarPersonal,
  ] =
    useState('')

  const [
    mostrarResultadosPersonal,
    setMostrarResultadosPersonal,
  ] =
    useState(
      false
    )

  // =======================================================
  // VEHÍCULO
  // =======================================================

  const [
    buscarVehiculo,
    setBuscarVehiculo,
  ] =
    useState('')

  const [
    mostrarResultadosVehiculo,
    setMostrarResultadosVehiculo,
  ] =
    useState(
      false
    )

  // =======================================================
  // ADMINISTRAR CONCEPTOS
  // =======================================================

  const [
    editandoConcepto,
    setEditandoConcepto,
  ] =
    useState(
      null
    )

  const [
    formConcepto,
    setFormConcepto,
  ] =
    useState(
      conceptoInicial()
    )

  // =======================================================
  // CONCEPTOS DISPONIBLES PARA EGRESOS
  // =======================================================

  const conceptosEgreso =
    useMemo(
      () => {
        return (
          Array.isArray(
            conceptos
          )
            ? conceptos
            : []
        )
          .filter(
            item =>
              item?.activo !==
                false &&
              [
                'EGRESO',
                'AMBOS',
              ].includes(
                mayusculas(
                  item?.naturaleza
                )
              )
          )
          .sort(
            (
              a,
              b
            ) =>
              mayusculas(
                a?.nombre
              ).localeCompare(
                mayusculas(
                  b?.nombre
                ),
                'es'
              )
          )
      },
      [
        conceptos,
      ]
    )

  // =======================================================
  // TODOS LOS CONCEPTOS ADMINISTRABLES
  // =======================================================

  const conceptosAdmin =
    useMemo(
      () => {
        return (
          Array.isArray(
            conceptos
          )
            ? conceptos
            : []
        )
          .filter(
            item =>
              [
                'EGRESO',
                'AMBOS',
              ].includes(
                mayusculas(
                  item?.naturaleza
                )
              )
          )
          .slice()
          .sort(
            (
              a,
              b
            ) =>
              mayusculas(
                a?.nombre
              ).localeCompare(
                mayusculas(
                  b?.nombre
                ),
                'es'
              )
          )
      },
      [
        conceptos,
      ]
    )

  // =======================================================
  // MEDIOS DE PAGO
  // =======================================================

  const mediosVisibles =
    useMemo(
      () => {
        return (
          Array.isArray(
            mediosPago
          )
            ? mediosPago
            : []
        )
          .filter(
            item =>
              item?.activo !==
              false
          )
          .slice()
          .sort(
            (
              a,
              b
            ) =>
              mayusculas(
                a?.nombre
              ).localeCompare(
                mayusculas(
                  b?.nombre
                ),
                'es'
              )
          )
      },
      [
        mediosPago,
      ]
    )

  // =======================================================
  // PERSONAL ACTIVO
  // =======================================================

  const personalActivo =
    useMemo(
      () => {
        return (
          Array.isArray(
            personal
          )
            ? personal
            : []
        )
          .filter(
            item =>
              ![
                'INACTIVO',
                'RETIRADO',
              ].includes(
                mayusculas(
                  item?.estado
                )
              )
          )
          .slice()
          .sort(
            (
              a,
              b
            ) =>
              nombreCompletoPersonal(
                a
              ).localeCompare(
                nombreCompletoPersonal(
                  b
                ),
                'es'
              )
          )
      },
      [
        personal,
      ]
    )

  // =======================================================
  // VEHÍCULOS
  // =======================================================

  const vehiculosDisponibles =
    useMemo(
      () => {
        return (
          Array.isArray(
            vehiculos
          )
            ? vehiculos
            : []
        )
          .slice()
          .sort(
            (
              a,
              b
            ) =>
              mayusculas(
                a?.placa
              ).localeCompare(
                mayusculas(
                  b?.placa
                ),
                'es'
              )
          )
      },
      [
        vehiculos,
      ]
    )

  // =======================================================
  // CONCEPTO SELECCIONADO
  // =======================================================

  const conceptoSeleccionado =
    useMemo(
      () => {
        return (
          conceptosEgreso.find(
            item =>
              String(
                item?.id
              ) ===
              String(
                form.concepto_id
              )
          ) ||
          null
        )
      },
      [
        conceptosEgreso,
        form.concepto_id,
      ]
    )

  const requiereVehiculo =
    conceptoSeleccionado
      ?.requiere_vehiculo ===
    true

  // =======================================================
  // FILTRAR PERSONAL
  // =======================================================

  const personalFiltrado =
    useMemo(
      () => {
        const termino =
          mayusculas(
            buscarPersonal
          )

        if (
          termino.length <
          2
        ) {
          return personalActivo
            .slice(
              0,
              20
            )
        }

        return personalActivo
          .filter(
            persona => {
              const nombre =
                mayusculas(
                  nombreCompletoPersonal(
                    persona
                  )
                )

              const documento =
                mayusculas(
                  persona?.documento
                )

              const cargo =
                mayusculas(
                  persona?.cargo ||
                  persona?.tipo_personal
                )

              return (
                nombre.includes(
                  termino
                ) ||
                documento.includes(
                  termino
                ) ||
                cargo.includes(
                  termino
                )
              )
            }
          )
          .slice(
            0,
            30
          )
      },
      [
        personalActivo,
        buscarPersonal,
      ]
    )

  // =======================================================
  // FILTRAR VEHÍCULOS
  // =======================================================

  const vehiculosFiltrados =
    useMemo(
      () => {
        const termino =
          mayusculas(
            buscarVehiculo
          )

        if (
          !termino
        ) {
          return vehiculosDisponibles
            .slice(
              0,
              20
            )
        }

        return vehiculosDisponibles
          .filter(
            vehiculo =>
              mayusculas(
                descripcionVehiculo(
                  vehiculo
                )
              ).includes(
                termino
              )
          )
          .slice(
            0,
            30
          )
      },
      [
        vehiculosDisponibles,
        buscarVehiculo,
      ]
    )

  // =======================================================
  // REINICIAR EGRESO
  // =======================================================

  function reiniciarFormulario() {
    setForm(
      formularioInicial()
    )

    setBuscarPersonal('')
    setBuscarVehiculo('')

    setMostrarResultadosPersonal(
      false
    )

    setMostrarResultadosVehiculo(
      false
    )

    setEgresoRegistrado(
      null
    )

    setError('')
    setMensaje('')
  }

  // =======================================================
  // REINICIAR CONCEPTO
  // =======================================================

  function nuevoConcepto() {
    setEditandoConcepto(
      null
    )

    setFormConcepto(
      conceptoInicial()
    )

    setError('')
    setMensaje('')
  }

  // =======================================================
  // AL ABRIR
  // =======================================================

  useEffect(
    () => {
      if (
        abierto
      ) {
        setPestana(
          'REGISTRAR'
        )

        reiniciarFormulario()
        nuevoConcepto()

        setTimeout(
          () => {
            drawerRef.current
              ?.scrollTo({
                top:
                  0,

                behavior:
                  'auto',
              })
          },
          50
        )
      }
    },
    [
      abierto,
    ]
  )

  // =======================================================
  // SELECCIONAR CONCEPTO
  // =======================================================

  function seleccionarConcepto(
    conceptoId
  ) {
    const concepto =
      conceptosEgreso.find(
        item =>
          String(
            item.id
          ) ===
          String(
            conceptoId
          )
      )

    const necesitaVehiculo =
      concepto
        ?.requiere_vehiculo ===
      true

    setForm(
      actual => ({
        ...actual,

        concepto_id:
          conceptoId,

        descripcion:
            concepto?.descripcion
                ? texto(
                    concepto.descripcion
                )
                : (
                    concepto?.nombre
                    ? mayusculas(
                        concepto.nombre
                        )
                    : actual.descripcion
                ),

        vehiculo_id:
          necesitaVehiculo
            ? actual.vehiculo_id
            : '',

        placa:
          necesitaVehiculo
            ? actual.placa
            : '',
      })
    )

    if (
      !necesitaVehiculo
    ) {
      setBuscarVehiculo('')

      setMostrarResultadosVehiculo(
        false
      )
    }
  }

  // =======================================================
  // CAMBIAR BENEFICIARIO
  // =======================================================

  function cambiarTipoBeneficiario(
    tipo
  ) {
    setForm(
      actual => ({
        ...actual,

        tipo_beneficiario:
          tipo,

        personal_id:
          '',

        beneficiario:
          '',

        tipo_documento_beneficiario:
          'CC',

        documento_beneficiario:
          '',

        cargo_beneficiario:
          '',
      })
    )

    setBuscarPersonal('')

    setMostrarResultadosPersonal(
      false
    )
  }

  // =======================================================
  // SELECCIONAR FUNCIONARIO
  // =======================================================

  function seleccionarPersonal(
    persona
  ) {
    setForm(
      actual => ({
        ...actual,

        personal_id:
          persona?.id ||
          '',

        beneficiario:
          mayusculas(
            nombreCompletoPersonal(
              persona
            )
          ),

        tipo_documento_beneficiario:
          mayusculas(
            persona
              ?.tipo_documento
          ) ||
          'CC',

        documento_beneficiario:
          texto(
            persona
              ?.documento
          ),

        cargo_beneficiario:
          mayusculas(
            persona?.cargo ||
            persona?.tipo_personal
          ),
      })
    )

    setBuscarPersonal(
      nombreCompletoPersonal(
        persona
      )
    )

    setMostrarResultadosPersonal(
      false
    )
  }

  // =======================================================
  // SELECCIONAR VEHÍCULO
  // =======================================================

  function seleccionarVehiculo(
    vehiculo
  ) {
    setForm(
      actual => ({
        ...actual,

        vehiculo_id:
          vehiculo?.id ||
          '',

        placa:
          mayusculas(
            vehiculo?.placa
          ),
      })
    )

    setBuscarVehiculo(
      descripcionVehiculo(
        vehiculo
      )
    )

    setMostrarResultadosVehiculo(
      false
    )
  }

  // =======================================================
  // VALIDAR EGRESO
  // =======================================================

  function validarFormulario() {
    if (
      !form.fecha
    ) {
      return 'Seleccione la fecha del egreso.'
    }

    if (
      !form.concepto_id
    ) {
      return 'Seleccione el concepto del egreso.'
    }

    const valor =
      Number(
        form.valor
      )

    if (
      !Number.isFinite(
        valor
      ) ||
      valor <=
        0
    ) {
      return 'Ingrese un valor válido mayor a cero.'
    }

    if (
      form.tipo_beneficiario ===
        'FUNCIONARIO' &&
      !form.personal_id
    ) {
      return 'Seleccione un funcionario.'
    }

    if (
      !texto(
        form.beneficiario
      )
    ) {
      return 'Ingrese o seleccione el beneficiario.'
    }

    if (
      !texto(
        form.documento_beneficiario
      )
    ) {
      return 'Ingrese el documento del beneficiario.'
    }

    if (
      requiereVehiculo &&
      !form.vehiculo_id
    ) {
      return 'Este concepto requiere seleccionar un vehículo.'
    }

    if (
      !texto(
        form.descripcion
      )
    ) {
      return 'Ingrese la descripción del egreso.'
    }

    if (
      !form.medio_pago_id
    ) {
      return 'Seleccione el medio de pago.'
    }

    return ''
  }

  // =======================================================
  // REGISTRAR EGRESO
  // =======================================================

  async function registrarEgreso() {
    const validacion =
      validarFormulario()

    if (
      validacion
    ) {
      setError(
        validacion
      )

      setMensaje('')

      return
    }

    if (
      typeof postEgreso !==
      'function'
    ) {
      setError(
        'No se encuentra disponible la función para registrar el egreso.'
      )

      return
    }

    setProcesando(
      true
    )

    setError('')
    setMensaje('')

    try {
      const data =
        await postEgreso({
          accion:
            'registrar',

          fecha:
            form.fecha,

          concepto_id:
            form.concepto_id,

          medio_pago_id:
            form.medio_pago_id,

          valor:
            Number(
              form.valor
            ),

          beneficiario:
            mayusculas(
              form.beneficiario
            ),

          tipo_documento_beneficiario:
            mayusculas(
              form.tipo_documento_beneficiario
            ),

          documento_beneficiario:
            texto(
              form.documento_beneficiario
            ),

          vehiculo_id:
            form.vehiculo_id ||
            null,

         descripcion:
            texto(
                form.descripcion
            ),

          numero_factura:
            texto(
              form.numero_factura
            ) ||
            null,

          referencia_pago:
            texto(
              form.referencia_pago
            ) ||
            null,

          observaciones:
            mayusculas(
              form.observaciones
            ) ||
            null,
        })

      const egreso =
        data?.data ||
        null

      setEgresoRegistrado(
        egreso
      )

      setMensaje(
        data?.message ||
        'Egreso registrado correctamente.'
      )

      if (
        typeof onActualizado ===
        'function'
      ) {
        await onActualizado()
      }

      setTimeout(
        () => {
          drawerRef.current
            ?.scrollTo({
              top:
                0,

              behavior:
                'smooth',
            })
        },
        80
      )
    } catch (
      errorRegistro
    ) {
      console.error(
        'Error registrando egreso:',
        errorRegistro
      )

      setError(
        errorRegistro?.message ||
        'No fue posible registrar el egreso.'
      )

      setTimeout(
        () => {
          drawerRef.current
            ?.scrollTo({
              top:
                0,

              behavior:
                'smooth',
            })
        },
        80
      )
    } finally {
      setProcesando(
        false
      )
    }
  }

  // =======================================================
  // IMPRIMIR EGRESO REGISTRADO
  // =======================================================

  function imprimirEgresoRegistrado() {
    if (
      !egresoRegistrado
    ) {
      return
    }

    if (
      typeof onImprimirCuentaCobro !==
      'function'
    ) {
      setError(
        'La impresión de cuenta de cobro todavía no se encuentra configurada.'
      )

      return
    }

    onImprimirCuentaCobro(
      egresoRegistrado,
      {
        empresaNombre,

        cargo_beneficiario:
          form.cargo_beneficiario,
      }
    )
  }

  // =======================================================
  // EDITAR CONCEPTO
  // =======================================================

  function editarConcepto(
    concepto
  ) {
    setEditandoConcepto(
      concepto
    )

    setFormConcepto({
      nombre:
        mayusculas(
          concepto?.nombre
        ),

      descripcion:
        texto(
          concepto?.descripcion
        ),

      naturaleza:
        mayusculas(
          concepto?.naturaleza
        ) ||
        'EGRESO',

      requiere_aprendiz:
        concepto?.requiere_aprendiz ===
        true,

      requiere_vehiculo:
        concepto?.requiere_vehiculo ===
        true,
    })

    setError('')
    setMensaje('')

    setTimeout(
      () => {
        const elemento =
          document.getElementById(
            'formulario-concepto-egreso'
          )

        elemento
          ?.scrollIntoView({
            behavior:
              'smooth',

            block:
              'start',
          })
      },
      80
    )
  }

  // =======================================================
  // GUARDAR CONCEPTO
  // =======================================================

  async function guardarConcepto() {
    if (
      typeof postCatalogos !==
      'function'
    ) {
      setError(
        'No se encuentra disponible la función para administrar conceptos.'
      )

      return
    }

    const nombre =
      mayusculas(
        formConcepto.nombre
      )

    if (
      !nombre
    ) {
      setError(
        'Ingrese el nombre del concepto.'
      )

      return
    }

    setProcesando(
      true
    )

    setError('')
    setMensaje('')

    try {
      const data =
        await postCatalogos({
          accion:
            editandoConcepto
              ? 'editar_concepto'
              : 'crear_concepto',

          concepto_id:
            editandoConcepto
              ?.id ||
            null,

          nombre,

          descripcion:
            texto(
              formConcepto.descripcion
            ),

          naturaleza:
            formConcepto.naturaleza,

          requiere_aprendiz:
            formConcepto.requiere_aprendiz,

          requiere_vehiculo:
            formConcepto.requiere_vehiculo,
        })

      setMensaje(
        data?.message ||
        'Concepto guardado correctamente.'
      )

      nuevoConcepto()

      if (
        typeof onCatalogosActualizados ===
        'function'
      ) {
        await onCatalogosActualizados()
      } else if (
        typeof onActualizado ===
        'function'
      ) {
        await onActualizado()
      }

      setTimeout(
        () => {
          drawerRef.current
            ?.scrollTo({
              top:
                0,

              behavior:
                'smooth',
            })
        },
        80
      )
    } catch (
      errorGuardar
    ) {
      setError(
        errorGuardar?.message ||
        'No fue posible guardar el concepto.'
      )
    } finally {
      setProcesando(
        false
      )
    }
  }

  // =======================================================
  // ACTIVAR / DESACTIVAR CONCEPTO
  // =======================================================

  async function cambiarEstadoConcepto(
    concepto
  ) {
    if (
      typeof postCatalogos !==
      'function'
    ) {
      setError(
        'No se encuentra disponible la función para administrar conceptos.'
      )

      return
    }

    const activar =
      concepto?.activo !==
      true

    const confirmar =
      window.confirm(
        activar
          ? `¿Desea activar el concepto ${concepto.nombre}?`
          : `¿Desea desactivar el concepto ${concepto.nombre}?`
      )

    if (
      !confirmar
    ) {
      return
    }

    setProcesando(
      true
    )

    setError('')
    setMensaje('')

    try {
      const data =
        await postCatalogos({
          accion:
            activar
              ? 'activar_concepto'
              : 'desactivar_concepto',

          concepto_id:
            concepto.id,
        })

      setMensaje(
        data?.message ||
        'Concepto actualizado correctamente.'
      )

      if (
        typeof onCatalogosActualizados ===
        'function'
      ) {
        await onCatalogosActualizados()
      } else if (
        typeof onActualizado ===
        'function'
      ) {
        await onActualizado()
      }
    } catch (
      errorEstado
    ) {
      setError(
        errorEstado?.message ||
        'No fue posible actualizar el concepto.'
      )
    } finally {
      setProcesando(
        false
      )
    }
  }

  // =======================================================
  // NO RENDER
  // =======================================================

  if (
    !abierto
  ) {
    return null
  }

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div
      className="
        fixed
        inset-0
        z-[70]
      "
    >
      {/* ===================================================
          FONDO
      =================================================== */}

      <div
        className="
          absolute
          inset-0
          bg-black/40
        "
        onClick={() => {
          if (
            !procesando
          ) {
            onCerrar()
          }
        }}
      ></div>

      {/* ===================================================
          DRAWER
      =================================================== */}

      <aside
        ref={
          drawerRef
        }
        className="
          absolute
          right-0
          top-0
          h-full
          w-full
          sm:w-[560px]
          bg-white
          shadow-2xl
          overflow-y-auto
          scroll-smooth
        "
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div
          className="
            sticky
            top-0
            z-30
            bg-white
            border-b
            border-gray-300
          "
        >
          <div
            className="
              px-4
              py-3
              flex
              justify-between
              items-start
              gap-3
            "
          >
            <div>
              <p
                className="
                  text-[9px]
                  uppercase
                  font-bold
                  tracking-wide
                  text-gray-500
                "
              >
                Caja · Egresos
              </p>

              <h2
                className="
                  text-lg
                  font-black
                  text-[var(--primary)]
                  mt-0.5
                "
              >
                Egresos
              </h2>

              <p
                className="
                  text-[10px]
                  text-gray-500
                  mt-1
                "
              >
                Registro y administración de conceptos de egreso.
              </p>
            </div>

            <button
              type="button"
              disabled={
                procesando
              }
              onClick={
                onCerrar
              }
              className="
                shrink-0
                w-9
                h-9
                border
                border-gray-300
                rounded-lg
                hover:bg-gray-100
                disabled:opacity-50
              "
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* ===============================================
              TABS
          =============================================== */}

          <div
            className="
              grid
              grid-cols-2
              border-t
              border-gray-200
            "
          >
            <button
              type="button"
              onClick={() => {
                setPestana(
                  'REGISTRAR'
                )

                setError('')
                setMensaje('')
              }}
              className={`
                py-2.5
                px-2
                text-[9px]
                font-black
                ${
                  pestana ===
                  'REGISTRAR'
                    ? 'bg-red-50 text-red-700 border-b-2 border-red-600'
                    : 'text-gray-500 hover:bg-gray-50'
                }
              `}
            >
              <i className="fas fa-money-bill-transfer mr-1"></i>

              REGISTRAR EGRESO
            </button>

            <button
              type="button"
              onClick={() => {
                setPestana(
                  'CONCEPTOS'
                )

                setError('')
                setMensaje('')
              }}
              className={`
                py-2.5
                px-2
                text-[9px]
                font-black
                ${
                  pestana ===
                  'CONCEPTOS'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:bg-gray-50'
                }
              `}
            >
              <i className="fas fa-list mr-1"></i>

              ADMINISTRAR CONCEPTOS
            </button>
          </div>
        </div>

        {/* =================================================
            CONTENIDO
        ================================================= */}

        <div
          className="
            p-4
            space-y-4
          "
        >
          {/* ===============================================
              MENSAJES
          =============================================== */}

          {error && (
            <div
              className="
                bg-red-50
                border
                border-red-300
                text-red-700
                rounded-lg
                p-3
                text-[10px]
              "
            >
              <i className="fas fa-exclamation-triangle mr-2"></i>

              {error}
            </div>
          )}

          {mensaje &&
            !egresoRegistrado && (
            <div
              className="
                bg-emerald-50
                border
                border-emerald-300
                text-emerald-700
                rounded-lg
                p-3
                text-[10px]
              "
            >
              <i className="fas fa-check-circle mr-2"></i>

              {mensaje}
            </div>
          )}

          {/* ===============================================
              REGISTRAR EGRESO
          =============================================== */}

          {pestana ===
            'REGISTRAR' && (
            <>
              {/* ===========================================
                  REGISTRO EXITOSO
              =========================================== */}

              {egresoRegistrado && (
                <div
                  className="
                    border
                    border-emerald-300
                    bg-emerald-50
                    rounded-xl
                    overflow-hidden
                  "
                >
                  <div
                    className="
                      px-3
                      py-2.5
                      bg-emerald-600
                      text-white
                    "
                  >
                    <div
                      className="
                        text-[10px]
                        font-black
                      "
                    >
                      <i className="fas fa-check-circle mr-2"></i>

                      EGRESO REGISTRADO CORRECTAMENTE
                    </div>
                  </div>

                  <div
                    className="
                      p-3
                    "
                  >
                    <div
                      className="
                        grid
                        grid-cols-2
                        gap-3
                      "
                    >
                      <DatoResumen
                        label="Cuenta"
                        value={
                          egresoRegistrado
                            ?.numero_cuenta_cobro ||
                          `#${egresoRegistrado?.id || ''}`
                        }
                      />

                      <DatoResumen
                        label="Valor"
                        value={
                          formatearMoneda(
                            egresoRegistrado
                              ?.valor
                          )
                        }
                      />
                    </div>

                    <div
                      className="
                        mt-3
                      "
                    >
                      <DatoResumen
                        label="Beneficiario"
                        value={
                          egresoRegistrado
                            ?.beneficiario
                        }
                      />
                    </div>

                    <div
                      className="
                        mt-3
                        grid
                        grid-cols-1
                        sm:grid-cols-2
                        gap-2
                      "
                    >
                      <button
                        type="button"
                        onClick={
                          imprimirEgresoRegistrado
                        }
                        className="
                          border
                          border-blue-300
                          bg-white
                          hover:bg-blue-50
                          text-blue-700
                          rounded-lg
                          py-2.5
                          px-3
                          text-[10px]
                          font-black
                        "
                      >
                        <i className="fas fa-print mr-2"></i>

                        IMPRIMIR CUENTA DE COBRO
                      </button>

                      <button
                        type="button"
                        onClick={
                          reiniciarFormulario
                        }
                        className="
                          border
                          border-gray-300
                          bg-white
                          hover:bg-gray-100
                          text-gray-700
                          rounded-lg
                          py-2.5
                          px-3
                          text-[10px]
                          font-black
                        "
                      >
                        <i className="fas fa-plus mr-2"></i>

                        REGISTRAR OTRO EGRESO
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ===========================================
                  FORMULARIO
              =========================================== */}

              {!egresoRegistrado && (
                <>
                  {/* =======================================
                      DATOS EGRESO
                  ======================================= */}

                  <Seccion
                    titulo="Datos del egreso"
                    icono="fas fa-file-invoice-dollar"
                  >
                    <div
                      className="
                        grid
                        grid-cols-2
                        gap-2
                      "
                    >
                      <CampoInput
                        label="Fecha"
                        type="date"
                        value={
                          form.fecha
                        }
                        onChange={
                          value =>
                            setForm(
                              actual => ({
                                ...actual,

                                fecha:
                                  value,
                              })
                            )
                        }
                      />

                      <CampoInput
                        label="Valor"
                        value={
                          form.valor
                            ? Number(
                                String(
                                  form.valor
                                ).replace(
                                  /\D/g,
                                  ''
                                )
                              ).toLocaleString(
                                'es-CO'
                              )
                            : ''
                        }
                        onChange={
                          value =>
                            setForm(
                              actual => ({
                                ...actual,

                                valor:
                                  String(
                                    value ||
                                    ''
                                  ).replace(
                                    /\D/g,
                                    ''
                                  ),
                              })
                            )
                        }
                        inputMode="numeric"
                        placeholder="0"
                      />
                    </div>

                    <CampoSelect
                      label="Concepto"
                      value={
                        form.concepto_id
                      }
                      onChange={
                        seleccionarConcepto
                      }
                      options={
                        conceptosEgreso.map(
                          item => ({
                            value:
                              item.id,

                            label:
                              mayusculas(
                                item.nombre
                              ),
                          })
                        )
                      }
                    />

                   <CampoTextarea
                    label="Descripción"
                    value={
                        form.descripcion
                    }
                    onChange={
                        value =>
                        setForm(
                            actual => ({
                            ...actual,

                            descripcion:
                                value,
                            })
                        )
                    }
                    />
                  </Seccion>

                  {/* =======================================
                      BENEFICIARIO
                  ======================================= */}

                  <Seccion
                    titulo="Beneficiario"
                    icono="fas fa-user-check"
                  >
                    <div
                      className="
                        grid
                        grid-cols-2
                        gap-2
                      "
                    >
                      <BotonTipo
                        activo={
                          form.tipo_beneficiario ===
                          'FUNCIONARIO'
                        }
                        titulo="FUNCIONARIO"
                        subtitulo="Personal del CEA"
                        icono="fas fa-id-badge"
                        onClick={() =>
                          cambiarTipoBeneficiario(
                            'FUNCIONARIO'
                          )
                        }
                      />

                      <BotonTipo
                        activo={
                          form.tipo_beneficiario ===
                          'TERCERO'
                        }
                        titulo="TERCERO"
                        subtitulo="Persona o empresa"
                        icono="fas fa-building"
                        onClick={() =>
                          cambiarTipoBeneficiario(
                            'TERCERO'
                          )
                        }
                      />
                    </div>

                    {/* FUNCIONARIO */}

                    {form.tipo_beneficiario ===
                      'FUNCIONARIO' && (
                      <div
                        className="
                          relative
                        "
                      >
                        <label
                          className="
                            block
                            text-[10px]
                            font-semibold
                            text-gray-600
                            mb-1
                          "
                        >
                          Buscar funcionario
                        </label>

                        <div className="relative">
                          <i
                            className="
                              fas
                              fa-search
                              absolute
                              left-3
                              top-1/2
                              -translate-y-1/2
                              text-gray-400
                              text-xs
                            "
                          ></i>

                          <input
                            type="text"
                            value={
                              buscarPersonal
                            }
                            onFocus={() =>
                              setMostrarResultadosPersonal(
                                true
                              )
                            }
                            onChange={
                              e => {
                                setBuscarPersonal(
                                  e.target.value
                                )

                                setMostrarResultadosPersonal(
                                  true
                                )
                              }
                            }
                            placeholder="Nombre, documento o cargo..."
                            className="
                              w-full
                              border
                              border-gray-300
                              rounded-lg
                              pl-9
                              pr-3
                              py-2
                              text-xs
                            "
                          />
                        </div>

                        {mostrarResultadosPersonal &&
                          personalFiltrado.length >
                            0 && (
                          <div
                            className="
                              absolute
                              left-0
                              right-0
                              top-full
                              mt-1
                              z-40
                              max-h-60
                              overflow-y-auto
                              bg-white
                              border
                              border-gray-300
                              rounded-lg
                              shadow-xl
                            "
                          >
                            {personalFiltrado.map(
                              persona => (
                                <button
                                  key={
                                    persona.id
                                  }
                                  type="button"
                                  onClick={() =>
                                    seleccionarPersonal(
                                      persona
                                    )
                                  }
                                  className="
                                    w-full
                                    text-left
                                    px-3
                                    py-2.5
                                    border-b
                                    border-gray-100
                                    hover:bg-blue-50
                                  "
                                >
                                  <div
                                    className="
                                      text-[10px]
                                      font-black
                                      text-gray-800
                                    "
                                  >
                                    {mayusculas(
                                      nombreCompletoPersonal(
                                        persona
                                      )
                                    )}
                                  </div>

                                  <div
                                    className="
                                      text-[9px]
                                      text-gray-500
                                      mt-0.5
                                    "
                                  >
                                    {persona
                                      ?.tipo_documento ||
                                      'CC'}

                                    {' '}

                                    {persona
                                      ?.documento ||
                                      '-'}

                                    {' · '}

                                    {mayusculas(
                                      persona?.cargo ||
                                      persona
                                        ?.tipo_personal
                                    ) ||
                                      'SIN CARGO'}
                                  </div>
                                </button>
                              )
                            )}
                          </div>
                        )}

                        {form.personal_id && (
                          <div
                            className="
                              mt-2
                              border
                              border-blue-200
                              bg-blue-50
                              rounded-lg
                              p-3
                            "
                          >
                            <div
                              className="
                                text-xs
                                font-black
                                text-blue-900
                              "
                            >
                              {form.beneficiario}
                            </div>

                            <div
                              className="
                                text-[9px]
                                text-blue-700
                                mt-1
                              "
                            >
                              {
                                form
                                  .tipo_documento_beneficiario
                              }

                              {' '}

                              {
                                form
                                  .documento_beneficiario
                              }

                              {form
                                .cargo_beneficiario && (
                                <>
                                  {' · '}

                                  {
                                    form
                                      .cargo_beneficiario
                                  }
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TERCERO */}

                    {form.tipo_beneficiario ===
                      'TERCERO' && (
                      <>
                        <CampoInput
                          label="Nombre / Razón social"
                          value={
                            form.beneficiario
                          }
                          onChange={
                            value =>
                              setForm(
                                actual => ({
                                  ...actual,

                                  beneficiario:
                                    mayusculas(
                                      value
                                    ),
                                })
                              )
                          }
                        />

                        <div
                          className="
                            grid
                            grid-cols-3
                            gap-2
                          "
                        >
                          <CampoSelect
                            label="Tipo"
                            value={
                              form
                                .tipo_documento_beneficiario
                            }
                            onChange={
                              value =>
                                setForm(
                                  actual => ({
                                    ...actual,

                                    tipo_documento_beneficiario:
                                      value,
                                  })
                                )
                            }
                            options={[
                              {
                                value:
                                  'CC',

                                label:
                                  'CC',
                              },

                              {
                                value:
                                  'CE',

                                label:
                                  'CE',
                              },

                              {
                                value:
                                  'PASAPORTE',

                                label:
                                  'PASAPORTE',
                              },

                              {
                                value:
                                  'NIT',

                                label:
                                  'NIT',
                              },
                            ]}
                          />

                          <div
                            className="
                              col-span-2
                            "
                          >
                            <CampoInput
                              label="Documento"
                              value={
                                form
                                  .documento_beneficiario
                              }
                              onChange={
                                value =>
                                  setForm(
                                    actual => ({
                                      ...actual,

                                      documento_beneficiario:
                                        value,
                                    })
                                  )
                              }
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </Seccion>

                  {/* =======================================
                      VEHÍCULO
                  ======================================= */}

                  {requiereVehiculo && (
                    <Seccion
                      titulo="Vehículo asociado"
                      icono="fas fa-car"
                    >
                      <div
                        className="
                          bg-amber-50
                          border
                          border-amber-200
                          rounded-lg
                          p-2.5
                          text-[9px]
                          text-amber-800
                        "
                      >
                        <i className="fas fa-circle-info mr-2"></i>

                        Este concepto requiere seleccionar el vehículo.
                      </div>

                      <div
                        className="
                          relative
                        "
                      >
                        <label
                          className="
                            block
                            text-[10px]
                            font-semibold
                            text-gray-600
                            mb-1
                          "
                        >
                          Buscar placa
                        </label>

                        <input
                          type="text"
                          value={
                            buscarVehiculo
                          }
                          onFocus={() =>
                            setMostrarResultadosVehiculo(
                              true
                            )
                          }
                          onChange={
                            e => {
                              setBuscarVehiculo(
                                mayusculas(
                                  e.target.value
                                )
                              )

                              setMostrarResultadosVehiculo(
                                true
                              )
                            }
                          }
                          placeholder="Digite placa, marca o línea..."
                          className="
                            w-full
                            border
                            border-gray-300
                            rounded-lg
                            px-3
                            py-2
                            text-xs
                            uppercase
                          "
                        />

                        {mostrarResultadosVehiculo &&
                          vehiculosFiltrados.length >
                            0 && (
                          <div
                            className="
                              absolute
                              left-0
                              right-0
                              top-full
                              mt-1
                              z-40
                              max-h-60
                              overflow-y-auto
                              bg-white
                              border
                              border-gray-300
                              rounded-lg
                              shadow-xl
                            "
                          >
                            {vehiculosFiltrados.map(
                              vehiculo => (
                                <button
                                  key={
                                    vehiculo.id
                                  }
                                  type="button"
                                  onClick={() =>
                                    seleccionarVehiculo(
                                      vehiculo
                                    )
                                  }
                                  className="
                                    w-full
                                    text-left
                                    px-3
                                    py-2.5
                                    border-b
                                    border-gray-100
                                    hover:bg-blue-50
                                  "
                                >
                                  <div
                                    className="
                                      text-[11px]
                                      font-black
                                      text-gray-800
                                    "
                                  >
                                    {mayusculas(
                                      vehiculo.placa
                                    )}
                                  </div>

                                  <div
                                    className="
                                      text-[9px]
                                      text-gray-500
                                      mt-0.5
                                    "
                                  >
                                    {[
                                      vehiculo
                                        ?.tipo_vehiculo,
                                      vehiculo
                                        ?.marca,
                                      vehiculo
                                        ?.linea,
                                      vehiculo
                                        ?.modelo,
                                    ]
                                      .filter(
                                        Boolean
                                      )
                                      .join(
                                        ' · '
                                      )}
                                  </div>
                                </button>
                              )
                            )}
                          </div>
                        )}

                        {form.vehiculo_id && (
                          <div
                            className="
                              mt-2
                              border
                              border-blue-200
                              bg-blue-50
                              rounded-lg
                              p-3
                              text-xs
                              font-black
                              text-blue-900
                            "
                          >
                            <i className="fas fa-car mr-2"></i>

                            {form.placa}
                          </div>
                        )}
                      </div>
                    </Seccion>
                  )}

                  {/* =======================================
                      PAGO
                  ======================================= */}

                  <Seccion
                    titulo="Información del pago"
                    icono="fas fa-wallet"
                  >
                    <CampoSelect
                      label="Medio de pago"
                      value={
                        form.medio_pago_id
                      }
                      onChange={
                        value =>
                          setForm(
                            actual => ({
                              ...actual,

                              medio_pago_id:
                                value,
                            })
                          )
                      }
                      options={
                        mediosVisibles.map(
                          item => ({
                            value:
                              item.id,

                            label:
                              mayusculas(
                                item.nombre
                              ),
                          })
                        )
                      }
                    />

                    <div
                      className="
                        grid
                        grid-cols-2
                        gap-2
                      "
                    >
                      <CampoInput
                        label="Número de factura"
                        value={
                          form.numero_factura
                        }
                        onChange={
                          value =>
                            setForm(
                              actual => ({
                                ...actual,

                                numero_factura:
                                  value,
                              })
                            )
                        }
                        placeholder="Opcional"
                      />

                      <CampoInput
                        label="Referencia pago"
                        value={
                          form.referencia_pago
                        }
                        onChange={
                          value =>
                            setForm(
                              actual => ({
                                ...actual,

                                referencia_pago:
                                  value,
                              })
                            )
                        }
                        placeholder="Opcional"
                      />
                    </div>

                    <div
                      className="
                        bg-gray-50
                        border
                        border-gray-200
                        rounded-lg
                        p-2.5
                        text-[9px]
                        text-gray-500
                      "
                    >
                      La factura y la referencia pueden registrarse posteriormente;
                      no son obligatorias para realizar el desembolso.
                    </div>

                    <CampoTextarea
                      label="Observaciones"
                      value={
                        form.observaciones
                      }
                      onChange={
                        value =>
                          setForm(
                            actual => ({
                              ...actual,

                              observaciones:
                                mayusculas(
                                  value
                                ),
                            })
                          )
                      }
                    />
                  </Seccion>

                  {/* =======================================
                      BOTÓN PRINCIPAL
                  ======================================= */}

                  <button
                    type="button"
                    onClick={
                      registrarEgreso
                    }
                    disabled={
                      procesando
                    }
                    className="
                      w-full
                      bg-red-600
                      hover:bg-red-700
                      disabled:opacity-50
                      text-white
                      rounded-lg
                      py-3
                      text-xs
                      font-black
                    "
                  >
                    {procesando ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>

                        REGISTRANDO...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-2"></i>

                        REGISTRAR EGRESO
                      </>
                    )}
                  </button>
                </>
              )}
            </>
          )}

          {/* ===============================================
              ADMINISTRAR CONCEPTOS
          =============================================== */}

          {pestana ===
            'CONCEPTOS' && (
            <>
              {/* ===========================================
                  FORMULARIO CONCEPTO
              =========================================== */}

              <div
                id="formulario-concepto-egreso"
                className="
                  border
                  border-gray-300
                  rounded-xl
                  overflow-hidden
                  scroll-mt-32
                "
              >
                <div
                  className="
                    bg-slate-800
                    text-white
                    px-3
                    py-2
                    flex
                    justify-between
                    items-center
                    gap-2
                  "
                >
                  <span
                    className="
                      text-[10px]
                      font-bold
                    "
                  >
                    {editandoConcepto
                      ? `Editando: ${mayusculas(
                          editandoConcepto.nombre
                        )}`
                      : 'Nuevo concepto de egreso'}
                  </span>

                  {editandoConcepto && (
                    <button
                      type="button"
                      onClick={
                        nuevoConcepto
                      }
                      className="
                        text-[9px]
                        font-black
                      "
                    >
                      CANCELAR
                    </button>
                  )}
                </div>

                <div
                  className="
                    p-3
                    space-y-3
                  "
                >
                  <CampoInput
                    label="Nombre"
                    value={
                      formConcepto.nombre
                    }
                    onChange={
                      value =>
                        setFormConcepto(
                          actual => ({
                            ...actual,

                            nombre:
                              mayusculas(
                                value
                              ),
                          })
                        )
                    }
                    placeholder="Ej. COMBUSTIBLE"
                  />

                  <CampoTextarea
                    label="Descripción"
                    value={
                      formConcepto.descripcion
                    }
                    onChange={
                      value =>
                        setFormConcepto(
                          actual => ({
                            ...actual,

                            descripcion:
                              value,
                          })
                        )
                    }
                    placeholder="Descripción del concepto..."
                  />

                  <CampoSelect
                    label="Naturaleza"
                    value={
                      formConcepto.naturaleza
                    }
                    onChange={
                      value =>
                        setFormConcepto(
                          actual => ({
                            ...actual,

                            naturaleza:
                              value,
                          })
                        )
                    }
                    options={[
                      {
                        value:
                          'EGRESO',

                        label:
                          'EGRESO',
                      },

                      {
                        value:
                          'AMBOS',

                        label:
                          'AMBOS',
                      },
                    ]}
                  />

                  <label
                    className="
                      flex
                      items-start
                      gap-2
                      border
                      border-gray-200
                      rounded-lg
                      px-3
                      py-2.5
                      cursor-pointer
                    "
                  >
                    <input
                      type="checkbox"
                      checked={
                        formConcepto
                          .requiere_vehiculo
                      }
                      onChange={
                        e =>
                          setFormConcepto(
                            actual => ({
                              ...actual,

                              requiere_vehiculo:
                                e.target.checked,
                            })
                          )
                      }
                      className="
                        mt-0.5
                      "
                    />

                    <div>
                      <div
                        className="
                          text-[10px]
                          font-black
                          text-gray-700
                        "
                      >
                        Requiere vehículo
                      </div>

                      <div
                        className="
                          text-[9px]
                          text-gray-500
                          mt-0.5
                        "
                      >
                        Solicita seleccionar una placa al registrar el egreso.
                      </div>
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={
                      guardarConcepto
                    }
                    disabled={
                      procesando
                    }
                    className="
                      w-full
                      bg-blue-600
                      hover:bg-blue-700
                      disabled:opacity-50
                      text-white
                      rounded-lg
                      py-2.5
                      text-[10px]
                      font-black
                    "
                  >
                    <i className="fas fa-save mr-2"></i>

                    {editandoConcepto
                      ? 'GUARDAR CAMBIOS'
                      : 'AGREGAR CONCEPTO'}
                  </button>
                </div>
              </div>

              {/* ===========================================
                  LISTADO CONCEPTOS
              =========================================== */}

              <div
                className="
                  border
                  border-gray-300
                  rounded-xl
                  overflow-hidden
                "
              >
                <div
                  className="
                    bg-gray-100
                    px-3
                    py-2
                    flex
                    justify-between
                    items-center
                  "
                >
                  <span
                    className="
                      text-[10px]
                      font-black
                      text-gray-700
                    "
                  >
                    Conceptos registrados
                  </span>

                  <span
                    className="
                      text-[9px]
                      text-gray-500
                    "
                  >
                    {conceptosAdmin.length}
                    {' '}
                    registro(s)
                  </span>
                </div>

                {conceptosAdmin.length ===
                0 ? (
                  <div
                    className="
                      p-8
                      text-center
                      text-xs
                      text-gray-500
                    "
                  >
                    No hay conceptos de egreso registrados.
                  </div>
                ) : (
                  <div
                    className="
                      divide-y
                      divide-gray-200
                    "
                  >
                    {conceptosAdmin.map(
                      item => (
                        <div
                          key={
                            item.id
                          }
                          className="
                            p-3
                            flex
                            justify-between
                            items-start
                            gap-3
                          "
                        >
                          <div
                            className="
                              min-w-0
                            "
                          >
                            <div
                              className="
                                text-[10px]
                                font-black
                                text-gray-800
                              "
                            >
                              {mayusculas(
                                item.nombre
                              )}
                            </div>

                            {item.descripcion && (
                              <div
                                className="
                                  text-[9px]
                                  text-gray-500
                                  mt-1
                                "
                              >
                                {item.descripcion}
                              </div>
                            )}

                            <div
                              className="
                                flex
                                flex-wrap
                                gap-1
                                mt-2
                              "
                            >
                              <Etiqueta>
                                {mayusculas(
                                  item.naturaleza
                                )}
                              </Etiqueta>

                              {item.requiere_vehiculo && (
                                <Etiqueta>
                                  REQUIERE VEHÍCULO
                                </Etiqueta>
                              )}
                            </div>

                            <div
                              className={`
                                text-[9px]
                                font-black
                                mt-2
                                ${
                                  item.activo
                                    ? 'text-emerald-700'
                                    : 'text-red-600'
                                }
                              `}
                            >
                              {item.activo
                                ? 'ACTIVO'
                                : 'INACTIVO'}
                            </div>
                          </div>

                          <div
                            className="
                              flex
                              flex-col
                              sm:flex-row
                              gap-1
                              shrink-0
                            "
                          >
                            <button
                              type="button"
                              onClick={() =>
                                editarConcepto(
                                  item
                                )
                              }
                              disabled={
                                procesando
                              }
                              className="
                                border
                                border-blue-200
                                text-blue-700
                                hover:bg-blue-50
                                rounded-md
                                px-2
                                py-1.5
                                text-[9px]
                                font-bold
                              "
                            >
                              <i className="fas fa-pen mr-1"></i>

                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                cambiarEstadoConcepto(
                                  item
                                )
                              }
                              disabled={
                                procesando
                              }
                              className={`
                                border
                                rounded-md
                                px-2
                                py-1.5
                                text-[9px]
                                font-bold
                                ${
                                  item.activo
                                    ? 'border-red-200 text-red-700 hover:bg-red-50'
                                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                }
                              `}
                            >
                              <i
                                className={`
                                  fas
                                  ${
                                    item.activo
                                      ? 'fa-ban'
                                      : 'fa-check'
                                  }
                                  mr-1
                                `}
                              ></i>

                              {item.activo
                                ? 'Desactivar'
                                : 'Activar'}
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

// =========================================================
// SECCIÓN
// =========================================================

function Seccion({
  titulo,
  icono,
  children,
}) {
  return (
    <div
      className="
        border
        border-gray-300
        rounded-xl
        overflow-visible
      "
    >
      <div
        className="
          bg-slate-800
          text-white
          px-3
          py-2
          text-[10px]
          font-bold
          rounded-t-xl
        "
      >
        <i
          className={`
            ${icono}
            mr-2
          `}
        ></i>

        {titulo}
      </div>

      <div
        className="
          p-3
          space-y-3
          bg-white
          rounded-b-xl
        "
      >
        {children}
      </div>
    </div>
  )
}

// =========================================================
// BOTÓN TIPO
// =========================================================

function BotonTipo({
  activo,
  titulo,
  subtitulo,
  icono,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`
        border
        rounded-xl
        p-3
        text-left
        transition
        ${
          activo
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-white hover:bg-gray-50'
        }
      `}
    >
      <div
        className="
          flex
          items-center
          gap-2
        "
      >
        <i
          className={`
            ${icono}
            ${
              activo
                ? 'text-blue-700'
                : 'text-gray-500'
            }
          `}
        ></i>

        <span
          className="
            text-[10px]
            font-black
            text-gray-800
          "
        >
          {titulo}
        </span>
      </div>

      <div
        className="
          text-[9px]
          text-gray-500
          mt-1
        "
      >
        {subtitulo}
      </div>
    </button>
  )
}

// =========================================================
// DATO RESUMEN
// =========================================================

function DatoResumen({
  label,
  value,
}) {
  return (
    <div>
      <div
        className="
          text-[8px]
          uppercase
          font-bold
          text-gray-500
        "
      >
        {label}
      </div>

      <div
        className="
          text-xs
          font-black
          text-gray-800
          mt-0.5
        "
      >
        {texto(
          value
        ) ||
          '-'}
      </div>
    </div>
  )
}

// =========================================================
// ETIQUETA
// =========================================================

function Etiqueta({
  children,
}) {
  return (
    <span
      className="
        inline-flex
        rounded-full
        bg-gray-100
        border
        border-gray-200
        px-2
        py-0.5
        text-[8px]
        font-bold
        text-gray-600
      "
    >
      {children}
    </span>
  )
}

// =========================================================
// INPUT
// =========================================================

function CampoInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  inputMode,
}) {
  return (
    <div>
      <label
        className="
          block
          text-[10px]
          font-semibold
          text-gray-600
          mb-1
        "
      >
        {label}
      </label>

      <input
        type={
          type
        }
        inputMode={
          inputMode
        }
        value={
          value
        }
        onChange={
          e =>
            onChange(
              e.target.value
            )
        }
        placeholder={
          placeholder
        }
        className="
          w-full
          border
          border-gray-300
          rounded-lg
          px-3
          py-2
          text-xs
        "
      />
    </div>
  )
}

// =========================================================
// SELECT
// =========================================================

function CampoSelect({
  label,
  value,
  onChange,
  options = [],
}) {
  return (
    <div>
      <label
        className="
          block
          text-[10px]
          font-semibold
          text-gray-600
          mb-1
        "
      >
        {label}
      </label>

      <select
        value={
          value
        }
        onChange={
          e =>
            onChange(
              e.target.value
            )
        }
        className="
          w-full
          border
          border-gray-300
          rounded-lg
          px-3
          py-2
          text-xs
          bg-white
        "
      >
        <option value="">
          Seleccione...
        </option>

        {options.map(
          item => (
            <option
              key={
                item.value
              }
              value={
                item.value
              }
            >
              {item.label}
            </option>
          )
        )}
      </select>
    </div>
  )
}

// =========================================================
// TEXTAREA
// =========================================================

function CampoTextarea({
  label,
  value,
  onChange,
  placeholder = '',
}) {
  return (
    <div>
      <label
        className="
          block
          text-[10px]
          font-semibold
          text-gray-600
          mb-1
        "
      >
        {label}
      </label>

      <textarea
        rows={3}
        value={
          value
        }
        onChange={
          e =>
            onChange(
              e.target.value
            )
        }
        placeholder={
          placeholder
        }
        className="
          w-full
          border
          border-gray-300
          rounded-lg
          px-3
          py-2
          text-xs
          resize-none
        "
      />
    </div>
  )
}