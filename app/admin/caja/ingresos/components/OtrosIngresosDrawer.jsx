// app/admin/caja/ingresos/components/OtrosIngresosDrawer.jsx
'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  imprimirReciboOtrosIngresos,
} from './imprimirReciboOtrosIngresos'

import {
  BotonGuardar,
  BotonAgregar,
  BotonEditar,
  BotonActualizar,
  BotonCancelar,
  BotonLimpiar,
  BotonImprimir,
  BotonAccion,
  ContenedorModulo,
  MarcoTabla,
  ESTILO_SECCIONES,
  ESTILO_SECCIONES_SECUNDARIAS,
} from '@/components/admin/EstiloModulo'

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

function formatearFecha(
  fecha
) {
  if (
    !fecha
  ) {
    return '-'
  }

  try {
    return new Intl.DateTimeFormat(
      'es-CO',
      {
        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',

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

function escaparHtml(
  valor
) {
  return String(
    valor ?? ''
  )
    .replaceAll(
      '&',
      '&amp;'
    )
    .replaceAll(
      '<',
      '&lt;'
    )
    .replaceAll(
      '>',
      '&gt;'
    )
    .replaceAll(
      '"',
      '&quot;'
    )
    .replaceAll(
      "'",
      '&#039;'
    )
}

function nombreCompletoMatricula(
  matricula
) {
  return (
    matricula?.nombre_completo ||
    [
      matricula?.nombres,
      matricula?.apellidos,
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

function categoriasMatricula(
  matricula
) {
  const categorias =
    Array.isArray(
      matricula?.categorias
    )
      ? matricula.categorias
      : []

  if (
    categorias.length >
    0
  ) {
    return categorias
      .map(
        item =>
          mayusculas(
            item
          )
      )
      .filter(
        Boolean
      )
      .join(
        ' / '
      )
  }

  return (
    matricula?.categoria ||
    '-'
  )
}

function nombreMedioPagoVisible(
  nombre
) {
  const valor =
    mayusculas(
      nombre
    )

  if (
    [
      'TARJETA CREDITO',
      'TARJETA CRÉDITO',
      'TARJETA DE CREDITO',
      'TARJETA DE CRÉDITO',
      'CREDITO',
      'CRÉDITO',
    ].includes(
      valor
    )
  ) {
    return 'CREDITO'
  }

  if (
    [
      'TARJETA DEBITO',
      'TARJETA DÉBITO',
      'TARJETA DE DEBITO',
      'TARJETA DE DÉBITO',
      'DEBITO',
      'DÉBITO',
    ].includes(
      valor
    )
  ) {
    return 'DEBITO'
  }

  if (
    [
      'EFECTIVO',
      'NEQUI',
      'DAVIPLATA',
      'PSE',
      'TRANSFERENCIA',
      'OTRO',
    ].includes(
      valor
    )
  ) {
    return valor
  }

  return valor
}

async function fetchJsonSeguro(
  url
) {
  const response =
    await fetch(
      url,
      {
        cache:
          'no-store',
      }
    )

  const respuestaTexto =
    await response.text()

  let data

  try {
    data =
      respuestaTexto
        ? JSON.parse(
            respuestaTexto
          )
        : {}
  } catch {
    console.error(
      'API NO JSON:',
      url,
      respuestaTexto
        .slice(
          0,
          1000
        )
    )

    throw new Error(
      'El servidor devolvió una respuesta no válida.'
    )
  }

  if (
    !response.ok ||
    data?.status ===
      'error'
  ) {
    throw new Error(
      data?.message ||
      data?.error ||
      `Error HTTP ${response.status}`
    )
  }

  return data
}

// =========================================================
// COMPONENTE
// =========================================================

export default function OtrosIngresosDrawer({
  abierto,
  onCerrar,
  empresaNombre,
  conceptos = [],
  mediosPago = [],
  postCaja,
  construirUrl,
  onActualizado,
}) {
  const [
    pestana,
    setPestana,
  ] =
    useState(
      'REGISTRAR'
    )

  const [
    tipoIngreso,
    setTipoIngreso,
  ] =
    useState(
      'LIBRE'
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

  // =======================================================
  // FORMULARIO INGRESO
  // =======================================================

  const [
    form,
    setForm,
  ] =
    useState({
      concepto_id:
        '',

      nombre_cliente:
        '',

      tipo_documento_cliente:
        'CC',

      documento_cliente:
        '',

      celular_cliente:
        '',

      correo_cliente:
        '',

      categoria:
        '',

      cantidad_clases_refuerzo:
        '',

      descripcion:
        '',

      valor:
        '',

      medio_pago_id:
        '',

      referencia_pago:
        '',

      observaciones:
        '',
    })

  // =======================================================
  // APRENDIZ
  // =======================================================

  const [
    busquedaAprendiz,
    setBusquedaAprendiz,
  ] =
    useState('')

  const [
    buscandoAprendiz,
    setBuscandoAprendiz,
  ] =
    useState(
      false
    )

  const [
    resultadosAprendiz,
    setResultadosAprendiz,
  ] =
    useState([])

  const [
    matriculaSeleccionada,
    setMatriculaSeleccionada,
  ] =
    useState(
      null
    )

  const [
    clienteSeleccionado,
    setClienteSeleccionado,
  ] =
    useState(
      null
    )

  // =======================================================
  // CONCEPTOS
  // =======================================================

  const [
    conceptosAdmin,
    setConceptosAdmin,
  ] =
    useState([])

  const [
    cargandoConceptos,
    setCargandoConceptos,
  ] =
    useState(
      false
    )

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
    useState({
      nombre:
        '',

      descripcion:
        '',

      naturaleza:
        'INGRESO',

      requiere_aprendiz:
        false,
    })

    // =======================================================
// HISTORIAL / REIMPRESIÓN
// =======================================================

const [
  historialIngresos,
  setHistorialIngresos,
] = useState([])

const [
  cargandoHistorial,
  setCargandoHistorial,
] = useState(false)

const [
  buscarHistorial,
  setBuscarHistorial,
] = useState('')

const [
  fechaInicioHistorial,
  setFechaInicioHistorial,
] = useState(
  hoyColombia()
)

const [
  modalConceptoAbierto,
  setModalConceptoAbierto,
] = useState(false)

const [
  fechaFinHistorial,
  setFechaFinHistorial,
] = useState(
  hoyColombia()
)

  // =======================================================
  // CONCEPTOS DISPONIBLES
  // =======================================================

  const conceptosIngreso =
    useMemo(
      () => {
        return (
          Array.isArray(
            conceptos
          )
            ? conceptos
            : []
        ).filter(
          item => {
            const nombre =
              mayusculas(
                item?.nombre
              )
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ')
                .trim()

            const esCurso =
              nombre === 'CURSO' ||
              nombre.startsWith('CURSO ')

            return (
              item?.activo !== false &&
              [
                'INGRESO',
                'AMBOS',
              ].includes(
                mayusculas(
                  item?.naturaleza
                )
              ) &&
              !esCurso
            )
          }
        )
      },
      [
        conceptos,
      ]
    )

    const conceptoSeleccionado =
  useMemo(
    () => {
      return conceptosIngreso.find(
        item =>
          String(
            item?.id
          ) ===
          String(
            form.concepto_id
          )
      ) || null
    },
    [
      conceptosIngreso,
      form.concepto_id,
    ]
  )

  const esRefuerzoPractico =
    useMemo(
      () => {
        return mayusculas(
          conceptoSeleccionado?.nombre
        )
          .normalize(
            'NFD'
          )
          .replace(
            /[\u0300-\u036f]/g,
            ''
          )
          .replace(
            /\s+/g,
            ' '
          )
          .trim() ===
          'REFUERZO PRACTICO'
      },
      [
        conceptoSeleccionado,
      ]
    )

  // =======================================================
  // MEDIOS
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
          .map(
            item => ({
              ...item,

              nombre_visible:
                nombreMedioPagoVisible(
                  item?.nombre
                ),
            })
          )
          .filter(
            item =>
              item.nombre_visible &&
              mayusculas(
                item.nombre_visible
              ) !==
              'CONSIGNACION'
          )
      },
      [
        mediosPago,
      ]
    )

  // =======================================================
  // REINICIAR
  // =======================================================

  function reiniciarIngreso() {
    setTipoIngreso(
      'LIBRE'
    )

    setForm({
      concepto_id:
        '',

      nombre_cliente:
        '',

      tipo_documento_cliente:
        'CC',

      documento_cliente:
        '',

      celular_cliente:
        '',

      correo_cliente:
        '',

      categoria:
        '',

      cantidad_clases_refuerzo:
        '',

      descripcion:
        '',

      valor:
        '',

      medio_pago_id:
        '',

      referencia_pago:
        '',

      observaciones:
        '',
    })

    setBusquedaAprendiz('')
    setResultadosAprendiz([])
    setMatriculaSeleccionada(
      null
    )
    setClienteSeleccionado(
      null
    )
  }

  useEffect(
    () => {
      if (
        abierto
      ) {
        setError('')
        setMensaje('')
        setPestana(
          'REGISTRAR'
        )
        reiniciarIngreso()
      }
    },
    [
      abierto,
    ]
  )

  // =======================================================
  // BUSCAR APRENDIZ
  // =======================================================

  useEffect(
    () => {
      if (
        !abierto
      ) {
        return
      }

      if (
        texto(
          busquedaAprendiz
        ).length <
        2
      ) {
        setResultadosAprendiz(
          []
        )
        setBuscandoAprendiz(
          false
        )

        return
      }

      const timer =
        setTimeout(
          async () => {
            try {
              setBuscandoAprendiz(
                true
              )

              const data =
                await fetchJsonSeguro(
                  construirUrl(
                    'buscar_clientes',
                    {
                      q:
                        busquedaAprendiz,
                    }
                  )
                )

              const resultados =
                Array.isArray(
                  data?.data
                )
                  ? data.data
                  : []

              const documentoBuscado =
                texto(
                  busquedaAprendiz
                )

              const coincidenciaExacta =
                resultados.find(
                  item =>
                    texto(
                      item?.documento
                    ) ===
                    documentoBuscado
                ) || null

              setResultadosAprendiz(
                []
              )

              if (
                coincidenciaExacta
              ) {
                seleccionarCliente(
                  coincidenciaExacta
                )
              }
            } catch (
              errorBusqueda
            ) {
              setError(
                errorBusqueda.message
              )
            } finally {
              setBuscandoAprendiz(
                false
              )
            }
          },
          350
        )

      return () =>
        clearTimeout(
          timer
        )
    },
    [
      abierto,
      tipoIngreso,
      busquedaAprendiz,
      construirUrl,
    ]
  )

  useEffect(
    () => {
      if (
        !clienteSeleccionado
      ) {
        return
      }

      if (
        texto(
          form.documento_cliente
        ) !==
        texto(
          clienteSeleccionado?.documento
        )
      ) {
        setClienteSeleccionado(
          null
        )
        setMatriculaSeleccionada(
          null
        )
        setTipoIngreso(
          'LIBRE'
        )
        setForm(
          actual => ({
            ...actual,
            tipo_documento_cliente:
              'CC',
            nombre_cliente:
              '',
            celular_cliente:
              '',
            correo_cliente:
              '',
          })
        )
      }
    },
    [
      form.documento_cliente,
      clienteSeleccionado,
    ]
  )

  // =======================================================
  // CARGAR CONCEPTOS ADMIN
  // =======================================================

  async function cargarConceptosAdmin() {
    try {
      setCargandoConceptos(
        true
      )

      setError('')

      const data =
        await fetchJsonSeguro(
          construirUrl(
            'conceptos',
            {
              todos:
                '1',
            }
          )
        )

      setConceptosAdmin(
        Array.isArray(
          data?.data
        )
          ? data.data
          : []
      )
    } catch (
      errorCarga
    ) {
      setError(
        errorCarga.message
      )

      setConceptosAdmin(
        conceptos ||
        []
      )
    } finally {
      setCargandoConceptos(
        false
      )
    }
  }

  useEffect(
    () => {
      if (
        abierto &&
        pestana ===
          'CONCEPTOS'
      ) {
        cargarConceptosAdmin()
      }
    },
    [
      abierto,
      pestana,
    ]
  )

   // =======================================================
// CARGAR HISTORIAL DE INGRESOS LIBRES
// =======================================================

async function cargarHistorialIngresos() {
  try {
    setCargandoHistorial(
      true
    )

    setError('')

    const data =
      await fetchJsonSeguro(
        construirUrl(
          'ingresos_libres',
          {
            buscar:
              buscarHistorial,

            fecha_inicio:
              fechaInicioHistorial,

            fecha_fin:
              fechaFinHistorial,
          }
        )
      )

    setHistorialIngresos(
      Array.isArray(
        data?.data
      )
        ? data.data
        : []
    )
  } catch (
    errorHistorial
  ) {
    console.error(
      'Error consultando ingresos libres:',
      errorHistorial
    )

    setError(
      errorHistorial?.message ||
      'No fue posible consultar el historial de ingresos.'
    )

    setHistorialIngresos(
      []
    )
  } finally {
    setCargandoHistorial(
      false
    )
  }
}

useEffect(
  () => {
    if (
      !abierto ||
      pestana !==
        'HISTORIAL'
    ) {
      return
    }

    const timer =
      setTimeout(
        () => {
          cargarHistorialIngresos()
        },
        350
      )

    return () =>
      clearTimeout(
        timer
      )
  },
  [
    abierto,
    pestana,
    buscarHistorial,
    fechaInicioHistorial,
    fechaFinHistorial,
  ]
)

function limpiarHistorial() {
  setBuscarHistorial('')
  setFechaInicioHistorial(
    hoyColombia()
  )
  setFechaFinHistorial(
    hoyColombia()
  )
}

  // =======================================================
  // SELECCIONAR MATRÍCULA
  // =======================================================

  function seleccionarCliente(
    cliente
  ) {
    const esAprendiz =
      cliente?.tipo_cliente ===
      'APRENDIZ'

    setTipoIngreso(
      esAprendiz
        ? 'APRENDIZ'
        : 'LIBRE'
    )

    setMatriculaSeleccionada(
      esAprendiz
        ? {
            ...cliente,
            tipo_doc:
              cliente.tipo_documento ||
              cliente.tipo_doc ||
              'CC',
          }
        : null
    )

    setBusquedaAprendiz('')
    setResultadosAprendiz([])
    setClienteSeleccionado(
      cliente
    )

    setForm(
      actual => ({
        ...actual,

        nombre_cliente:
          mayusculas(
            cliente?.nombre_completo ||
            ''
          ),

        tipo_documento_cliente:
          mayusculas(
            cliente?.tipo_documento ||
            cliente?.tipo_doc ||
            'CC'
          ),

        documento_cliente:
          texto(
            cliente?.documento
          ),

        celular_cliente:
          texto(
            cliente?.celular
          ),

        correo_cliente:
          texto(
            cliente?.correo
          ),
      })
    )
  }

  // =======================================================
// VALIDAR INGRESO
// =======================================================

function validarIngreso() {
  if (
    !form.concepto_id
  ) {
    return 'Seleccione el concepto.'
  }

  if (
    tipoIngreso ===
      'APRENDIZ' &&
    !matriculaSeleccionada?.id
  ) {
    return 'Seleccione el aprendiz o matrícula.'
  }

  if (
    tipoIngreso ===
      'LIBRE' &&
    !texto(
      form.nombre_cliente
    )
  ) {
    return 'Ingrese el nombre del cliente.'
  }

  if (
    tipoIngreso ===
      'LIBRE' &&
    !texto(
      form.documento_cliente
    )
  ) {
    return 'Ingrese el documento del cliente.'
  }

  // =====================================================
  // VALIDACIONES REFUERZO PRÁCTICO
  // =====================================================

  if (
    tipoIngreso ===
      'LIBRE' &&
    esRefuerzoPractico &&
    !texto(
      form.categoria
    )
  ) {
    return 'Seleccione la categoría de las clases de refuerzo.'
  }

  if (
    tipoIngreso ===
      'LIBRE' &&
    esRefuerzoPractico
  ) {
    const cantidadClases =
      Number(
        form.cantidad_clases_refuerzo
      )

    if (
      !Number.isInteger(
        cantidadClases
      ) ||
      cantidadClases <=
        0
    ) {
      return 'Ingrese una cantidad válida de clases de refuerzo.'
    }
  }

  // =====================================================
  // VALOR
  // =====================================================

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
    return 'Ingrese un valor válido.'
  }

  // =====================================================
  // MEDIO DE PAGO
  // =====================================================

  if (
    !form.medio_pago_id
  ) {
    return 'Seleccione el medio de pago.'
  }

  return ''
}
  // =======================================================
  // REGISTRAR
  // =======================================================

  async function registrarIngreso() {
    const validacion =
      validarIngreso()

    if (
      validacion
    ) {
      setError(
        validacion
      )

      return
    }

    setProcesando(
      true
    )

    setError('')
    setMensaje('')

    try {
      const valor =
        Number(
          form.valor
        )

      const concepto =
        conceptosIngreso.find(
          item =>
            String(
              item.id
            ) ===
            String(
              form.concepto_id
            )
        )

      const medioPago =
        mediosVisibles.find(
          item =>
            String(
              item.id
            ) ===
            String(
              form.medio_pago_id
            )
        )

      let recibo =
        null

      let datosImpresion =
        null

      // ===================================================
      // INGRESO LIBRE
      // ===================================================

      if (
        tipoIngreso ===
        'LIBRE'
      ) {
        const data =
          await postCaja({
            accion:
              'registrar_ingreso_libre',

            concepto_id:
              form.concepto_id,

            nombre_cliente:
              mayusculas(
                form.nombre_cliente
              ),

            tipo_documento_cliente:
              mayusculas(
                form.tipo_documento_cliente
              ),

            documento_cliente:
              texto(
                form.documento_cliente
              ),

            celular_cliente:
              texto(
                form.celular_cliente
              ),

            correo_cliente:
              texto(
                form.correo_cliente
              ),

            categoria:
              esRefuerzoPractico
                ? form.categoria
                : null,

            cantidad_clases_refuerzo:
              esRefuerzoPractico
                ? Number(
                    form.cantidad_clases_refuerzo
                  )
                : null,

            descripcion:
              mayusculas(
                form.descripcion ||
                concepto?.nombre ||
                ''
              ),

            valor,

            medio_pago_id:
              form.medio_pago_id,

            referencia_pago:
              texto(
                form.referencia_pago
              ),

            observaciones:
              texto(
                form.observaciones
              ),

            fecha:
              hoyColombia(),
          })

        recibo =
          data?.data?.recibo ||
          data?.data ||
          null

        datosImpresion = {
          tipo:
            'LIBRE',

          recibo,

          concepto,

          medioPago,

          cliente: {
            nombre:
              mayusculas(
                form.nombre_cliente
              ),

            tipo_documento:
              mayusculas(
                form.tipo_documento_cliente
              ),

            documento:
              texto(
                form.documento_cliente
              ),

            celular:
              texto(
                form.celular_cliente
              ),
          },

          descripcion:
        mayusculas(
          form.descripcion ||
          concepto?.nombre ||
          ''
        ),

      categoria:
        esRefuerzoPractico
          ? form.categoria
          : '',

      cantidad_clases_refuerzo:
        esRefuerzoPractico
          ? Number(
              form.cantidad_clases_refuerzo
            )
          : 0,

      valor,

      referencia:
        texto(
          form.referencia_pago
        ),
                referencia:
                  texto(
                    form.referencia_pago
                  ),

                observaciones:
                  texto(
                    form.observaciones
                  ),
              }
            }

      // ===================================================
      // ASOCIADO A APRENDIZ
      // ===================================================
      //
      // 1. Crea obligación extraordinaria.
      // 2. Registra pago total inmediatamente.
      // 3. Queda contablemente ligado al aprendiz.
      //
      // ===================================================

      if (
        tipoIngreso ===
        'APRENDIZ'
      ) {
        const resultadoCuenta =
          await postCaja({
            accion:
              'crear_cuenta',

            matricula_id:
              matriculaSeleccionada.id,

            concepto_id:
              form.concepto_id,

            valor_total:
              valor,

            descripcion:
              mayusculas(
                form.descripcion ||
                concepto?.nombre ||
                ''
              ),

            observaciones:
              texto(
                form.observaciones
              ),

            fecha:
              hoyColombia(),
          })

        const cuentaId =
          resultadoCuenta
            ?.data
            ?.cuenta
            ?.id ||
          resultadoCuenta
            ?.data
            ?.id

        if (
          !cuentaId
        ) {
          throw new Error(
            'Se creó el concepto, pero no fue posible identificar la obligación generada.'
          )
        }

        const resultadoPago =
          await postCaja({
            accion:
              'registrar_abono',

            cuenta_id:
              cuentaId,

            medio_pago_id:
              form.medio_pago_id,

            valor,

            pagado_por:
              'APRENDIZ',

            nombre_pagador:
              nombreCompletoMatricula(
                matriculaSeleccionada
              ),

            documento_pagador:
              matriculaSeleccionada
                ?.documento ||
              '',

            referencia_pago:
              texto(
                form.referencia_pago
              ),

            descripcion:
              mayusculas(
                form.descripcion ||
                concepto?.nombre ||
                ''
              ),

            observaciones:
              texto(
                form.observaciones
              ),
          })

        recibo =
          resultadoPago
            ?.data
            ?.recibo ||
          null

        datosImpresion = {
          tipo:
            'APRENDIZ',

          recibo,

          concepto,

          medioPago,

          cliente: {
            nombre:
              nombreCompletoMatricula(
                matriculaSeleccionada
              ),

            tipo_documento:
              matriculaSeleccionada
                ?.tipo_doc ||
              '',

            documento:
              matriculaSeleccionada
                ?.documento ||
              '',

            celular:
              matriculaSeleccionada
                ?.celular ||
              '',
          },

          matricula:
            matriculaSeleccionada
              ?.consecutivo ||
            '',

          categorias:
            categoriasMatricula(
              matriculaSeleccionada
            ),

          descripcion:
            mayusculas(
              form.descripcion ||
              concepto?.nombre ||
              ''
            ),

          valor,

          referencia:
            texto(
              form.referencia_pago
            ),

          observaciones:
            texto(
              form.observaciones
            ),
        }
      }

      setMensaje(
        'Ingreso registrado correctamente.'
      )

      if (
        typeof onActualizado ===
        'function'
      ) {
        await onActualizado()
      }

      if (
        datosImpresion
      ) {
        imprimirReciboOtrosIngresos(
          datosImpresion,
          {
            empresaNombre,
          }
        )
      }

      reiniciarIngreso()
    } catch (
      errorRegistro
    ) {
      console.error(
        'Error registrando otros ingresos:',
        errorRegistro
      )

      setError(
        errorRegistro?.message ||
        'No fue posible registrar el ingreso.'
      )
    } finally {
      setProcesando(
        false
      )
    }
  }

  // =======================================================
  // IMPRIMIR
  // =======================================================
  // =======================================================
// REIMPRIMIR INGRESO HISTÓRICO
// =======================================================

function imprimirIngresoHistorico(
  recibo
) {
  if (
    !recibo
  ) {
    setError(
      'No fue posible identificar el recibo.'
    )

    return
  }

  try {
    imprimirReciboOtrosIngresos(
      {
        tipo:
          'LIBRE',

        recibo,

        concepto:
          recibo?.concepto ||
          null,

        medioPago:
          recibo?.medio_pago ||
          null,

        cliente: {
          nombre:
            recibo?.nombre_cliente ||
            recibo?.nombre_pagador ||
            '',

          tipo_documento:
            recibo?.tipo_documento_cliente ||
            '',

          documento:
            recibo?.documento_cliente ||
            recibo?.documento ||
            '',

          celular:
            recibo?.celular_cliente ||
            '',
        },

        descripcion:
          recibo?.descripcion ||
          recibo?.concepto?.nombre ||
          '',

        categoria:
          recibo?.categoria ||
          '',

        cantidad_clases_refuerzo:
          Number(
            recibo
              ?.cantidad_clases_refuerzo ||
            0
          ),

        valor:
          recibo?.valor ||
          0,

        referencia:
          recibo?.referencia_pago ||
          '',

        observaciones:
          recibo?.observaciones ||
          '',
      },
      {
        empresaNombre,
      }
    )
  } catch (
    errorImpresion
  ) {
    console.error(
      'Error reimprimiendo ingreso:',
      errorImpresion
    )

    setError(
      errorImpresion?.message ||
      'No fue posible imprimir el recibo.'
    )
  }
}

  
  const conceptosAdminIngreso =
    useMemo(
      () =>
        conceptosAdmin.filter(
          item =>
            mayusculas(
              item?.naturaleza
            ) === 'INGRESO'
        ),
      [
        conceptosAdmin,
      ]
    )

  // =======================================================
  // CONCEPTOS CRUD
  // =======================================================

  function nuevoConcepto() {
    setEditandoConcepto(
      null
    )

    setFormConcepto({
      nombre:
        '',

      descripcion:
        '',

      naturaleza:
        'INGRESO',

      requiere_aprendiz:
        false,
    })

    setModalConceptoAbierto(
      true
    )
  }

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
        concepto?.descripcion ||
        '',

      naturaleza:
        mayusculas(
          concepto?.naturaleza
        ) ||
        'INGRESO',

      requiere_aprendiz:
        concepto?.requiere_aprendiz ===
        true,
    })

    setModalConceptoAbierto(
      true
    )
  }

  async function guardarConcepto() {
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
        await postCaja({
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
            'INGRESO',

          requiere_aprendiz:
            formConcepto.requiere_aprendiz,
        })

      setMensaje(
        data?.message ||
        'Concepto guardado correctamente.'
      )

      setModalConceptoAbierto(
        false
      )
      setEditandoConcepto(
        null
      )

      await cargarConceptosAdmin()

      if (
        typeof onActualizado ===
        'function'
      ) {
        await onActualizado()
      }
    } catch (
      errorGuardar
    ) {
      setError(
        errorGuardar.message
      )
    } finally {
      setProcesando(
        false
      )
    }
  }

  async function cambiarEstadoConcepto(
    concepto
  ) {
    const activar =
      concepto?.activo !==
      true

    const mensajeConfirmacion =
      activar
        ? `¿Desea activar ${concepto.nombre}?`
        : `¿Desea desactivar ${concepto.nombre}?`

    if (
      !window.confirm(
        mensajeConfirmacion
      )
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
        await postCaja({
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

      await cargarConceptosAdmin()

      if (
        typeof onActualizado ===
        'function'
      ) {
        await onActualizado()
      }
    } catch (
      errorEstado
    ) {
      setError(
        errorEstado.message
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
        flex
        items-center
        justify-center
        p-3
        sm:p-5
      "
    >
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

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Registrar ingresos"
        className="
          relative
          z-10
          w-full
          max-w-[900px]
          max-h-[92vh]
          bg-white
          rounded-xl
          border
          border-gray-300
          shadow-2xl
          overflow-y-auto
        "
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div
          className="
            sticky
            top-0
            z-20
            bg-white
            border-b
            border-gray-300
            rounded-t-xl
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
            style={{
              backgroundColor: ESTILO_SECCIONES.fondo,
              color: ESTILO_SECCIONES.texto,
              borderRadius: ESTILO_SECCIONES.radioSuperior,
            }}
          >
            <div>
              <p
                className="
                  text-[9px]
                  uppercase
                  font-bold
                "
                style={{ color: ESTILO_SECCIONES.subtitulo }}
              >
                <i className="fas fa-cash-register mr-1"></i>
                Caja · Ingresos
              </p>

              <h2
                className="
                  text-lg
                  font-black
                  mt-0.5
                "
              >
                <i className="fas fa-receipt mr-2"></i>
                Otros Ingresos
              </h2>

              <p
                className="
                  text-[10px]
                  mt-1
                "
                style={{ color: ESTILO_SECCIONES.subtitulo }}
              >
                Servicios independientes o conceptos adicionales.
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
    grid-cols-3
    gap-2
    mx-4
    mt-4
    p-1.5
    bg-gray-100
    border
    border-gray-200
    rounded-xl
  "
>
  <button
    type="button"
    onClick={() =>
      setPestana(
        'REGISTRAR'
      )
    }
    className={`
      py-2.5
      px-1
      text-[9px]
      font-black
      transition-all
      duration-200
      hover:-translate-y-0.5
      ${
        pestana ===
        'REGISTRAR'
          ? 'bg-[#3B617D] text-white border border-[#3B617D] rounded-lg shadow-sm'
          : 'bg-white text-[#3B617D] border border-gray-300 rounded-lg hover:bg-[#F1F5F9] hover:border-[#7A9AB4]'
      }
    `}
  >
    <i className="fas fa-dollar-sign mr-1"></i>

    REGISTRAR INGRESO
  </button>

  <button
    type="button"
    onClick={() =>
      setPestana(
        'CONCEPTOS'
      )
    }
    className={`
      py-2.5
      px-1
      text-[9px]
      font-black
      transition-all
      duration-200
      hover:-translate-y-0.5
      ${
        pestana ===
        'CONCEPTOS'
          ? 'bg-[#3B617D] text-white border border-[#3B617D] rounded-lg shadow-sm'
          : 'bg-white text-[#3B617D] border border-gray-300 rounded-lg hover:bg-[#F1F5F9] hover:border-[#7A9AB4]'
      }
    `}
  >
    <i className="fas fa-list mr-1"></i>

    ADMINISTRAR CONCEPTOS
  </button>

  <button
    type="button"
    onClick={() =>
      setPestana(
        'HISTORIAL'
      )
    }
    className={`
      py-2.5
      px-1
      text-[9px]
      font-black
      transition-all
      duration-200
      hover:-translate-y-0.5
      ${
        pestana ===
        'HISTORIAL'
          ? 'bg-[#3B617D] text-white border border-[#3B617D] rounded-lg shadow-sm'
          : 'bg-white text-[#3B617D] border border-gray-300 rounded-lg hover:bg-[#F1F5F9] hover:border-[#7A9AB4]'
      }
    `}
  >
    <i className="fas fa-history mr-1"></i>

    HISTORIAL / REIMPRIMIR
  </button>
</div>
          {/* ===============================================
              MENSAJES
          =============================================== */}

          {error && (
            <div
              className="
                mx-4
                mt-3
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

          {mensaje && (
            <div
              className="
                mx-4
                mt-3
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
              REGISTRAR
          =============================================== */}

          {pestana ===
            'REGISTRAR' && (
            <div
              className="
                grid
                grid-cols-1
                xl:grid-cols-3
                gap-4
                p-4
                items-start
              "
            >
             {/* ===========================================
                  CONCEPTO
              =========================================== */}

              <div
                className="
                  order-2
                  h-full
                  border
                  border-gray-300
                  rounded-xl
                  overflow-hidden
                  bg-white
                "
              >
                <div
                  className="
                    
                    text-white
                    px-3
                    py-2
                    text-[10px]
                    font-bold
                    rounded-t-xl
                  "
                style={{
                    backgroundColor: ESTILO_SECCIONES_SECUNDARIAS.fondo,
                    color: ESTILO_SECCIONES_SECUNDARIAS.texto,
                    borderRadius: ESTILO_SECCIONES_SECUNDARIAS.radioSuperior,
                  }}
                >
                  <i className="fas fa-tags mr-2"></i>
                  Concepto del ingreso
                </div>

                <div
                  className="
                    p-3
                    space-y-3
                  "
                >
                  <CampoSelect
                    label="Concepto"
                    value={
                      form.concepto_id
                    }
                    onChange={
                      value => {
                        const conceptoNuevo =
                          conceptosIngreso.find(
                            item =>
                              String(
                                item.id
                              ) ===
                              String(
                                value
                              )
                          )

                        const nombreNormalizado =
                          mayusculas(
                            conceptoNuevo?.nombre
                          )
                            .normalize(
                              'NFD'
                            )
                            .replace(
                              /[\u0300-\u036f]/g,
                              ''
                            )
                            .replace(
                              /\s+/g,
                              ' '
                            )
                            .trim()

                        const esRefuerzo =
                          nombreNormalizado ===
                          'REFUERZO PRACTICO'

                        setForm(
                          actual => ({
                            ...actual,

                            concepto_id:
                              value,

                            descripcion:
                              conceptoNuevo?.descripcion ||
                              '',

                            categoria:
                              esRefuerzo
                                ? actual.categoria
                                : '',

                            cantidad_clases_refuerzo:
                              esRefuerzo
                                ? actual.cantidad_clases_refuerzo
                                : '',
                          })
                        )
                      }
                    }
                    options={
                      conceptosIngreso.map(
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

                  {/* ===========================================
                      DATOS DE REFUERZO PRÁCTICO
                  =========================================== */}

                  {tipoIngreso ===
                    'LIBRE' &&
                    esRefuerzoPractico && (
                      <div
                        className="
                          border
                          border-blue-300
                          bg-blue-50
                          rounded-lg
                          p-3
                        "
                      >
                        <div
                          className="
                            mb-2
                            text-[9px]
                            font-black
                            text-blue-800
                          "
                        >
                          <i className="fas fa-car-side mr-1"></i>

                          DATOS DEL REFUERZO PRÁCTICO
                        </div>

                        <div
                          className="
                            grid
                            grid-cols-2
                            gap-2
                          "
                        >
                          <CampoSelect
                            label="Categoría"
                            value={
                              form.categoria
                            }
                            onChange={
                              value =>
                                setForm(
                                  actual => ({
                                    ...actual,

                                    categoria:
                                      value,
                                  })
                                )
                            }
                            options={[
                              {
                                value:
                                  'A2',

                                label:
                                  'A2',
                              },

                              {
                                value:
                                  'B1',

                                label:
                                  'B1',
                              },

                              {
                                value:
                                  'C1',

                                label:
                                  'C1',
                              },

                              {
                                value:
                                  'RC1',

                                label:
                                  'RC1',
                              },

                              {
                                value:
                                  'C2',

                                label:
                                  'C2',
                              },

                              {
                                value:
                                  'C3',

                                label:
                                  'C3',
                              },
                            ]}
                          />

                          <CampoInput
                            label="Cantidad de clases"
                            type="number"
                            value={
                              form.cantidad_clases_refuerzo
                            }
                            onChange={
                              value =>
                                setForm(
                                  actual => ({
                                    ...actual,

                                    cantidad_clases_refuerzo:
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
                            placeholder="Ej. 2"
                          />
                        </div>

                        <p
                          className="
                            mt-2
                            text-[8px]
                            leading-relaxed
                            text-blue-700
                          "
                        >
                          Estas clases quedarán disponibles posteriormente
                          en el módulo de Programación.
                        </p>
                      </div>
                    )}

                  <CampoInput
                    label="Valor recibido"
                    prefijo="$"
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
                  />
                </div>
              </div>

              {/* ===========================================
                  CLIENTE
              =========================================== */}

              <div
                className="
                  order-1
                  h-full
                  border
                  border-gray-300
                  rounded-xl
                  overflow-visible
                  bg-white
                "
              >
                  <div
                    className="
                      
                      text-white
                      px-3
                      py-2
                      text-[10px]
                      font-bold
                    "
                  style={{
                    backgroundColor: ESTILO_SECCIONES_SECUNDARIAS.fondo,
                    color: ESTILO_SECCIONES_SECUNDARIAS.texto,
                    borderRadius: ESTILO_SECCIONES_SECUNDARIAS.radioSuperior,
                  }}
                >
                    <i className="fas fa-user mr-2"></i>
                  Datos del cliente
                  </div>

                  <div
                    className="
                      p-3
                      space-y-3
                    "
                  >
                    <div
                      className="
                        grid
                        grid-cols-3
                        gap-2
                        items-start
                      "
                    >
                      <div className="col-span-2 relative">
                        <CampoInput
                          label="Documento"
                          value={
                            form.documento_cliente
                          }
                          onChange={
                            value => {
                              const documento =
                                texto(
                                  value
                                )

                              setForm(
                                actual => ({
                                  ...actual,
                                  documento_cliente:
                                    documento,
                                  tipo_documento_cliente:
                                    'CC',
                                  nombre_cliente:
                                    '',
                                  celular_cliente:
                                    '',
                                  correo_cliente:
                                    '',
                                })
                              )

                              setBusquedaAprendiz(
                                documento
                              )

                              setResultadosAprendiz(
                                []
                              )

                              setTipoIngreso(
                                'LIBRE'
                              )

                              setMatriculaSeleccionada(
                                null
                              )

                              setClienteSeleccionado(
                                null
                              )
                            }
                          }
                          placeholder="Digite el número para buscar..."
                        />

                        {buscandoAprendiz && (
                          <div className="absolute right-3 top-8 text-blue-500">
                            <i className="fas fa-spinner fa-spin"></i>
                          </div>
                        )}

                      </div>

                      <CampoSelect
                        label="Tipo"
                        value={
                          form.tipo_documento_cliente
                        }
                        onChange={
                          value =>
                            setForm(
                              actual => ({
                                ...actual,
                                tipo_documento_cliente:
                                  value,
                              })
                            )
                        }
                        disabled={
                          Boolean(
                            clienteSeleccionado
                          )
                        }
                        options={[
                          { value: 'CC', label: 'CC' },
                          { value: 'CE', label: 'CE' },
                          { value: 'TI', label: 'TI' },
                          { value: 'PASAPORTE', label: 'PASAPORTE' },
                          { value: 'NIT', label: 'NIT' },
                        ]}
                      />
                    </div>

                    <CampoInput
                      label="Nombre del cliente"
                      value={
                        form.nombre_cliente
                      }
                      onChange={
                        value =>
                          setForm(
                            actual => ({
                              ...actual,
                              nombre_cliente:
                                mayusculas(
                                  value
                                ),
                            })
                          )
                      }
                      disabled={
                          Boolean(
                            clienteSeleccionado
                          )
                        }
                      placeholder="Nombre completo"
                    />

                    <div
                      className="
                        grid
                        grid-cols-1
                        gap-2
                      "
                    >
                      <CampoInput
                        label="Celular"
                        value={
                          form.celular_cliente
                        }
                        onChange={
                          value =>
                            setForm(
                              actual => ({
                                ...actual,

                                celular_cliente:
                                  value,
                              })
                            )
                        }
                      />

                      <CampoInput
                        label="Correo"
                        value={
                          form.correo_cliente
                        }
                        onChange={
                          value =>
                            setForm(
                              actual => ({
                                ...actual,

                                correo_cliente:
                                  value,
                              })
                            )
                        }
                      />
                    </div>
                  </div>
                </div>

              {/* ===========================================
                  PAGO
              =========================================== */}

              <div
                className="
                  order-3
                  h-full
                  border
                  border-gray-300
                  rounded-xl
                  overflow-hidden
                "
              >
                <div
                  className="
                    text-white
                    px-3
                    py-2
                    text-[10px]
                    font-bold
                    rounded-t-xl
                  "
                  style={{
                    backgroundColor: ESTILO_SECCIONES_SECUNDARIAS.fondo,
                    color: ESTILO_SECCIONES_SECUNDARIAS.texto,
                    borderRadius: ESTILO_SECCIONES_SECUNDARIAS.radioSuperior,
                  }}
                >
                  <i className="fas fa-credit-card mr-2"></i>
                  Pago
                </div>

                <div
                  className="
                    p-3
                    space-y-3
                  "
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
                            item.nombre_visible,
                        })
                      )
                    }
                  />

                  <CampoInput
                    label="Entidad financiera"
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
                    placeholder="Ej. Bancolombia, Nequi..."
                  />

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
                              value,
                          })
                        )
                    }
                  />

                  <BotonGuardar
                    type="button"
                    onClick={registrarIngreso}
                    disabled={procesando}
                    className="w-full !py-3 !text-xs"
                  >
                    {procesando ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Registrando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-print mr-2"></i>
                        Registrar e Imprimir
                      </>
                    )}
                  </BotonGuardar>
                </div>
              </div>
            </div>
          )}

          {/* ===============================================
              ADMINISTRAR CONCEPTOS
          =============================================== */}

          {pestana ===
            'CONCEPTOS' && (
            <div className="p-4">
              <ContenedorModulo className="overflow-hidden">
                <div className="p-4">
                  <div
                    className="
                      px-3
                      py-2
                      flex
                      items-center
                      justify-between
                      gap-3
                      text-[10px]
                      font-bold
                    "
                    style={{
                      backgroundColor: ESTILO_SECCIONES_SECUNDARIAS.fondo,
                      color: ESTILO_SECCIONES_SECUNDARIAS.texto,
                      borderRadius: ESTILO_SECCIONES_SECUNDARIAS.radioSuperior,
                    }}
                  >
                    <span>
                      <i className="fas fa-list mr-2"></i>
                      Conceptos registrados
                    </span>

                    <div className="flex items-center gap-2">
                      <BotonAgregar
                        type="button"
                        onClick={
                          nuevoConcepto
                        }
                      >
                        <i className="fas fa-plus"></i>
                        Agregar concepto
                      </BotonAgregar>

                      <BotonActualizar
                        type="button"
                        onClick={
                          cargarConceptosAdmin
                        }
                        disabled={
                          cargandoConceptos
                        }
                      >
                        <i
                          className={`
                            fas
                            fa-sync-alt
                            ${
                              cargandoConceptos
                                ? 'fa-spin'
                                : ''
                            }
                          `}
                        ></i>
                        Actualizar
                      </BotonActualizar>
                    </div>
                  </div>

                  {cargandoConceptos ? (
                    <div className="p-8 text-center text-xs text-gray-500">
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Consultando...
                    </div>
                  ) : conceptosAdminIngreso.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-500">
                      No hay conceptos registrados.
                    </div>
                  ) : (
                    <MarcoTabla className="rounded-t-none">
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-[10px]">
                          <thead>
                            <tr>
                              <th className="px-3 py-2 text-left">Concepto</th>
                              <th className="px-3 py-2 text-left">Descripción</th>
                              <th className="px-3 py-2 text-center">Naturaleza</th>
                              <th className="px-3 py-2 text-center">Aprendiz</th>
                              <th className="px-3 py-2 text-center">Estado</th>
                              <th className="px-3 py-2 text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {conceptosAdminIngreso.map(
                              item => (
                                <tr key={item.id}>
                                  <td className="px-3 py-2 font-bold">
                                    {mayusculas(item.nombre)}
                                  </td>
                                  <td className="px-3 py-2">
                                    {item.descripcion || '-'}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {mayusculas(item.naturaleza)}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {item.requiere_aprendiz ? 'SÍ' : 'NO'}
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold">
                                    {item.activo ? 'ACTIVO' : 'INACTIVO'}
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex justify-center gap-1">
                                      <BotonEditar
                                        type="button"
                                        onClick={() =>
                                          editarConcepto(
                                            item
                                          )
                                        }
                                      >
                                        <i className="fas fa-pen"></i>
                                        Editar
                                      </BotonEditar>

                                      <BotonAccion
                                        type="button"
                                        tipo={
                                          item.activo
                                            ? 'inactivar'
                                            : 'activar'
                                        }
                                        onClick={() =>
                                          cambiarEstadoConcepto(
                                            item
                                          )
                                        }
                                      >
                                        <i
                                          className={`
                                            fas
                                            ${
                                              item.activo
                                                ? 'fa-ban'
                                                : 'fa-check'
                                            }
                                          `}
                                        ></i>
                                        {item.activo
                                          ? 'Inactivar'
                                          : 'Activar'}
                                      </BotonAccion>
                                    </div>
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </MarcoTabla>
                  )}
                </div>
              </ContenedorModulo>

              {modalConceptoAbierto && (
                <div
                  className="
                    fixed
                    inset-0
                    z-[80]
                    flex
                    items-center
                    justify-center
                    bg-black/40
                    p-4
                  "
                >
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={
                      editandoConcepto
                        ? 'Editar concepto'
                        : 'Agregar concepto'
                    }
                    className="
                      w-full
                      max-w-lg
                      bg-white
                      rounded-xl
                      shadow-2xl
                      overflow-hidden
                    "
                  >
                    <div
                      className="
                        px-4
                        py-3
                        flex
                        items-center
                        justify-between
                        gap-3
                      "
                      style={{
                        backgroundColor: ESTILO_SECCIONES.fondo,
                        color: ESTILO_SECCIONES.texto,
                        borderRadius: ESTILO_SECCIONES.radioSuperior,
                      }}
                    >
                      <div className="text-xs font-black">
                        <i className="fas fa-tags mr-2"></i>
                        {editandoConcepto
                          ? 'Editar concepto'
                          : 'Nuevo concepto'}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setModalConceptoAbierto(
                            false
                          )
                        }
                        disabled={procesando}
                        className="text-white text-lg"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>

                    <div className="p-4 space-y-3">
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
                        placeholder="MANEJO DEFENSIVO"
                      />

                      <CampoInput
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
                      />

                      <CampoInput
                        label="Naturaleza"
                        value="INGRESO"
                        disabled={true}
                      />

                      <label
                        className="
                          flex
                          items-center
                          gap-2
                          border
                          border-slate-400
                          rounded-lg
                          px-3
                          py-2
                          text-[10px]
                          text-gray-700
                        "
                      >
                        <input
                          type="checkbox"
                          checked={
                            formConcepto.requiere_aprendiz
                          }
                          onChange={
                            e =>
                              setFormConcepto(
                                actual => ({
                                  ...actual,
                                  requiere_aprendiz:
                                    e.target.checked,
                                })
                              )
                          }
                        />
                        Requiere aprendiz / matrícula
                      </label>

                      <div className="flex justify-end gap-2 pt-2">
                        <BotonCancelar
                          type="button"
                          onClick={() =>
                            setModalConceptoAbierto(
                              false
                            )
                          }
                          disabled={procesando}
                        >
                          Cancelar
                        </BotonCancelar>

                        <BotonGuardar
                          type="button"
                          onClick={
                            guardarConcepto
                          }
                          disabled={procesando}
                        >
                          <i
                            className={`
                              fas
                              ${
                                procesando
                                  ? 'fa-spinner fa-spin'
                                  : 'fa-save'
                              }
                            `}
                          ></i>
                          {editandoConcepto
                            ? 'Guardar cambios'
                            : 'Guardar concepto'}
                        </BotonGuardar>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===============================================
              HISTORIAL / REIMPRIMIR
          =============================================== */}

{pestana ===
  'HISTORIAL' && (
  <div className="p-4">
    <ContenedorModulo className="overflow-hidden">
      <div className="p-4">
        <div
          className="
            px-3
            py-2
            text-[10px]
            font-bold
          "
          style={{
            backgroundColor: ESTILO_SECCIONES_SECUNDARIAS.fondo,
            color: ESTILO_SECCIONES_SECUNDARIAS.texto,
            borderRadius: ESTILO_SECCIONES_SECUNDARIAS.radioSuperior,
          }}
        >
          <i className="fas fa-search mr-2"></i>
          Filtros del historial
        </div>

        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-12
            gap-2
            items-end
            border
            border-t-0
            border-slate-300
            rounded-b-xl
            p-3
            mb-4
          "
        >
          <div className="md:col-span-6">
            <CampoInput
              label="Cliente, documento o descripción"
              value={
                buscarHistorial
              }
              onChange={
                setBuscarHistorial
              }
              placeholder="Buscar automáticamente..."
            />
          </div>

          <div className="md:col-span-2">
            <CampoInput
              label="Fecha inicial"
              type="date"
              value={
                fechaInicioHistorial
              }
              onChange={
                setFechaInicioHistorial
              }
            />
          </div>

          <div className="md:col-span-2">
            <CampoInput
              label="Fecha final"
              type="date"
              value={
                fechaFinHistorial
              }
              onChange={
                setFechaFinHistorial
              }
            />
          </div>

          <div className="md:col-span-2">
            <BotonLimpiar
              type="button"
              onClick={
                limpiarHistorial
              }
              disabled={
                cargandoHistorial
              }
              className="w-full"
            >
              <i className="fas fa-eraser"></i>
              Limpiar
            </BotonLimpiar>
          </div>
        </div>

        <div
          className="
            px-3
            py-2
            flex
            justify-between
            items-center
            gap-3
            text-[10px]
            font-bold
          "
          style={{
            backgroundColor: ESTILO_SECCIONES_SECUNDARIAS.fondo,
            color: ESTILO_SECCIONES_SECUNDARIAS.texto,
            borderRadius: ESTILO_SECCIONES_SECUNDARIAS.radioSuperior,
          }}
        >
          <span>
            <i className="fas fa-receipt mr-2"></i>
            Recibos registrados
          </span>

          <span className="text-[9px] font-semibold">
            {historialIngresos.length} registro(s)
          </span>
        </div>

        {cargandoHistorial ? (
          <div className="p-10 text-center text-xs text-gray-500">
            <i className="fas fa-spinner fa-spin mr-2"></i>
            Consultando historial...
          </div>
        ) : historialIngresos.length === 0 ? (
          <div className="p-10 text-center text-xs text-gray-500">
            <i className="fas fa-receipt block text-3xl text-gray-300 mb-2"></i>
            No se encontraron ingresos.
          </div>
        ) : (
          <MarcoTabla className="rounded-t-none">
            <div className="overflow-x-auto">
              <table className="min-w-full text-[10px]">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left">Recibo</th>
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-left">Cliente</th>
                    <th className="px-3 py-2 text-left">Documento</th>
                    <th className="px-3 py-2 text-left">Concepto / Descripción</th>
                    <th className="px-3 py-2 text-left">Medio de pago</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                    <th className="px-3 py-2 text-center">Estado</th>
                    <th className="px-3 py-2 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {historialIngresos.map(
                    recibo => {
                      const estado =
                        mayusculas(
                          recibo?.estado
                        )

                      const medio =
                        nombreMedioPagoVisible(
                          recibo
                            ?.medio_pago
                            ?.nombre
                        ) ||
                        recibo
                          ?.medio_pago
                          ?.nombre ||
                        '-'

                      const concepto =
                        recibo
                          ?.concepto
                          ?.nombre ||
                        '-'

                      return (
                        <tr key={recibo.id}>
                          <td className="px-3 py-2 font-bold whitespace-nowrap">
                            {recibo.consecutivo ||
                              `RC-${String(
                                recibo.id
                              ).padStart(
                                6,
                                '0'
                              )}`}
                          </td>

                          <td className="px-3 py-2 whitespace-nowrap">
                            {formatearFecha(
                              recibo.fecha
                            )}
                          </td>

                          <td className="px-3 py-2 font-semibold">
                            {recibo.nombre_cliente ||
                              recibo.nombre_pagador ||
                              '-'}
                          </td>

                          <td className="px-3 py-2 whitespace-nowrap">
                            {recibo.tipo_documento_cliente ||
                              ''}{' '}
                            {recibo.documento_cliente ||
                              recibo.documento ||
                              '-'}
                          </td>

                          <td className="px-3 py-2">
                            <div className="font-semibold">
                              {concepto}
                            </div>
                            {recibo.descripcion && (
                              <div className="mt-0.5 text-[9px] text-slate-500">
                                {recibo.descripcion}
                              </div>
                            )}
                          </td>

                          <td className="px-3 py-2">
                            {medio}
                          </td>

                          <td className="px-3 py-2 text-right font-bold whitespace-nowrap">
                            {formatearMoneda(
                              recibo.valor
                            )}
                          </td>

                          <td className="px-3 py-2 text-center font-bold">
                            {estado || '-'}
                          </td>

                          <td className="px-3 py-2">
                            <div className="flex justify-center">
                              <BotonImprimir
                                type="button"
                                onClick={() =>
                                  imprimirIngresoHistorico(
                                    recibo
                                  )
                                }
                              >
                                <i className="fas fa-print"></i>
                                Imprimir copia
                              </BotonImprimir>
                            </div>
                          </td>
                        </tr>
                      )
                    }
                  )}
                </tbody>
              </table>
            </div>
          </MarcoTabla>
        )}
      </div>
    </ContenedorModulo>
  </div>
)}

        </div>
      </aside>

    </div>
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
  disabled = false,
  prefijo = '',
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

      <div className="relative">
        {prefijo && (
          <span
            className="
              absolute
              left-3
              top-1/2
              -translate-y-1/2
              text-xs
              font-bold
              text-slate-500
              pointer-events-none
            "
          >
            {prefijo}
          </span>
        )}

      <input
        type={
          type
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
        disabled={
          disabled
        }
        className={`
          w-full
          border
          border-slate-400
          rounded-lg
          py-2
          text-xs
          disabled:bg-slate-100
          disabled:text-slate-600
          disabled:cursor-not-allowed
          ${prefijo ? 'pl-7 pr-3' : 'px-3'}
        `}
      />
      </div>
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
  options,
  disabled = false,
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
        disabled={
          disabled
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
        className="
          w-full
          border
          border-slate-400
          rounded-lg
          px-3
          py-2
          text-xs
          disabled:bg-slate-100
          disabled:text-slate-600
          disabled:cursor-not-allowed
        "
      >
        <option value="">
          Seleccione...
        </option>

        {(options || []).map(
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
        className="
          w-full
          border
          border-slate-400
          rounded-lg
          px-3
          py-2
          text-xs
          min-h-[72px]
          resize-y
        "
      />
    </div>
  )
}
