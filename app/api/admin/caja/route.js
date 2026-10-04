// app/api/admin/caja/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// =========================================================
// CONSTANTES
// =========================================================

const CATEGORIAS_VALIDAS = new Set([
  'A2',
  'B1',
  'C1',
  'RC1',
  'C2',
  'C3',
])

const ESTADOS_CUENTA = new Set([
  'PENDIENTE',
  'ABONADO',
  'PAZ_Y_SALVO',
  'ANULADA',
])

const ORIGENES_MATRICULA = new Set([
  'DIRECTO',
  'CONVENIO',
])

const PAGADO_POR_VALIDOS = new Set([
  'APRENDIZ',
  'CONVENIO',  
  'TERCERO',
])

const TIPOS_CIERRE = new Set([
  'DIARIO',
  'TURNO',
  'PARCIAL',
])

const LIMITE_CONSULTA = 200

// =========================================================
// ERROR MULTIEMPRESA
// =========================================================

function respuestaError(
  error
) {
  const respuesta =
    respuestaErrorEmpresa(
      error
    )

  return NextResponse.json(
    respuesta.body,
    {
      status:
        respuesta.status,
    }
  )
}

// =========================================================
// HELPERS GENERALES
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

function limpiarBusqueda(
  valor
) {
  return texto(
    valor
  ).replace(
    /[%_]/g,
    ''
  )
}

function nombreEmpresa(
  empresa
) {
  return (
    empresa?.nombre ||
    empresa?.nombre_empresa ||
    empresa?.razon_social ||
    ''
  )
}

function empresaRespuesta(
  empresa
) {
  return {
    nit:
      empresa?.nit ||
      '',

    nombre:
      nombreEmpresa(
        empresa
      ),

    nivel_cea:
      empresa?.nivel_cea ||
      '',

    categorias_habilitadas:
      Array.isArray(
        empresa?.categorias_habilitadas
      )
        ? empresa.categorias_habilitadas
        : [],
  }
}

function usuarioOperacion(
  body
) {
  return (
    texto(
      body?.usuario
    ) ||
    texto(
      body?.nombre_usuario
    ) ||
    ''
  )
}

function toInt(
  valor
) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return null
  }

  const numero =
    Number(
      valor
    )

  if (
    !Number.isFinite(
      numero
    )
  ) {
    return null
  }

  return Math.trunc(
    numero
  )
}

function toNumero(
  valor
) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return null
  }

  const numero =
    Number(
      valor
    )

  if (
    !Number.isFinite(
      numero
    )
  ) {
    return null
  }

  return Math.round(
    numero * 100
  ) / 100
}

function redondear(
  valor
) {
  return Math.round(
    (
      Number(
        valor
      ) || 0
    ) * 100
  ) / 100
}

function fechaValida(
  valor
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    texto(
      valor
    )
  )
}

function fechaHoraValida(
  valor
) {
  const fecha =
    new Date(
      valor
    )

  return !Number.isNaN(
    fecha.getTime()
  )
}

function normalizarComparacion(
  valor
) {
  return mayusculas(
    valor
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
}
// =========================================================
// FECHA COLOMBIA
// =========================================================

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

// =========================================================
// CONSECUTIVOS VISUALES
// =========================================================

function consecutivoRecibo(
  id
) {
  const numero =
    Number(
      id
    )

  if (
    !Number.isFinite(
      numero
    )
  ) {
    return ''
  }

  return `RC-${String(
    numero
  ).padStart(
    6,
    '0'
  )}`
}

function consecutivoEgreso(
  id
) {
  const numero =
    Number(
      id
    )

  if (
    !Number.isFinite(
      numero
    )
  ) {
    return ''
  }

  return `CE-${String(
    numero
  ).padStart(
    6,
    '0'
  )}`
}

function consecutivoCierre(
  id
) {
  const numero =
    Number(
      id
    )

  if (
    !Number.isFinite(
      numero
    )
  ) {
    return ''
  }

  return `AC-${String(
    numero
  ).padStart(
    6,
    '0'
  )}`
}

// =========================================================
// ESTADO CUENTA SEGÚN ABONOS
// =========================================================

function calcularEstadoCuenta({
  valorTotal,
  totalAbonado,
}) {
  const total =
    redondear(
      valorTotal
    )

  const abonado =
    redondear(
      totalAbonado
    )

  if (
    abonado <= 0
  ) {
    return 'PENDIENTE'
  }

  if (
    abonado >= total
  ) {
    return 'PAZ_Y_SALVO'
  }

  return 'ABONADO'
}

// =========================================================
// AUDITORÍA
// =========================================================

async function registrarAuditoria({
  supabase,
  usuario,
  accion,
  entidad,
  entidadId = null,
  matriculaId = null,
  documento = null,
  consecutivoReferencia = null,
  descripcion,
  datosAnteriores = null,
  datosNuevos = null,
  motivo = null,
  observaciones = null,
  origen = 'API_CAJA',
}) {
  const {
    error,
  } =
    await supabase
      .from(
        'auditoria_caja'
      )
      .insert({
        usuario:
          texto(
            usuario
          ),

        accion:
          mayusculas(
            accion
          ),

        entidad:
          mayusculas(
            entidad
          ),

        entidad_id:
          entidadId,

        matricula_id:
          matriculaId,

        documento:
          documento
            ? texto(
                documento
              )
            : null,

        consecutivo_referencia:
          consecutivoReferencia
            ? texto(
                consecutivoReferencia
              )
            : null,

        descripcion:
          texto(
            descripcion
          ),

        datos_anteriores:
          datosAnteriores,

        datos_nuevos:
          datosNuevos,

        motivo:
          motivo
            ? texto(
                motivo
              )
            : null,

        observaciones:
          observaciones
            ? texto(
                observaciones
              )
            : null,

        origen:
          texto(
            origen
          ) ||
          null,
      })

  if (
    error
  ) {
    throw new Error(
      `No fue posible registrar la auditoría de Caja: ${error.message}`
    )
  }
}

// =========================================================
// ORDEN MEDIOS DE PAGO
// =========================================================

function ordenarMediosPago(
  medios
) {
  const orden = [
    'EFECTIVO',
    'CREDITO',
    'DEBITO',
    'NEQUI',
    'DAVIPLATA',
    'PSE',
    'TRANSFERENCIA',
    'OTRO',
  ]

  return (
    Array.isArray(
      medios
    )
      ? medios
      : []
  )
    .filter(
      item =>
        mayusculas(
          item?.nombre
        ) !==
        'CONSIGNACION'
    )
    .sort(
      (
        a,
        b
      ) => {
        const nombreA =
          mayusculas(
            a?.nombre
          )

        const nombreB =
          mayusculas(
            b?.nombre
          )

        let posicionA =
          orden.indexOf(
            nombreA
          )

        let posicionB =
          orden.indexOf(
            nombreB
          )

        if (
          posicionA <
          0
        ) {
          posicionA =
            999
        }

        if (
          posicionB <
          0
        ) {
          posicionB =
            999
        }

        if (
          posicionA !==
          posicionB
        ) {
          return (
            posicionA -
            posicionB
          )
        }

        return nombreA.localeCompare(
          nombreB
        )
      }
    )
}

// =========================================================
// PARÁMETROS
// =========================================================

async function obtenerParametros(
  supabase
) {
  const [
    conceptosResult,
    mediosResult,
    conveniosResult,
  ] =
    await Promise.all([
      supabase
        .from(
          'conceptos_caja'
        )
        .select(`
          id,
          nombre,
          descripcion,
          naturaleza,
          requiere_aprendiz,
          activo
        `)
        .eq(
          'activo',
          true
        )
        .order(
          'nombre',
          {
            ascending:
              true,
          }
        ),

      supabase
        .from(
          'medios_pago_caja'
        )
        .select(`
          id,
          nombre,
          descripcion,
          activo
        `)
        .eq(
          'activo',
          true
        ),

      supabase
        .from(
          'convenios'
        )
        .select(`
          id,
          nombre,
          documento,
          celular,
          direccion,
          correo,
          activo
        `)
        .eq(
          'activo',
          true
        )
        .order(
          'nombre',
          {
            ascending:
              true,
          }
        ),
    ])

  if (
    conceptosResult.error
  ) {
    throw new Error(
      `No fue posible consultar conceptos de Caja: ${conceptosResult.error.message}`
    )
  }

  if (
    mediosResult.error
  ) {
    throw new Error(
      `No fue posible consultar medios de pago: ${mediosResult.error.message}`
    )
  }

  if (
    conveniosResult.error
  ) {
    throw new Error(
      `No fue posible consultar convenios: ${conveniosResult.error.message}`
    )
  }

  return {
    conceptos:
      conceptosResult.data ||
      [],

    medios_pago:
      ordenarMediosPago(
        mediosResult.data ||
        []
      ),

    convenios:
      conveniosResult.data ||
      [],
  }
}

// =========================================================
// MATRÍCULA
// =========================================================

async function obtenerMatricula(
  supabase,
  matriculaId
) {
  const id =
    toInt(
      matriculaId
    )

  if (
    !id
  ) {
    throw new Error(
      'La matrícula es obligatoria.'
    )
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'aprendices'
      )
      .select(`
        id,
        consecutivo,
        fecha_matricula,
        tipo_doc,
        documento,
        nombres,
        apellidos,
        celular,
        correo,
        convenio,
        convenio_id,
        origen_matricula,
        categorias,
        estado,
        created_at
      `)
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar la matrícula: ${error.message}`
    )
  }

  if (
    !data
  ) {
    throw new Error(
      'No se encontró la matrícula solicitada.'
    )
  }

  return data
}

// =========================================================
// CATEGORÍA MATRÍCULA
// =========================================================

function categoriaMatricula(
  matricula
) {
  if (
    Array.isArray(
      matricula?.categorias
    ) &&
    matricula.categorias.length >
      0
  ) {
    return mayusculas(
      matricula.categorias[0]
    )
  }

  return ''
}

// =========================================================
// OBTENER MATRÍCULAS POR IDS
// =========================================================

async function obtenerMatriculasPorIds(
  supabase,
  ids
) {
  const matriculaIds =
    [
      ...new Set(
        (
          Array.isArray(
            ids
          )
            ? ids
            : []
        )
          .map(
            item =>
              toInt(
                item
              )
          )
          .filter(
            Boolean
          )
      ),
    ]

  if (
    matriculaIds.length ===
    0
  ) {
    return []
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'aprendices'
      )
      .select(`
        id,
        consecutivo,
        fecha_matricula,
        tipo_doc,
        documento,
        nombres,
        apellidos,
        celular,
        correo,
        convenio,
        convenio_id,
        origen_matricula,
        categorias,
        estado,
        created_at
      `)
      .in(
        'id',
        matriculaIds
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar las matrículas: ${error.message}`
    )
  }

  return data ||
    []
}

// =========================================================
// CONCEPTO
// =========================================================

async function obtenerConcepto(
  supabase,
  conceptoId
) {
  const id =
    toInt(
      conceptoId
    )

  if (
    !id
  ) {
    throw new Error(
      'El concepto es obligatorio.'
    )
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'conceptos_caja'
      )
      .select(`
        id,
        nombre,
        descripcion,
        naturaleza,
        requiere_aprendiz,
        activo
      `)
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar el concepto: ${error.message}`
    )
  }

  if (
    !data
  ) {
    throw new Error(
      'No se encontró el concepto solicitado.'
    )
  }

  return data
}

// =========================================================
// MEDIO DE PAGO
// =========================================================

async function obtenerMedioPago(
  supabase,
  medioPagoId
) {
  const id =
    toInt(
      medioPagoId
    )

  if (
    !id
  ) {
    throw new Error(
      'El medio de pago es obligatorio.'
    )
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'medios_pago_caja'
      )
      .select(`
        id,
        nombre,
        activo
      `)
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar el medio de pago: ${error.message}`
    )
  }

  if (
    !data
  ) {
    throw new Error(
      'No se encontró el medio de pago solicitado.'
    )
  }

  if (
    data.activo !==
    true
  ) {
    throw new Error(
      'El medio de pago seleccionado está inactivo.'
    )
  }

  if (
    mayusculas(
      data.nombre
    ) ===
    'CONSIGNACION'
  ) {
    throw new Error(
      'CONSIGNACION ya no está habilitado como medio de pago.'
    )
  }

  return data
}

// =========================================================
// CONVENIO
// =========================================================

async function obtenerConvenio(
  supabase,
  convenioId
) {
  const id =
    toInt(
      convenioId
    )

  if (
    !id
  ) {
    return null
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'convenios'
      )
      .select(`
        id,
        nombre,
        documento,
        celular,
        direccion,
        correo,
        activo
      `)
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar el convenio: ${error.message}`
    )
  }

  return data ||
    null
}

// =========================================================
// CUENTA / CABECERA
// =========================================================

async function obtenerCuenta(
  supabase,
  cuentaId
) {
  const id =
    toInt(
      cuentaId
    )

  if (
    !id
  ) {
    throw new Error(
      'La cuenta del aprendiz es obligatoria.'
    )
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'cuentas_aprendiz'
      )
      .select(`
        id,
        documento,
        convenio_id,
        descripcion,
        valor_total,
        estado,
        origen_pago,
        origen_matricula,
        observaciones,
        creado_por,
        fecha_creacion,
        created_at,
        updated_at
      `)
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar la cuenta: ${error.message}`
    )
  }

  if (
    !data
  ) {
    throw new Error(
      'No se encontró la cuenta solicitada.'
    )
  }

  return data
}

// =========================================================
// DETALLES DE CUENTA
// =========================================================

async function obtenerDetallesCuenta(
  supabase,
  cuentaId,
  incluirAnulados = false
) {
  let consulta =
    supabase
      .from(
        'cuentas_aprendiz_detalle'
      )
      .select(`
        id,
        cuenta_id,
        matricula_id,
        concepto_id,
        categorias,
        descripcion,
        valor,
        estado,
        motivo_anulacion,
        usuario_anulacion,
        fecha_anulacion,
        creado_por,
        created_at,
        updated_at
      `)
      .eq(
        'cuenta_id',
        cuentaId
      )

  if (
    !incluirAnulados
  ) {
    consulta =
      consulta.eq(
        'estado',
        'ACTIVO'
      )
  }

  const {
    data,
    error,
  } =
    await consulta.order(
      'id',
      {
        ascending:
          true,
      }
    )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar el detalle de la obligación: ${error.message}`
    )
  }

  return data ||
    []
}

// =========================================================
// DETALLES DE VARIAS CUENTAS
// =========================================================

async function obtenerDetallesCuentas(
  supabase,
  cuentaIds
) {
  const ids =
    [
      ...new Set(
        (
          Array.isArray(
            cuentaIds
          )
            ? cuentaIds
            : []
        )
          .map(
            id =>
              toInt(
                id
              )
          )
          .filter(
            Boolean
          )
      ),
    ]

  if (
    ids.length ===
    0
  ) {
    return []
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'cuentas_aprendiz_detalle'
      )
      .select(`
        id,
        cuenta_id,
        matricula_id,
        concepto_id,
        categorias,
        descripcion,
        valor,
        estado,
        motivo_anulacion,
        usuario_anulacion,
        fecha_anulacion,
        creado_por,
        created_at,
        updated_at
      `)
      .in(
        'cuenta_id',
        ids
      )
      .eq(
        'estado',
        'ACTIVO'
      )
      .order(
        'id',
        {
          ascending:
            true,
        }
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar los componentes de las obligaciones: ${error.message}`
    )
  }

  return data ||
    []
}

// =========================================================
// TOTAL ABONADO
// =========================================================

async function obtenerTotalAbonado(
  supabase,
  cuentaId
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'recibos_caja'
      )
      .select(`
        id,
        valor
      `)
      .eq(
        'cuenta_id',
        cuentaId
      )
      .eq(
        'estado',
        'ACTIVO'
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible calcular los abonos de la cuenta: ${error.message}`
    )
  }

  return redondear(
    (
      data ||
      []
    ).reduce(
      (
        total,
        recibo
      ) =>
        total +
        Number(
          recibo.valor ||
          0
        ),
      0
    )
  )
}

// =========================================================
// DISTRIBUCIÓN FINANCIERA DE RECIBOS
// =========================================================
//
// Regla:
//
// 1. CURSO
// 2. EXAMEN MEDICO
// 3. OTROS CONCEPTOS
//
// totalAnterior permite respetar recibos históricos que
// todavía no tienen filas en recibos_caja_detalle.
// =========================================================

function prioridadConceptoPago(
  nombre
) {
  const valor =
    mayusculas(
      nombre
    )

  if (
    valor ===
    'CURSO'
  ) {
    return 1
  }

  if (
    valor ===
      'EXAMEN MEDICO' ||
    valor ===
      'EXAMEN MÉDICO'
  ) {
    return 2
  }

  return 3
}

async function construirDistribucionPago({
  supabase,
  detalles,
  totalAnterior,
  valor,
}) {
  const lista =
    Array.isArray(
      detalles
    )
      ? detalles
      : []

  if (
    lista.length ===
    0
  ) {
    throw new Error(
      'La obligación no tiene componentes financieros activos.'
    )
  }

  const conceptoIds =
    [
      ...new Set(
        lista
          .map(
            item =>
              item.concepto_id
          )
          .filter(
            Boolean
          )
      ),
    ]

  const {
    data:
      conceptos,

    error:
      errorConceptos,
  } =
    conceptoIds.length >
    0
      ? await supabase
          .from(
            'conceptos_caja'
          )
          .select(`
            id,
            nombre
          `)
          .in(
            'id',
            conceptoIds
          )
      : {
          data:
            [],
          error:
            null,
        }

  if (
    errorConceptos
  ) {
    throw new Error(
      `No fue posible consultar los conceptos de la obligación: ${errorConceptos.message}`
    )
  }

  const mapaConceptos =
    new Map(
      (
        conceptos ||
        []
      ).map(
        concepto => [
          String(
            concepto.id
          ),
          concepto,
        ]
      )
    )

  const ordenados =
    lista
      .map(
        detalle => ({
          ...detalle,

          concepto:
            mapaConceptos.get(
              String(
                detalle.concepto_id
              )
            ) ||
            null,
        })
      )
      .sort(
        (
          a,
          b
        ) => {
          const prioridadA =
            prioridadConceptoPago(
              a?.concepto?.nombre
            )

          const prioridadB =
            prioridadConceptoPago(
              b?.concepto?.nombre
            )

          if (
            prioridadA !==
            prioridadB
          ) {
            return (
              prioridadA -
              prioridadB
            )
          }

          return (
            Number(
              a.id ||
              0
            ) -
            Number(
              b.id ||
              0
            )
          )
        }
      )

  // =======================================================
  // APLICAR HISTÓRICO
  // =======================================================
  //
  // Si antes de crear recibos_caja_detalle ya existían
  // pagos, simulamos cómo habrían sido aplicados:
  //
  // CURSO -> EXAMEN MEDICO -> OTROS
  //
  // =======================================================

  let abonadoHistorico =
    redondear(
      totalAnterior
    )

  const saldos =
    new Map()

  for (
    const detalle of
      ordenados
  ) {
    const valorDetalle =
      redondear(
        detalle.valor
      )

    const aplicadoHistorico =
      Math.min(
        valorDetalle,
        Math.max(
          0,
          abonadoHistorico
        )
      )

    abonadoHistorico =
      redondear(
        abonadoHistorico -
        aplicadoHistorico
      )

    saldos.set(
      String(
        detalle.id
      ),
      redondear(
        valorDetalle -
        aplicadoHistorico
      )
    )
  }

  // =======================================================
  // APLICAR EL PAGO NUEVO
  // =======================================================

  let restante =
    redondear(
      valor
    )

  let ordenAplicacion =
    1

  const distribucion =
    []

  for (
    const detalle of
      ordenados
  ) {
    if (
      restante <=
      0
    ) {
      break
    }

    const saldoDetalle =
      redondear(
        saldos.get(
          String(
            detalle.id
          )
        ) ||
        0
      )

    if (
      saldoDetalle <=
      0
    ) {
      continue
    }

    const aplicar =
      redondear(
        Math.min(
          restante,
          saldoDetalle
        )
      )

    if (
      aplicar <=
      0
    ) {
      continue
    }

    distribucion.push({
      cuenta_detalle_id:
        detalle.id,

      concepto_id:
        detalle.concepto_id,

      descripcion:
        detalle.descripcion ||
        detalle?.concepto?.nombre ||
        null,

      categorias:
        Array.isArray(
          detalle.categorias
        )
          ? detalle.categorias
          : null,

      valor:
        aplicar,

      orden_aplicacion:
        ordenAplicacion,
    })

    restante =
      redondear(
        restante -
        aplicar
      )

    ordenAplicacion +=
      1
  }

  if (
    restante >
    0
  ) {
    throw new Error(
      `No fue posible distribuir $${restante} del pago entre los componentes pendientes de la obligación.`
    )
  }

  return distribucion
}

async function guardarDistribucionRecibo(
  supabase,
  reciboId,
  distribucion
) {
  const filas =
    (
      Array.isArray(
        distribucion
      )
        ? distribucion
        : []
    ).map(
      item => ({
        recibo_id:
          reciboId,

        cuenta_detalle_id:
          item.cuenta_detalle_id ||
          null,

        concepto_id:
          item.concepto_id,

        descripcion:
          item.descripcion ||
          null,

        categorias:
          Array.isArray(
            item.categorias
          )
            ? item.categorias
            : null,

        valor:
          redondear(
            item.valor
          ),

        orden_aplicacion:
          item.orden_aplicacion,

        updated_at:
          new Date()
            .toISOString(),
      })
    )

  if (
    filas.length ===
    0
  ) {
    return []
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'recibos_caja_detalle'
      )
      .insert(
        filas
      )
      .select('*')

  if (
    error
  ) {
    throw new Error(
      `No fue posible guardar la distribución del recibo: ${error.message}`
    )
  }

  return data ||
    []
}

// =========================================================
// ENRIQUECER CUENTAS
// =========================================================
//
// cuentas_aprendiz = obligación única
//
// cuentas_aprendiz_detalle:
//   CURSO A2
//   CURSO C1
//   EXAMEN MEDICO A2 + C1
//
// =========================================================

async function enriquecerCuentas(
  supabase,
  cuentas
) {
  const lista =
    Array.isArray(
      cuentas
    )
      ? cuentas
      : []

  if (
    lista.length ===
    0
  ) {
    return []
  }

  const cuentaIds =
    lista.map(
      cuenta =>
        cuenta.id
    )

  const detalles =
    await obtenerDetallesCuentas(
      supabase,
      cuentaIds
    )

  const matriculaIds =
    [
      ...new Set(
        detalles
          .map(
            detalle =>
              detalle.matricula_id
          )
          .filter(
            Boolean
          )
      ),
    ]

  const conceptoIds =
    [
      ...new Set(
        detalles
          .map(
            detalle =>
              detalle.concepto_id
          )
          .filter(
            Boolean
          )
      ),
    ]

  const convenioIds =
    [
      ...new Set(
        lista
          .map(
            cuenta =>
              cuenta.convenio_id
          )
          .filter(
            Boolean
          )
      ),
    ]

  const [
    recibosResult,
    matriculasResult,
    conceptosResult,
    conveniosResult,
  ] =
    await Promise.all([
      supabase
        .from(
          'recibos_caja'
        )
        .select(`
          id,
          cuenta_id,
          valor
        `)
        .in(
          'cuenta_id',
          cuentaIds
        )
        .eq(
          'estado',
          'ACTIVO'
        ),

      matriculaIds.length >
      0
        ? supabase
            .from(
              'aprendices'
            )
            .select(`
              id,
              consecutivo,
              fecha_matricula,
              tipo_doc,
              documento,
              nombres,
              apellidos,
              celular,
              correo,
              convenio,
              convenio_id,
              origen_matricula,
              categorias,
              estado
            `)
            .in(
              'id',
              matriculaIds
            )
        : Promise.resolve({
            data:
              [],
            error:
              null,
          }),

      conceptoIds.length >
      0
        ? supabase
            .from(
              'conceptos_caja'
            )
            .select(`
              id,
              nombre,
              naturaleza
            `)
            .in(
              'id',
              conceptoIds
            )
        : Promise.resolve({
            data:
              [],
            error:
              null,
          }),

      convenioIds.length >
      0
        ? supabase
            .from(
              'convenios'
            )
            .select(`
              id,
              nombre,
              documento,
              celular,
              direccion,
              correo
            `)
            .in(
              'id',
              convenioIds
            )
        : Promise.resolve({
            data:
              [],
            error:
              null,
          }),
    ])

  if (
    recibosResult.error
  ) {
    throw new Error(
      `No fue posible calcular los saldos: ${recibosResult.error.message}`
    )
  }

  if (
    matriculasResult.error
  ) {
    throw new Error(
      `No fue posible consultar las matrículas: ${matriculasResult.error.message}`
    )
  }

  if (
    conceptosResult.error
  ) {
    throw new Error(
      `No fue posible consultar los conceptos: ${conceptosResult.error.message}`
    )
  }

  if (
    conveniosResult.error
  ) {
    throw new Error(
      `No fue posible consultar los convenios: ${conveniosResult.error.message}`
    )
  }

  const mapaAbonos =
    new Map()

  for (
    const recibo of
      recibosResult.data ||
      []
  ) {
    const key =
      String(
        recibo.cuenta_id
      )

    mapaAbonos.set(
      key,
      redondear(
        (
          mapaAbonos.get(
            key
          ) ||
          0
        ) +
        Number(
          recibo.valor ||
          0
        )
      )
    )
  }

  const mapaMatriculas =
    new Map(
      (
        matriculasResult.data ||
        []
      ).map(
        matricula => [
          String(
            matricula.id
          ),
          matricula,
        ]
      )
    )

  const mapaConceptos =
    new Map(
      (
        conceptosResult.data ||
        []
      ).map(
        concepto => [
          String(
            concepto.id
          ),
          concepto,
        ]
      )
    )

  const mapaConvenios =
    new Map(
      (
        conveniosResult.data ||
        []
      ).map(
        convenio => [
          String(
            convenio.id
          ),
          convenio,
        ]
      )
    )

  const detallesPorCuenta =
    new Map()

  for (
    const detalle of
      detalles
  ) {
    const key =
      String(
        detalle.cuenta_id
      )

    if (
      !detallesPorCuenta.has(
        key
      )
    ) {
      detallesPorCuenta.set(
        key,
        []
      )
    }

    const matricula =
      detalle.matricula_id
        ? mapaMatriculas.get(
            String(
              detalle.matricula_id
            )
          ) ||
          null
        : null

    const concepto =
      detalle.concepto_id
        ? mapaConceptos.get(
            String(
              detalle.concepto_id
            )
          ) ||
          null
        : null

    detallesPorCuenta
      .get(
        key
      )
      .push({
        ...detalle,

        valor:
          redondear(
            detalle.valor
          ),

        matricula,

        concepto,
      })
  }

  return lista.map(
    cuenta => {
      const key =
        String(
          cuenta.id
        )

      const detallesCuenta =
        detallesPorCuenta.get(
          key
        ) ||
        []

      const matriculasCuenta =
        []

      const matriculasVistas =
        new Set()

      for (
        const detalle of
          detallesCuenta
      ) {
        const matricula =
          detalle.matricula

        if (
          !matricula ||
          matriculasVistas.has(
            String(
              matricula.id
            )
          )
        ) {
          continue
        }

        matriculasVistas.add(
          String(
            matricula.id
          )
        )

        matriculasCuenta.push(
          matricula
        )
      }

      const matriculaPrincipal =
        matriculasCuenta[0] ||
        null

      const totalAbonado =
        redondear(
          mapaAbonos.get(
            key
          ) ||
          0
        )

      const valorTotal =
        redondear(
          cuenta.valor_total
        )

      const saldo =
        Math.max(
          0,
          redondear(
            valorTotal -
            totalAbonado
          )
        )

      const estadoCalculado =
        cuenta.estado ===
        'ANULADA'
          ? 'ANULADA'
          : calcularEstadoCuenta({
              valorTotal,

              totalAbonado,
            })

      const categorias =
        [
          ...new Set(
            detallesCuenta.flatMap(
              detalle =>
                Array.isArray(
                  detalle.categorias
                )
                  ? detalle.categorias
                      .map(
                        item =>
                          mayusculas(
                            item
                          )
                      )
                      .filter(
                        item =>
                          CATEGORIAS_VALIDAS.has(
                            item
                          )
                      )
                  : []
            )
          ),
        ]

      const consecutivos =
        matriculasCuenta
          .map(
            matricula =>
              matricula.consecutivo
          )
          .filter(
            Boolean
          )

      return {
        ...cuenta,

        valor_total:
          valorTotal,

        total_abonado:
          totalAbonado,

        saldo,

        estado_calculado:
          estadoCalculado,

        categorias,

        consecutivos_matricula:
          consecutivos,

        consecutivo_matricula:
          consecutivos.join(
            ' / '
          ),

        matriculas:
          matriculasCuenta,

        detalles:
          detallesCuenta,

        aprendiz:
          matriculaPrincipal
            ? {
                id:
                  matriculaPrincipal.id,

                tipo_doc:
                  matriculaPrincipal.tipo_doc ||
                  '',

                documento:
                  matriculaPrincipal.documento ||
                  cuenta.documento ||
                  '',

                nombres:
                  matriculaPrincipal.nombres ||
                  '',

                apellidos:
                  matriculaPrincipal.apellidos ||
                  '',

                nombre_completo:
                  [
                    matriculaPrincipal.nombres,
                    matriculaPrincipal.apellidos,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      ' '
                    )
                    .trim(),

                celular:
                  matriculaPrincipal.celular ||
                  '',

                correo:
                  matriculaPrincipal.correo ||
                  '',

                fecha_matricula:
                  matriculaPrincipal.fecha_matricula ||
                  '',

                convenio:
                  matriculaPrincipal.convenio ||
                  '',

                convenio_id:
                  matriculaPrincipal.convenio_id ??
                  cuenta.convenio_id ??
                  null,

                origen_matricula:
                  matriculaPrincipal.origen_matricula ||
                  cuenta.origen_matricula ||
                  'DIRECTO',

                estado:
                  matriculaPrincipal.estado ||
                  '',
              }
            : {
                id:
                  null,

                tipo_doc:
                  '',

                documento:
                  cuenta.documento ||
                  '',

                nombres:
                  '',

                apellidos:
                  '',

                nombre_completo:
                  '',

                celular:
                  '',

                correo:
                  '',

                fecha_matricula:
                  '',

                convenio:
                  '',

                convenio_id:
                  cuenta.convenio_id ??
                  null,

                origen_matricula:
                  cuenta.origen_matricula ||
                  'DIRECTO',

                estado:
                  '',
              },

        convenio:
          cuenta.convenio_id
            ? mapaConvenios.get(
                String(
                  cuenta.convenio_id
                )
              ) ||
              null
            : null,
      }
    }
  )
}

// =========================================================
// CONSULTAR CUENTAS
// =========================================================

async function consultarCuentas({
  supabase,
  busqueda = '',
  estado = '',
  convenioId = null,
}) {
  const termino =
    limpiarBusqueda(
      busqueda
    )

  // =======================================================
  // RESOLVER CUENTAS DESDE APRENDICES
  // =======================================================
  //
  // cuentas_aprendiz no almacena nombres ni apellidos.
  // Cuando existe un término de búsqueda, localizamos primero
  // las matrículas coincidentes y luego sus cuentas mediante
  // cuentas_aprendiz_detalle.
  //
  // =======================================================

  let cuentaIdsAprendiz =
    []

  if (
    termino
  ) {
    const {
      data:
        aprendicesCoincidentes,

      error:
        errorAprendices,
    } =
      await supabase
        .from(
          'aprendices'
        )
        .select(
          'id'
        )
        .or(
          [
            `documento.ilike.%${termino}%`,
            `nombres.ilike.%${termino}%`,
            `apellidos.ilike.%${termino}%`,
            `consecutivo.ilike.%${termino}%`,
          ].join(
            ','
          )
        )
        .limit(
          LIMITE_CONSULTA
        )

    if (
      errorAprendices
    ) {
      throw new Error(
        `No fue posible buscar aprendices para Caja: ${errorAprendices.message}`
      )
    }

    const matriculaIds =
      (
        aprendicesCoincidentes ||
        []
      )
        .map(
          item =>
            toInt(
              item.id
            )
        )
        .filter(
          Boolean
        )

    if (
      matriculaIds.length >
      0
    ) {
      const {
        data:
          detallesCoincidentes,

        error:
          errorDetalles,
      } =
        await supabase
          .from(
            'cuentas_aprendiz_detalle'
          )
          .select(
            'cuenta_id'
          )
          .in(
            'matricula_id',
            matriculaIds
          )
          .eq(
            'estado',
            'ACTIVO'
          )
          .limit(
            LIMITE_CONSULTA
          )

      if (
        errorDetalles
      ) {
        throw new Error(
          `No fue posible relacionar el aprendiz con su cuenta: ${errorDetalles.message}`
        )
      }

      cuentaIdsAprendiz =
        [
          ...new Set(
            (
              detallesCoincidentes ||
              []
            )
              .map(
                item =>
                  toInt(
                    item.cuenta_id
                  )
              )
              .filter(
                Boolean
              )
          ),
        ]
    }
  }

  let consulta =
    supabase
      .from(
        'cuentas_aprendiz'
      )
      .select(`
        id,
        documento,
        convenio_id,
        descripcion,
        valor_total,
        estado,
        origen_pago,
        origen_matricula,
        observaciones,
        creado_por,
        fecha_creacion,
        created_at,
        updated_at
      `)

  const estadoNormalizado =
    mayusculas(
      estado
    )

  if (
    estadoNormalizado
  ) {
    if (
      !ESTADOS_CUENTA.has(
        estadoNormalizado
      )
    ) {
      throw new Error(
        'El estado de cuenta no es válido.'
      )
    }

    consulta =
      consulta.eq(
        'estado',
        estadoNormalizado
      )
  } else {
    consulta =
      consulta.neq(
        'estado',
        'ANULADA'
      )
  }

  if (
    convenioId
  ) {
    consulta =
      consulta.eq(
        'convenio_id',
        convenioId
      )
  }

  if (
    termino
  ) {
    const filtros =
      [
        `documento.ilike.%${termino}%`,
        `descripcion.ilike.%${termino}%`,
      ]

    if (
      cuentaIdsAprendiz.length >
      0
    ) {
      filtros.push(
        `id.in.(${cuentaIdsAprendiz.join(
          ','
        )})`
      )
    }

    consulta =
      consulta.or(
        filtros.join(
          ','
        )
      )
  }

  const {
    data,
    error,
  } =
    await consulta
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      )
      .limit(
        LIMITE_CONSULTA
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar las cuentas: ${error.message}`
    )
  }

  let cuentas =
    await enriquecerCuentas(
      supabase,
      data ||
      []
    )

  // =======================================================
  // VALIDACIÓN COMPLEMENTARIA SOBRE DATOS ENRIQUECIDOS
  // =======================================================

  if (
    termino
  ) {
    const terminoNormalizado =
      normalizarComparacion(
        termino
      )

    cuentas =
      cuentas.filter(
        cuenta => {
          const aprendiz =
            cuenta.aprendiz ||
            {}

          const textoBusqueda =
            normalizarComparacion(
              [
                cuenta.documento,
                cuenta.descripcion,
                aprendiz.nombres,
                aprendiz.apellidos,
                aprendiz.nombre_completo,
                cuenta.consecutivo_matricula,
                (
                  cuenta.categorias ||
                  []
                ).join(
                  ' '
                ),
                cuenta.convenio?.nombre,
              ]
                .filter(
                  Boolean
                )
                .join(
                  ' '
                )
            )

          return textoBusqueda.includes(
            terminoNormalizado
          )
        }
      )
  }

  return cuentas
}

// =========================================================
// DETALLE CUENTA
// =========================================================

async function obtenerDetalleCuenta(
  supabase,
  cuentaId
) {
  const cuenta =
    await obtenerCuenta(
      supabase,
      cuentaId
    )

  const enriquecidas =
    await enriquecerCuentas(
      supabase,
      [
        cuenta,
      ]
    )

  const cuentaEnriquecida =
    enriquecidas[0] ||
    cuenta

  const {
    data:
      recibos,

    error:
      errorRecibos,
  } =
    await supabase
      .from(
        'recibos_caja'
      )
      .select(`
        id,
        cuenta_id,
        matricula_id,
        documento,
        categoria,
        concepto_id,
        medio_pago_id,
        fecha,
        descripcion,
        valor,
        pagado_por,
        nombre_pagador,
        documento_pagador,
        referencia_pago,
        recibido_por,
        observaciones,
        estado,
        motivo_anulacion,
        usuario_anulacion,
        fecha_anulacion,
        created_at,
        updated_at
      `)
      .eq(
        'cuenta_id',
        cuenta.id
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      )

  if (
    errorRecibos
  ) {
    throw new Error(
      `No fue posible consultar los recibos: ${errorRecibos.message}`
    )
  }

  const mediosIds =
    [
      ...new Set(
        (
          recibos ||
          []
        )
          .map(
            recibo =>
              recibo.medio_pago_id
          )
          .filter(
            Boolean
          )
      ),
    ]

  const conceptosIds =
    [
      ...new Set(
        (
          recibos ||
          []
        )
          .map(
            recibo =>
              recibo.concepto_id
          )
          .filter(
            Boolean
          )
      ),
    ]

  const [
    mediosResult,
    conceptosResult,
  ] =
    await Promise.all([
      mediosIds.length >
      0
        ? supabase
            .from(
              'medios_pago_caja'
            )
            .select(`
              id,
              nombre
            `)
            .in(
              'id',
              mediosIds
            )
        : Promise.resolve({
            data:
              [],
            error:
              null,
          }),

      conceptosIds.length >
      0
        ? supabase
            .from(
              'conceptos_caja'
            )
            .select(`
              id,
              nombre
            `)
            .in(
              'id',
              conceptosIds
            )
        : Promise.resolve({
            data:
              [],
            error:
              null,
          }),
    ])

  if (
    mediosResult.error
  ) {
    throw new Error(
      `No fue posible consultar medios de pago: ${mediosResult.error.message}`
    )
  }

  if (
    conceptosResult.error
  ) {
    throw new Error(
      `No fue posible consultar conceptos: ${conceptosResult.error.message}`
    )
  }

  const mapaMedios =
    new Map(
      (
        mediosResult.data ||
        []
      ).map(
        item => [
          String(
            item.id
          ),
          item,
        ]
      )
    )

  const mapaConceptos =
    new Map(
      (
        conceptosResult.data ||
        []
      ).map(
        item => [
          String(
            item.id
          ),
          item,
        ]
      )
    )

  return {
    cuenta:
      cuentaEnriquecida,

    recibos:
      (
        recibos ||
        []
      ).map(
        recibo => ({
          ...recibo,

          consecutivo:
            consecutivoRecibo(
              recibo.id
            ),

          medio_pago:
            mapaMedios.get(
              String(
                recibo.medio_pago_id
              )
            ) ||
            null,

          concepto:
            mapaConceptos.get(
              String(
                recibo.concepto_id
              )
            ) ||
            null,
        })
      ),
  }
}

// =========================================================
// ACTUALIZAR ESTADO CUENTA
// =========================================================

async function actualizarEstadoCuenta(
  supabase,
  cuenta
) {
  if (
    mayusculas(
      cuenta.estado
    ) ===
    'ANULADA'
  ) {
    return cuenta
  }

  const totalAbonado =
    await obtenerTotalAbonado(
      supabase,
      cuenta.id
    )

  const estadoNuevo =
    calcularEstadoCuenta({
      valorTotal:
        cuenta.valor_total,

      totalAbonado,
    })

  if (
    estadoNuevo ===
    mayusculas(
      cuenta.estado
    )
  ) {
    return {
      ...cuenta,

      estado:
        estadoNuevo,

      total_abonado:
        totalAbonado,

      saldo:
        Math.max(
          0,
          redondear(
            Number(
              cuenta.valor_total
            ) -
            totalAbonado
          )
        ),
    }
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'cuentas_aprendiz'
      )
      .update({
        estado:
          estadoNuevo,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        'id',
        cuenta.id
      )
      .select('*')
      .single()

  if (
    error
  ) {
    throw new Error(
      `No fue posible actualizar el estado de la cuenta: ${error.message}`
    )
  }

  return {
    ...data,

    total_abonado:
      totalAbonado,

    saldo:
      Math.max(
        0,
        redondear(
          Number(
            cuenta.valor_total
          ) -
          totalAbonado
        )
      ),
  }
}

// =========================================================
// BUSCAR APRENDICES
// =========================================================

async function buscarAprendices(
  supabase,
  busqueda
) {
  const termino =
    limpiarBusqueda(
      busqueda
    )

  if (
    termino.length <
    2
  ) {
    return []
  }

  let consulta =
    supabase
      .from(
        'aprendices'
      )
      .select(`
        id,
        consecutivo,
        fecha_matricula,
        tipo_doc,
        documento,
        nombres,
        apellidos,
        celular,
        correo,
        convenio,
        convenio_id,
        origen_matricula,
        categorias,
        estado,
        created_at
      `)

  const categoria =
    mayusculas(
      termino
    )

  if (
    CATEGORIAS_VALIDAS.has(
      categoria
    )
  ) {
    consulta =
      consulta.overlaps(
        'categorias',
        [
          categoria,
        ]
      )
  } else {
    consulta =
      consulta.or(
        [
          `documento.ilike.%${termino}%`,
          `nombres.ilike.%${termino}%`,
          `apellidos.ilike.%${termino}%`,
          `consecutivo.ilike.%${termino}%`,
        ].join(
          ','
        )
      )
  }

  const {
    data,
    error,
  } =
    await consulta
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      )
      .limit(
        50
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible buscar aprendices: ${error.message}`
    )
  }

  const matriculas =
    data ||
    []

  if (
    matriculas.length ===
    0
  ) {
    return []
  }

  const matriculaIds =
    matriculas.map(
      matricula =>
        matricula.id
    )

  const {
    data:
      detalles,

    error:
      errorDetalles,
  } =
    await supabase
      .from(
        'cuentas_aprendiz_detalle'
      )
      .select(`
        cuenta_id,
        matricula_id,
        estado
      `)
      .in(
        'matricula_id',
        matriculaIds
      )
      .eq(
        'estado',
        'ACTIVO'
      )

  if (
    errorDetalles
  ) {
    throw new Error(
      `No fue posible consultar las obligaciones del aprendiz: ${errorDetalles.message}`
    )
  }

  const cuentaIds =
    [
      ...new Set(
        (
          detalles ||
          []
        )
          .map(
            detalle =>
              detalle.cuenta_id
          )
          .filter(
            Boolean
          )
      ),
    ]

  let cuentas =
    []

  if (
    cuentaIds.length >
    0
  ) {
    const {
      data:
        cuentasData,

      error:
        errorCuentas,
    } =
      await supabase
        .from(
          'cuentas_aprendiz'
        )
        .select(`
          id,
          documento,
          convenio_id,
          descripcion,
          valor_total,
          estado,
          origen_pago,
          origen_matricula
        `)
        .in(
          'id',
          cuentaIds
        )
        .neq(
          'estado',
          'ANULADA'
        )

    if (
      errorCuentas
    ) {
      throw new Error(
        `No fue posible consultar las cuentas del aprendiz: ${errorCuentas.message}`
      )
    }

    cuentas =
      cuentasData ||
      []
  }

  const cuentasEnriquecidas =
    await enriquecerCuentas(
      supabase,
      cuentas
    )

  const cuentasPorMatricula =
    new Map()

  for (
    const cuenta of
      cuentasEnriquecidas
  ) {
    for (
      const matricula of
        cuenta.matriculas ||
        []
    ) {
      const key =
        String(
          matricula.id
        )

      if (
        !cuentasPorMatricula.has(
          key
        )
      ) {
        cuentasPorMatricula.set(
          key,
          []
        )
      }

      cuentasPorMatricula
        .get(
          key
        )
        .push(
          cuenta
        )
    }
  }

  return matriculas.map(
    matricula => ({
      ...matricula,

      categoria:
        categoriaMatricula(
          matricula
        ),

      nombre_completo:
        [
          matricula.nombres,
          matricula.apellidos,
        ]
          .filter(
            Boolean
          )
          .join(
            ' '
          )
          .trim(),

      cuentas:
        cuentasPorMatricula.get(
          String(
            matricula.id
          )
        ) ||
        [],
    })
  )
}


// =========================================================
// BUSCAR CLIENTES DE CAJA
// =========================================================
//
// Consolida dos orígenes:
// 1. Aprendices/matrículas.
// 2. Clientes externos de ingresos libres anteriores.
//
// El frontend puede distinguirlos mediante tipo_cliente.
// Los clientes históricos se deduplican por documento y se
// conserva el recibo más reciente con sus datos disponibles.
// =========================================================

async function buscarClientesCaja(
  supabase,
  busqueda
) {
  const termino =
    limpiarBusqueda(
      busqueda
    )

  if (
    termino.length <
    2
  ) {
    return []
  }

  const [
    aprendices,
    clientesResult,
  ] =
    await Promise.all([
      buscarAprendices(
        supabase,
        termino
      ),

      supabase
        .from(
          'recibos_caja'
        )
        .select(`
          id,
          nombre_cliente,
          tipo_documento_cliente,
          documento_cliente,
          celular_cliente,
          correo_cliente,
          fecha,
          created_at
        `)
        .eq(
          'tipo_origen',
          'LIBRE'
        )
        .eq(
          'estado',
          'ACTIVO'
        )
        .or(
          [
            `nombre_cliente.ilike.%${termino}%`,
            `documento_cliente.ilike.%${termino}%`,
          ].join(
            ','
          )
        )
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        )
        .limit(
          100
        ),
    ])

  if (
    clientesResult.error
  ) {
    throw new Error(
      `No fue posible buscar clientes anteriores de Caja: ${clientesResult.error.message}`
    )
  }

  const resultadosAprendices =
    (
      aprendices ||
      []
    ).map(
      aprendiz => ({
        tipo_cliente:
          'APRENDIZ',

        id:
          aprendiz.id,

        matricula_id:
          aprendiz.id,

        consecutivo:
          aprendiz.consecutivo ||
          '',

        nombre_completo:
          aprendiz.nombre_completo ||
          [
            aprendiz.nombres,
            aprendiz.apellidos,
          ]
            .filter(
              Boolean
            )
            .join(
              ' '
            )
            .trim(),

        nombres:
          aprendiz.nombres ||
          '',

        apellidos:
          aprendiz.apellidos ||
          '',

        tipo_documento:
          aprendiz.tipo_doc ||
          'CC',

        documento:
          aprendiz.documento ||
          '',

        celular:
          aprendiz.celular ||
          '',

        correo:
          aprendiz.correo ||
          '',

        categorias:
          Array.isArray(
            aprendiz.categorias
          )
            ? aprendiz.categorias
            : [],

        estado:
          aprendiz.estado ||
          '',

        cuentas:
          Array.isArray(
            aprendiz.cuentas
          )
            ? aprendiz.cuentas
            : [],
      })
    )

  const clientesPorDocumento =
    new Map()

  for (
    const recibo of
      clientesResult.data ||
      []
  ) {
    const documento =
      texto(
        recibo.documento_cliente
      )

    const nombre =
      texto(
        recibo.nombre_cliente
      )

    if (
      !documento &&
      !nombre
    ) {
      continue
    }

    const clave =
      documento
        ? `DOC:${mayusculas(
            documento
          )}`
        : `NOMBRE:${normalizarComparacion(
            nombre
          )}`

    if (
      clientesPorDocumento.has(
        clave
      )
    ) {
      continue
    }

    clientesPorDocumento.set(
      clave,
      {
        tipo_cliente:
          'CLIENTE',

        id:
          `CLIENTE-${recibo.id}`,

        matricula_id:
          null,

        consecutivo:
          '',

        nombre_completo:
          nombre,

        nombres:
          nombre,

        apellidos:
          '',

        tipo_documento:
          recibo.tipo_documento_cliente ||
          'CC',

        documento,

        celular:
          texto(
            recibo.celular_cliente
          ),

        correo:
          texto(
            recibo.correo_cliente
          ),

        categorias:
          [],

        estado:
          '',

        cuentas:
          [],

        ultimo_ingreso_id:
          recibo.id,

        ultima_fecha:
          recibo.fecha ||
          null,
      }
    )
  }

  const documentosAprendices =
    new Set(
      resultadosAprendices
        .map(
          item =>
            mayusculas(
              item.documento
            )
        )
        .filter(
          Boolean
        )
    )

  const clientesExternos =
    [
      ...clientesPorDocumento.values(),
    ].filter(
      cliente =>
        !documentosAprendices.has(
          mayusculas(
            cliente.documento
          )
        )
    )

  return [
    ...resultadosAprendices,
    ...clientesExternos,
  ].slice(
    0,
    50
  )
}

// =========================================================
// CONSULTAR EGRESOS
// =========================================================

async function consultarEgresos({
  supabase,
  busqueda = '',
  fechaInicio = '',
  fechaFin = '',
}) {
  let consulta =
    supabase
      .from(
        'egresos_caja'
      )
      .select(`
        id,
        concepto_id,
        medio_pago_id,
        fecha,
        beneficiario,
        tipo_documento_beneficiario,
        documento_beneficiario,
        descripcion,
        valor,
        numero_factura,
        numero_cuenta_cobro,
        referencia_pago,
        soporte_url,
        pagado_por,
        observaciones,
        estado,
        motivo_anulacion,
        usuario_anulacion,
        fecha_anulacion,
        created_at,
        updated_at
      `)

  const termino =
    limpiarBusqueda(
      busqueda
    )

  if (
    termino
  ) {
    consulta =
      consulta.or(
        [
          `beneficiario.ilike.%${termino}%`,
          `documento_beneficiario.ilike.%${termino}%`,
          `descripcion.ilike.%${termino}%`,
          `numero_factura.ilike.%${termino}%`,
          `numero_cuenta_cobro.ilike.%${termino}%`,
        ].join(
          ','
        )
      )
  }

  if (
    fechaInicio
  ) {
    consulta =
      consulta.gte(
        'fecha',
        fechaInicio
      )
  }

  if (
    fechaFin
  ) {
    consulta =
      consulta.lte(
        'fecha',
        fechaFin
      )
  }

  const {
    data,
    error,
  } =
    await consulta
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      )
      .limit(
        LIMITE_CONSULTA
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar los egresos: ${error.message}`
    )
  }

  const egresos =
    data ||
    []

  const conceptoIds =
    [
      ...new Set(
        egresos
          .map(
            item =>
              item.concepto_id
          )
          .filter(
            Boolean
          )
      ),
    ]

  const mediosIds =
    [
      ...new Set(
        egresos
          .map(
            item =>
              item.medio_pago_id
          )
          .filter(
            Boolean
          )
      ),
    ]

  const [
    conceptosResult,
    mediosResult,
  ] =
    await Promise.all([
      conceptoIds.length >
      0
        ? supabase
            .from(
              'conceptos_caja'
            )
            .select(`
              id,
              nombre
            `)
            .in(
              'id',
              conceptoIds
            )
        : Promise.resolve({
            data:
              [],
            error:
              null,
          }),

      mediosIds.length >
      0
        ? supabase
            .from(
              'medios_pago_caja'
            )
            .select(`
              id,
              nombre
            `)
            .in(
              'id',
              mediosIds
            )
        : Promise.resolve({
            data:
              [],
            error:
              null,
          }),
    ])

  if (
    conceptosResult.error
  ) {
    throw new Error(
      `No fue posible consultar conceptos: ${conceptosResult.error.message}`
    )
  }

  if (
    mediosResult.error
  ) {
    throw new Error(
      `No fue posible consultar medios de pago: ${mediosResult.error.message}`
    )
  }

  const mapaConceptos =
    new Map(
      (
        conceptosResult.data ||
        []
      ).map(
        item => [
          String(
            item.id
          ),
          item,
        ]
      )
    )

  const mapaMedios =
    new Map(
      (
        mediosResult.data ||
        []
      ).map(
        item => [
          String(
            item.id
          ),
          item,
        ]
      )
    )

  return egresos.map(
    egreso => ({
      ...egreso,

      consecutivo:
        consecutivoEgreso(
          egreso.id
        ),

      concepto:
        mapaConceptos.get(
          String(
            egreso.concepto_id
          )
        ) ||
        null,

      medio_pago:
        mapaMedios.get(
          String(
            egreso.medio_pago_id
          )
        ) ||
        null,
    })
  )
}

// =========================================================
// RESUMEN
// =========================================================

async function obtenerResumen({
  supabase,
  fechaInicio,
  fechaFin,
}) {
  const inicio =
    fechaInicio ||
    hoyColombia()

  const fin =
    fechaFin ||
    inicio

  const [
    recibosResult,
    egresosResult,
  ] =
    await Promise.all([
      supabase
        .from(
          'recibos_caja'
        )
        .select(`
          id,
          valor,
          estado,
          medio_pago_id
        `)
        .gte(
          'fecha',
          inicio
        )
        .lte(
          'fecha',
          fin
        ),

      supabase
        .from(
          'egresos_caja'
        )
        .select(`
          id,
          valor,
          estado,
          medio_pago_id
        `)
        .gte(
          'fecha',
          inicio
        )
        .lte(
          'fecha',
          fin
        ),
    ])

  if (
    recibosResult.error
  ) {
    throw new Error(
      `No fue posible consultar ingresos: ${recibosResult.error.message}`
    )
  }

  if (
    egresosResult.error
  ) {
    throw new Error(
      `No fue posible consultar egresos: ${egresosResult.error.message}`
    )
  }

  const recibos =
    recibosResult.data ||
    []

  const egresos =
    egresosResult.data ||
    []

  const ingresosActivos =
    recibos.filter(
      item =>
        item.estado ===
        'ACTIVO'
    )

  const egresosActivos =
    egresos.filter(
      item =>
        item.estado ===
        'ACTIVO'
    )

  const totalIngresos =
    redondear(
      ingresosActivos.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.valor ||
            0
          ),
        0
      )
    )

  const totalEgresos =
    redondear(
      egresosActivos.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.valor ||
            0
          ),
        0
      )
    )

  const reciboIds =
    ingresosActivos.map(
      item =>
        item.id
    )

  let detallesIngresos =
    []

  if (
    reciboIds.length >
    0
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          'recibos_caja_detalle'
        )
        .select(`
          recibo_id,
          concepto_id,
          valor
        `)
        .in(
          'recibo_id',
          reciboIds
        )

    if (
      error
    ) {
      throw new Error(
        `No fue posible consultar el detalle de los ingresos: ${error.message}`
      )
    }

    detallesIngresos =
      data ||
      []
  }

  const conceptoIds =
    [
      ...new Set(
        detallesIngresos
          .map(
            item =>
              item.concepto_id
          )
          .filter(
            Boolean
          )
      ),
    ]

  let conceptos =
    []

  if (
    conceptoIds.length >
    0
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          'conceptos_caja'
        )
        .select(`
          id,
          nombre
        `)
        .in(
          'id',
          conceptoIds
        )

    if (
      error
    ) {
      throw new Error(
        `No fue posible consultar los conceptos del resumen: ${error.message}`
      )
    }

    conceptos =
      data ||
      []
  }

  const mapaConceptos =
    new Map(
      conceptos.map(
        concepto => [
          String(
            concepto.id
          ),
          mayusculas(
            concepto.nombre
          ),
        ]
      )
    )

  const ingresosPorConcepto =
    {}

  for (
    const detalle of
      detallesIngresos
  ) {
    const nombre =
      mapaConceptos.get(
        String(
          detalle.concepto_id
        )
      ) ||
      'OTRO INGRESO'

    ingresosPorConcepto[
      nombre
    ] =
      redondear(
        (
          ingresosPorConcepto[
            nombre
          ] ||
          0
        ) +
        Number(
          detalle.valor ||
          0
        )
      )
  }

  const totalCursos =
    redondear(
      ingresosPorConcepto.CURSO ||
      0
    )

  const totalRefuerzos =
    redondear(
      ingresosPorConcepto[
        'REFUERZO PRACTICO'
      ] ||
      0
    )

  const totalExamenesMedicos =
    redondear(
      (
        ingresosPorConcepto[
          'EXAMEN MEDICO'
        ] ||
        0
      ) +
      (
        ingresosPorConcepto[
          'EXAMEN MÉDICO'
        ] ||
        0
      )
    )

  return {
    fecha_inicio:
      inicio,

    fecha_fin:
      fin,

    total_ingresos:
      totalIngresos,

    total_egresos:
      totalEgresos,

    movimiento_neto:
      redondear(
        totalIngresos -
        totalEgresos
      ),

    cantidad_recibos:
      ingresosActivos.length,

    cantidad_egresos:
      egresosActivos.length,

    recibos_anulados:
      recibos.filter(
        item =>
          item.estado ===
          'ANULADO'
      ).length,

    egresos_anulados:
      egresos.filter(
        item =>
          item.estado ===
          'ANULADO'
      ).length,

    total_cursos:
      totalCursos,

    total_refuerzos:
      totalRefuerzos,

    total_examenes_medicos:
      totalExamenesMedicos,

    ingresos_por_concepto:
      ingresosPorConcepto,
  }
}

// =========================================================
// CONSULTAR CIERRES
// =========================================================

async function consultarCierres(
  supabase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'cierres_caja'
      )
      .select('*')
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      )
      .limit(
        100
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar los cierres de Caja: ${error.message}`
    )
  }

  return (
    data ||
    []
  ).map(
    cierre => ({
      ...cierre,

      consecutivo:
        consecutivoCierre(
          cierre.id
        ),
    })
  )
}

// =========================================================
// GET
// =========================================================

export async function GET(
  request
) {
  try {
    const {
      supabaseAdmin,
      empresa,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request
      )

    const supabase =
      supabaseAdmin

    const {
      searchParams,
    } =
      new URL(
        request.url
      )

    const recurso =
      texto(
        searchParams.get(
          'recurso'
        )
      ).toLowerCase()

    // =====================================================
    // PARÁMETROS
    // =====================================================

    if (
      recurso ===
      'parametros'
    ) {
      const parametros =
        await obtenerParametros(
          supabase
        )

      return NextResponse.json({
        status:
          'success',

        data:
          parametros,

        empresa:
          empresaRespuesta(
            empresa
          ),
      })
    }

        // =====================================================
    // CONCEPTOS DE CAJA
    // =====================================================

    if (
      recurso ===
      'conceptos'
    ) {
      const incluirInactivos =
        texto(
          searchParams.get(
            'todos'
          )
        ) ===
        '1'

      let consulta =
        supabase
          .from(
            'conceptos_caja'
          )
          .select(`
            id,
            nombre,
            descripcion,
            naturaleza,
            requiere_aprendiz,
            activo,
            created_at,
            updated_at
          `)

      if (
        !incluirInactivos
      ) {
        consulta =
          consulta.eq(
            'activo',
            true
          )
      }

      const {
        data,
        error,
      } =
        await consulta.order(
          'nombre',
          {
            ascending:
              true,
          }
        )

      if (
        error
      ) {
        throw new Error(
          `No fue posible consultar los conceptos de Caja: ${error.message}`
        )
      }

      return NextResponse.json({
        status:
          'success',

        data:
          data ||
          [],

        total:
          data?.length ||
          0,

        empresa:
          empresaRespuesta(
            empresa
          ),
      })
    }

        // =====================================================
    // HISTORIAL DE INGRESOS LIBRES
    // =====================================================

    if (
      recurso ===
      'ingresos_libres'
    ) {
      const fechaInicio =
        texto(
          searchParams.get(
            'fecha_inicio'
          )
        )

      const fechaFin =
        texto(
          searchParams.get(
            'fecha_fin'
          )
        )

      const buscar =
        limpiarBusqueda(
          searchParams.get(
            'buscar'
          )
        )

      // ===================================================
      // 1. CONSULTAR RECIBOS LIBRES
      // ===================================================

      let consulta =
        supabase
          .from(
            'recibos_caja'
          )
          .select(`
            id,
            cuenta_id,
            matricula_id,
            documento,
            concepto_id,
            medio_pago_id,
            fecha,
            descripcion,
            valor,
            pagado_por,
            nombre_pagador,
            documento_pagador,
            referencia_pago,
            recibido_por,
            observaciones,
            estado,
            created_at,
            updated_at,
            nombre_cliente, 
            tipo_documento_cliente, 
            documento_cliente, 
            celular_cliente, 
            correo_cliente, 
            tipo_origen,
            categoria,
            cantidad_clases_refuerzo
          `)
          .eq(
            'tipo_origen',
            'LIBRE'
          )

      // ===================================================
      // FILTRO FECHA INICIAL
      // ===================================================

      if (
        fechaInicio
      ) {
        consulta =
          consulta.gte(
            'fecha',
            fechaInicio
          )
      }

      // ===================================================
      // FILTRO FECHA FINAL
      // ===================================================

      if (
        fechaFin
      ) {
        consulta =
          consulta.lte(
            'fecha',
            fechaFin
          )
      }

      // ===================================================
      // BÚSQUEDA
      // ===================================================

      if (
        buscar
      ) {
        consulta =
          consulta.or(
            [
              `nombre_cliente.ilike.%${buscar}%`,
              `documento_cliente.ilike.%${buscar}%`,
              `descripcion.ilike.%${buscar}%`,
            ].join(
              ','
            )
          )
      }

      const {
        data:
          recibos,

        error:
          errorRecibos,
      } =
        await consulta
          .order(
            'fecha',
            {
              ascending:
                false,
            }
          )
          .order(
            'id',
            {
              ascending:
                false,
            }
          )
          .limit(
            200
          )

      if (
        errorRecibos
      ) {
        throw new Error(
          `No fue posible consultar los ingresos libres: ${errorRecibos.message}`
        )
      }

      const listaRecibos =
        recibos ||
        []

      // ===================================================
      // SIN RESULTADOS
      // ===================================================

      if (
        listaRecibos.length ===
        0
      ) {
        return NextResponse.json({
          status:
            'success',

          data:
            [],

          total:
            0,

          empresa:
            empresaRespuesta(
              empresa
            ),
        })
      }

      // ===================================================
      // 2. IDENTIFICAR IDS RELACIONADOS
      // ===================================================

      const conceptoIds =
        [
          ...new Set(
            listaRecibos
              .map(
                recibo =>
                  recibo.concepto_id
              )
              .filter(
                Boolean
              )
          ),
        ]

      const medioPagoIds =
        [
          ...new Set(
            listaRecibos
              .map(
                recibo =>
                  recibo.medio_pago_id
              )
              .filter(
                Boolean
              )
          ),
        ]

      const reciboIds =
        listaRecibos
          .map(
            recibo =>
              recibo.id
          )
          .filter(
            Boolean
          )

      // ===================================================
      // 3. CONSULTAR RELACIONES POR SEPARADO
      // ===================================================
      //
      // No usamos relaciones embebidas de PostgREST.
      //
      // Así evitamos depender de relaciones/FK presentes
      // en el schema cache.
      //
      // ===================================================

      const [
        conceptosResult,
        mediosResult,
        detallesResult,
      ] =
        await Promise.all([
          conceptoIds.length >
          0
            ? supabase
                .from(
                  'conceptos_caja'
                )
                .select(`
                  id,
                  nombre,
                  descripcion,
                  naturaleza
                `)
                .in(
                  'id',
                  conceptoIds
                )
            : Promise.resolve({
                data:
                  [],
                error:
                  null,
              }),

          medioPagoIds.length >
          0
            ? supabase
                .from(
                  'medios_pago_caja'
                )
                .select(`
                  id,
                  nombre
                `)
                .in(
                  'id',
                  medioPagoIds
                )
            : Promise.resolve({
                data:
                  [],
                error:
                  null,
              }),

          reciboIds.length >
          0
            ? supabase
                .from(
                  'recibos_caja_detalle'
                )
                .select(`
                  id,
                  recibo_id,
                  concepto_id,
                  descripcion,
                  categorias,
                  valor,
                  orden_aplicacion
                `)
                .in(
                  'recibo_id',
                  reciboIds
                )
                .order(
                  'orden_aplicacion',
                  {
                    ascending:
                      true,
                  }
                )
            : Promise.resolve({
                data:
                  [],
                error:
                  null,
              }),
        ])

      // ===================================================
      // VALIDAR CONSULTAS
      // ===================================================

      if (
        conceptosResult.error
      ) {
        throw new Error(
          `No fue posible consultar los conceptos de los ingresos libres: ${conceptosResult.error.message}`
        )
      }

      if (
        mediosResult.error
      ) {
        throw new Error(
          `No fue posible consultar los medios de pago de los ingresos libres: ${mediosResult.error.message}`
        )
      }

      if (
        detallesResult.error
      ) {
        throw new Error(
          `No fue posible consultar el detalle de los ingresos libres: ${detallesResult.error.message}`
        )
      }

      // ===================================================
      // 4. CREAR MAPAS
      // ===================================================

      const mapaConceptos =
        new Map(
          (
            conceptosResult.data ||
            []
          ).map(
            concepto => [
              String(
                concepto.id
              ),
              concepto,
            ]
          )
        )

      const mapaMedios =
        new Map(
          (
            mediosResult.data ||
            []
          ).map(
            medio => [
              String(
                medio.id
              ),
              medio,
            ]
          )
        )

      const detallesPorRecibo =
        new Map()

      for (
        const detalle of
          detallesResult.data ||
          []
      ) {
        const key =
          String(
            detalle.recibo_id
          )

        if (
          !detallesPorRecibo.has(
            key
          )
        ) {
          detallesPorRecibo.set(
            key,
            []
          )
        }

        detallesPorRecibo
          .get(
            key
          )
          .push(
            detalle
          )
      }

      // ===================================================
      // 5. ARMAR RESPUESTA
      // ===================================================

      const ingresos =
        listaRecibos.map(
          recibo => ({
            ...recibo,

            consecutivo:
              consecutivoRecibo(
                recibo.id
              ),

            concepto:
              recibo.concepto_id
                ? mapaConceptos.get(
                    String(
                      recibo.concepto_id
                    )
                  ) ||
                  null
                : null,

            medio_pago:
              recibo.medio_pago_id
                ? mapaMedios.get(
                    String(
                      recibo.medio_pago_id
                    )
                  ) ||
                  null
                : null,

            detalles:
              detallesPorRecibo.get(
                String(
                  recibo.id
                )
              ) ||
              [],
          })
        )

      // ===================================================
      // RESPUESTA
      // ===================================================

      return NextResponse.json({
        status:
          'success',

        data:
          ingresos,

        total:
          ingresos.length,

        empresa:
          empresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // BUSCAR CLIENTES DE CAJA
    // =====================================================

    if (
      recurso ===
      'buscar_clientes'
    ) {
      const q =
        texto(
          searchParams.get(
            'q'
          )
        )

      if (
        q.length <
        2
      ) {
        return NextResponse.json({
          status:
            'success',

          data:
            [],

          total:
            0,

          empresa:
            empresaRespuesta(
              empresa
            ),
        })
      }

      const data =
        await buscarClientesCaja(
          supabase,
          q
        )

      return NextResponse.json({
        status:
          'success',

        data,

        total:
          data.length,

        empresa:
          empresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // BUSCAR APRENDICES
    // =====================================================

    if (
      recurso ===
      'buscar_aprendices'
    ) {
      const q =
        texto(
          searchParams.get(
            'q'
          )
        )

      if (
        q.length <
        2
      ) {
        return NextResponse.json({
          status:
            'success',

          data:
            [],

          total:
            0,

          empresa:
            empresaRespuesta(
              empresa
            ),
        })
      }

      const data =
        await buscarAprendices(
          supabase,
          q
        )

      return NextResponse.json({
        status:
          'success',

        data,

        total:
          data.length,

        empresa:
          empresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // CUENTAS
    // =====================================================

    if (
      recurso ===
        'cuentas' ||
      recurso ===
        'obligaciones'
    ) {
      const data =
        await consultarCuentas({
          supabase,

          busqueda:
            texto(
              searchParams.get(
                'q'
              )
            ),

          estado:
            texto(
              searchParams.get(
                'estado'
              )
            ),

          convenioId:
            toInt(
              searchParams.get(
                'convenio_id'
              )
            ),
        })

      return NextResponse.json({
        status:
          'success',

        data,

        total:
          data.length,

        empresa:
          empresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // INGRESOS
    // =====================================================
    //
    // Compatible con la pantalla de ingresos.
    //
    // Devuelve:
    // - obligaciones
    // - medios_pago
    // - resumen
    //
    // =====================================================

    if (
      recurso ===
      'ingresos'
    ) {
      const fecha =
        fechaValida(
          searchParams.get(
            'fecha'
          )
        )
          ? searchParams.get(
              'fecha'
            )
          : hoyColombia()

      const [
        obligaciones,
        parametros,
        resumen,
      ] =
        await Promise.all([
          consultarCuentas({
            supabase,

            busqueda:
              texto(
                searchParams.get(
                  'q'
                )
              ),

            estado:
              texto(
                searchParams.get(
                  'estado'
                )
              ),

            convenioId:
              toInt(
                searchParams.get(
                  'convenio_id'
                )
              ),
          }),

          obtenerParametros(
            supabase
          ),

          obtenerResumen({
            supabase,

            fechaInicio:
              fecha,

            fechaFin:
              fecha,
          }),
        ])

      return NextResponse.json({
        status:
          'success',

        data: {
          obligaciones,

          medios_pago:
            parametros
              .medios_pago,

          conceptos:
            parametros
              .conceptos,

          convenios:
            parametros
              .convenios,

          resumen,
        },

        empresa:
          empresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // DETALLE CUENTA
    // =====================================================

    if (
      recurso ===
        'detalle_cuenta' ||
      recurso ===
        'obligacion'
    ) {
      const cuentaId =
        toInt(
          searchParams.get(
            'cuenta_id'
          )
        )

      const data =
        await obtenerDetalleCuenta(
          supabase,
          cuentaId
        )

      return NextResponse.json({
        status:
          'success',

        data,

        empresa:
          empresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // EGRESOS
    // =====================================================

    if (
      recurso ===
      'egresos'
    ) {
      const fechaInicio =
        texto(
          searchParams.get(
            'fecha_inicio'
          )
        )

      const fechaFin =
        texto(
          searchParams.get(
            'fecha_fin'
          )
        )

      const data =
        await consultarEgresos({
          supabase,

          busqueda:
            texto(
              searchParams.get(
                'q'
              )
            ),

          fechaInicio,

          fechaFin,
        })

      return NextResponse.json({
        status:
          'success',

        data,

        total:
          data.length,

        empresa:
          empresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // RESUMEN
    // =====================================================

    if (
      recurso ===
      'resumen'
    ) {
      const data =
        await obtenerResumen({
          supabase,

          fechaInicio:
            texto(
              searchParams.get(
                'fecha_inicio'
              )
            ),

          fechaFin:
            texto(
              searchParams.get(
                'fecha_fin'
              )
            ),
        })

      return NextResponse.json({
        status:
          'success',

        data,

        empresa:
          empresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // CIERRES
    // =====================================================

    if (
      recurso ===
      'cierres'
    ) {
      const data =
        await consultarCierres(
          supabase
        )

      return NextResponse.json({
        status:
          'success',

        data,

        total:
          data.length,

        empresa:
          empresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // AUDITORÍA
    // =====================================================

    if (
      recurso ===
      'auditoria'
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            'auditoria_caja'
          )
          .select('*')
          .order(
            'fecha_evento',
            {
              ascending:
                false,
            }
          )
          .limit(
            200
          )

      if (
        error
      ) {
        throw new Error(
          `No fue posible consultar la auditoría: ${error.message}`
        )
      }

      return NextResponse.json({
        status:
          'success',

        data:
          data ||
          [],

        total:
          data?.length ||
          0,

        empresa:
          empresaRespuesta(
            empresa
          ),
      })
    }

    return NextResponse.json(
      {
        status:
          'error',

        message:
          'Recurso de Caja no válido.',
      },
      {
        status:
          400,
      }
    )
  } catch (
    error
  ) {
    console.error(
      'Error GET /api/admin/caja:',
      error
    )

    return respuestaError(
      error
    )
  }
}

// =========================================================
// POST
// =========================================================

export async function POST(
  request
) {
  try {
    const body =
      await request.json()

    const {
      supabaseAdmin,
      empresa,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    const supabase =
      supabaseAdmin

    const accion =
      texto(
        body?.accion
      ).toLowerCase()

    const usuario =
      usuarioOperacion(
        body
      )

    if (
      !usuario
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'El usuario es obligatorio para realizar movimientos de Caja.',
        },
        {
          status:
            400,
        }
      )
    }

    if (
  accion ===
  'crear_concepto'
) {
  const nombre =
    mayusculas(
      body?.nombre
    )

  const naturaleza =
    mayusculas(
      body?.naturaleza ||
      'INGRESO'
    )

  if (
    !nombre
  ) {
    return NextResponse.json(
      {
        status:
          'error',

        message:
          'El nombre del concepto es obligatorio.',
      },
      {
        status:
          400,
      }
    )
  }

  if (
    ![
      'INGRESO',
      'EGRESO',
      'AMBOS',
    ].includes(
      naturaleza
    )
  ) {
    return NextResponse.json(
      {
        status:
          'error',

        message:
          'La naturaleza del concepto no es válida.',
      },
      {
        status:
          400,
      }
    )
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'conceptos_caja'
      )
      .insert({
        nombre,

        descripcion:
          texto(
            body?.descripcion
          ) ||
          null,

        naturaleza,

        requiere_aprendiz:
          body?.requiere_aprendiz ===
          true,

        activo:
          true,

        updated_at:
          new Date()
            .toISOString(),
      })
      .select('*')
      .single()

  if (
    error
  ) {
    if (
      error.code ===
      '23505'
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'Ya existe un concepto con ese nombre.',
        },
        {
          status:
            409,
        }
      )
    }

    throw new Error(
      `No fue posible crear el concepto: ${error.message}`
    )
  }

  return NextResponse.json(
    {
      status:
        'success',

      message:
        'Concepto creado correctamente.',

      data,
    },
    {
      status:
        201,
    }
  )
}

if (
  accion ===
  'editar_concepto'
) {
  const conceptoId =
    toInt(
      body?.concepto_id
    )

  if (
    !conceptoId
  ) {
    return NextResponse.json(
      {
        status:
          'error',

        message:
          'El concepto es obligatorio.',
      },
      {
        status:
          400,
      }
    )
  }

  const {
    data:
      anterior,

    error:
      errorConsulta,
  } =
    await supabase
      .from(
        'conceptos_caja'
      )
      .select('*')
      .eq(
        'id',
        conceptoId
      )
      .maybeSingle()

  if (
    errorConsulta
  ) {
    throw new Error(
      `No fue posible consultar el concepto: ${errorConsulta.message}`
    )
  }

  if (
    !anterior
  ) {
    return NextResponse.json(
      {
        status:
          'error',

        message:
          'No se encontró el concepto.',
      },
      {
        status:
          404,
      }
    )
  }

  const nombre =
    mayusculas(
      body?.nombre ||
      anterior.nombre
    )

  const naturaleza =
    mayusculas(
      body?.naturaleza ||
      anterior.naturaleza
    )

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'conceptos_caja'
      )
      .update({
        nombre,

        descripcion:
          body?.descripcion !==
          undefined
            ? texto(
                body.descripcion
              ) ||
              null
            : anterior.descripcion,

        naturaleza,

        requiere_aprendiz:
          body?.requiere_aprendiz !==
          undefined
            ? body.requiere_aprendiz ===
              true
            : anterior.requiere_aprendiz,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        'id',
        conceptoId
      )
      .select('*')
      .single()

  if (
    error
  ) {
    if (
      error.code ===
      '23505'
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'Ya existe otro concepto con ese nombre.',
        },
        {
          status:
            409,
        }
      )
    }

    throw new Error(
      `No fue posible editar el concepto: ${error.message}`
    )
  }

  return NextResponse.json({
    status:
      'success',

    message:
      'Concepto actualizado correctamente.',

    data,
  })
}

if (
  accion ===
    'activar_concepto' ||
  accion ===
    'desactivar_concepto'
) {
  const conceptoId =
    toInt(
      body?.concepto_id
    )

  if (
    !conceptoId
  ) {
    return NextResponse.json(
      {
        status:
          'error',

        message:
          'El concepto es obligatorio.',
      },
      {
        status:
          400,
      }
    )
  }

  const activo =
    accion ===
    'activar_concepto'

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'conceptos_caja'
      )
      .update({
        activo,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        'id',
        conceptoId
      )
      .select('*')
      .single()

  if (
    error
  ) {
    throw new Error(
      `No fue posible ${
        activo
          ? 'activar'
          : 'desactivar'
      } el concepto: ${error.message}`
    )
  }

  return NextResponse.json({
    status:
      'success',

    message:
      activo
        ? 'Concepto activado correctamente.'
        : 'Concepto desactivado correctamente.',

    data,
  })
}

    // =====================================================
    // REGISTRAR INGRESO LIBRE
    // =====================================================
    //
    // Para ingresos que no dependen de una matrícula:
    //
    // - EXAMEN MEDICO
    // - MANEJO DEFENSIVO
    // - PRUEBA TEORICA
    // - PRUEBA PRACTICA
    // - OTROS SERVICIOS
    //
    // No crea cuentas_aprendiz.
    //
    // Crea:
    // 1. recibos_caja
    // 2. recibos_caja_detalle
    //
    // =====================================================

    if (
      accion ===
      'registrar_ingreso_libre'
    ) {
      const concepto =
        await obtenerConcepto(
          supabase,
          body?.concepto_id
        )

      if (
        concepto.activo !==
        true
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El concepto seleccionado está inactivo.',
          },
          {
            status:
              409,
          }
        )
      }

      if (
        ![
          'INGRESO',
          'AMBOS',
        ].includes(
          mayusculas(
            concepto.naturaleza
          )
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El concepto seleccionado no corresponde a un ingreso.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        concepto.requiere_aprendiz ===
        true
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'Este concepto requiere estar asociado a un aprendiz.',
          },
          {
            status:
              409,
          }
        )
      }

      const medioPago =
        await obtenerMedioPago(
          supabase,
          body?.medio_pago_id
        )

      const valor =
        toNumero(
          body?.valor
        )

      if (
        !valor ||
        valor <=
        0
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El valor recibido debe ser mayor que cero.',
          },
          {
            status:
              400,
          }
        )
      }

      const nombreCliente =
        mayusculas(
          body?.nombre_cliente
        )

      const documentoCliente =
        texto(
          body?.documento_cliente
        )

      const tipoDocumentoCliente =
        mayusculas(
          body?.tipo_documento_cliente
        ) ||
        null

      const celularCliente =
        texto(
          body?.celular_cliente
        ) ||
        null

      const correoCliente =
        texto(
          body?.correo_cliente
        ) ||
        null

      if (
        !nombreCliente
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El nombre del cliente es obligatorio.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        !documentoCliente
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El documento del cliente es obligatorio.',
          },
          {
            status:
              400,
          }
        )
      }
      // ===================================================
      // DATOS ESPECÍFICOS PARA REFUERZO PRÁCTICO
      // ===================================================

      const esRefuerzoPractico =
        normalizarComparacion(
          concepto?.nombre
        ) ===
        'REFUERZO PRACTICO'

      let categoriaRefuerzo =
        null

      let cantidadClasesRefuerzo =
        null

      if (
        esRefuerzoPractico
      ) {
        categoriaRefuerzo =
          mayusculas(
            body?.categoria
          )

        if (
          !CATEGORIAS_VALIDAS.has(
            categoriaRefuerzo
          )
        ) {
          return NextResponse.json(
            {
              status:
                'error',

              message:
                'Seleccione una categoría válida para las clases de refuerzo.',
            },
            {
              status:
                400,
            }
          )
        }

        cantidadClasesRefuerzo =
          toInt(
            body?.cantidad_clases_refuerzo
          )

        if (
          !cantidadClasesRefuerzo ||
          cantidadClasesRefuerzo <=
            0
        ) {
          return NextResponse.json(
            {
              status:
                'error',

              message:
                'La cantidad de clases de refuerzo debe ser mayor que cero.',
            },
            {
              status:
                400,
            }
          )
        }
      }
      const descripcion =
        mayusculas(
          body?.descripcion ||
          concepto.nombre
        )

      // ===================================================
      // CREAR RECIBO
      // ===================================================

      const {
        data:
          recibo,

        error:
          errorRecibo,
      } =
        await supabase
          .from(
            'recibos_caja'
          )
          .insert({
            cuenta_id:
              null,

            matricula_id:
              null,

            documento:
              documentoCliente,

            categoria:
              categoriaRefuerzo,

            cantidad_clases_refuerzo:
              cantidadClasesRefuerzo,

            concepto_id:
              concepto.id,

            medio_pago_id:
              medioPago.id,

            fecha:
              fechaValida(
                body?.fecha
              )
                ? body.fecha
                : hoyColombia(),

            descripcion,

            valor,

            pagado_por:
              'TERCERO',

            nombre_pagador:
              nombreCliente,

            documento_pagador:
              documentoCliente,

            referencia_pago:
              texto(
                body?.referencia_pago
              ) ||
              null,

            recibido_por:
              usuario,

            observaciones:
              texto(
                body?.observaciones
              ) ||
              null,

            estado:
              'ACTIVO',

            tipo_origen:
              'LIBRE',

            nombre_cliente:
              nombreCliente,

            tipo_documento_cliente:
              tipoDocumentoCliente,

            documento_cliente:
              documentoCliente,

            celular_cliente:
              celularCliente,

            correo_cliente:
              correoCliente,

            updated_at:
              new Date()
                .toISOString(),
          })
          .select('*')
          .single()

      if (
        errorRecibo
      ) {
        throw new Error(
          `No fue posible registrar el ingreso: ${errorRecibo.message}`
        )
      }

      // ===================================================
      // GUARDAR DETALLE DEL INGRESO
      // ===================================================

      const {
        data:
          detalleRecibo,

        error:
          errorDetalle,
      } =
        await supabase
          .from(
            'recibos_caja_detalle'
          )
          .insert({
            recibo_id:
              recibo.id,

            cuenta_detalle_id:
              null,

            concepto_id:
              concepto.id,

            descripcion,

            categorias:
          esRefuerzoPractico
            ? [
                categoriaRefuerzo,
              ]
            : null,

            valor,

            orden_aplicacion:
              1,

            updated_at:
              new Date()
                .toISOString(),
          })
          .select('*')
          .single()

      if (
        errorDetalle
      ) {
        // Evitamos dejar un recibo sin detalle.
        await supabase
          .from(
            'recibos_caja'
          )
          .delete()
          .eq(
            'id',
            recibo.id
          )

        throw new Error(
          `No fue posible guardar el detalle del ingreso: ${errorDetalle.message}`
        )
      }

      // ===================================================
      // AUDITORÍA
      // ===================================================

      try {
        await registrarAuditoria({
          supabase,

          usuario,

          accion:
            'CREAR_INGRESO_LIBRE',

          entidad:
            'RECIBO_CAJA',

          entidadId:
            recibo.id,

          documento:
            documentoCliente,

          consecutivoReferencia:
            consecutivoRecibo(
              recibo.id
            ),

          descripcion:
            `Ingreso libre ${concepto.nombre} por $${valor}.`,

          datosNuevos: {
            recibo,

            detalle:
              detalleRecibo,

            cliente: {
              nombre:
                nombreCliente,

              tipo_documento:
                tipoDocumentoCliente,

              documento:
                documentoCliente,

              celular:
                celularCliente,

              correo:
                correoCliente,
            },

            concepto,

            medio_pago:
              medioPago,
          },

          observaciones:
            body?.observaciones,
        })
      } catch (
        errorAuditoria
      ) {
        await supabase
          .from(
            'recibos_caja'
          )
          .delete()
          .eq(
            'id',
            recibo.id
          )

        throw errorAuditoria
      }

      // ===================================================
      // RESPUESTA
      // ===================================================

      return NextResponse.json(
        {
          status:
            'success',

          message:
            'Ingreso registrado correctamente.',

          data: {
            recibo: {
              ...recibo,

              consecutivo:
                consecutivoRecibo(
                  recibo.id
                ),

              concepto,

              medio_pago:
                medioPago,

              detalle:
                detalleRecibo,
            },
          },

          empresa:
            empresaRespuesta(
              empresa
            ),
        },
        {
          status:
            201,
        }
      )
    }
    // =====================================================
    // CREAR CUENTA EXTRAORDINARIA
    // =====================================================
    //
    // Ya NO se usa para la obligación normal del curso.
    //
    // La obligación normal nace desde matrícula.
    //
    // Este recurso queda disponible para conceptos adicionales:
    // - REFUERZO PRACTICO
    // - EXAMEN MEDICO posterior
    // - OTROS
    //
    // Crea:
    // 1 cuentas_aprendiz
    // 1 cuentas_aprendiz_detalle
    //
    // =====================================================

    if (
      accion ===
      'crear_cuenta'
    ) {
      const matricula =
        await obtenerMatricula(
          supabase,
          body?.matricula_id
        )

      const concepto =
        await obtenerConcepto(
          supabase,
          body?.concepto_id
        )

      if (
        ![
          'INGRESO',
          'AMBOS',
        ].includes(
          mayusculas(
            concepto.naturaleza
          )
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El concepto seleccionado no corresponde a un ingreso.',
          },
          {
            status:
              400,
          }
        )
      }

      const valorTotal =
        toNumero(
          body?.valor_total
        )

      if (
        !valorTotal ||
        valorTotal <=
          0
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El valor de la obligación debe ser mayor que cero.',
          },
          {
            status:
              400,
          }
        )
      }

      const categoria =
        categoriaMatricula(
          matricula
        )

      const origenMatricula =
        mayusculas(
          matricula.origen_matricula
        ) ||
        'DIRECTO'

      if (
        !ORIGENES_MATRICULA.has(
          origenMatricula
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El origen de matrícula no es válido.',
          },
          {
            status:
              400,
          }
        )
      }

      const convenioId =
        origenMatricula ===
        'CONVENIO'
          ? toInt(
              matricula.convenio_id
            )
          : null

      const descripcion =
        texto(
          body?.descripcion
        ) ||
        `${mayusculas(
          concepto.nombre
        )}${categoria ? ` ${categoria}` : ''}`

      // ===================================================
      // CABECERA
      // ===================================================

      const {
        data:
          cuenta,

        error:
          errorCuenta,
      } =
        await supabase
          .from(
            'cuentas_aprendiz'
          )
          .insert({
            documento:
              texto(
                matricula.documento
              ),

            convenio_id:
              convenioId,

            descripcion,

            valor_total:
              valorTotal,

            estado:
              'PENDIENTE',

            origen_pago:
              origenMatricula ===
              'CONVENIO'
                ? 'CONVENIO'
                : 'DIRECTO',

            origen_matricula:
              origenMatricula,

            observaciones:
              texto(
                body?.observaciones
              ) ||
              null,

            creado_por:
              usuario,

            fecha_creacion:
              fechaValida(
                body?.fecha
              )
                ? body.fecha
                : hoyColombia(),

            updated_at:
              new Date()
                .toISOString(),
          })
          .select('*')
          .single()

      if (
        errorCuenta
      ) {
        throw new Error(
          `No fue posible crear la obligación: ${errorCuenta.message}`
        )
      }

      // ===================================================
      // DETALLE
      // ===================================================

      const {
        data:
          detalle,

        error:
          errorDetalle,
      } =
        await supabase
          .from(
            'cuentas_aprendiz_detalle'
          )
          .insert({
            cuenta_id:
              cuenta.id,

            matricula_id:
              matricula.id,

            concepto_id:
              concepto.id,

            categorias:
              categoria
                ? [
                    categoria,
                  ]
                : [],

            descripcion,

            valor:
              valorTotal,

            estado:
              'ACTIVO',

            creado_por:
              usuario,

            updated_at:
              new Date()
                .toISOString(),
          })
          .select('*')
          .single()

      if (
        errorDetalle
      ) {
        await supabase
          .from(
            'cuentas_aprendiz'
          )
          .delete()
          .eq(
            'id',
            cuenta.id
          )

        throw new Error(
          `No fue posible crear el detalle de la obligación: ${errorDetalle.message}`
        )
      }

      try {
        await registrarAuditoria({
          supabase,

          usuario,

          accion:
            'CREAR_CUENTA',

          entidad:
            'CUENTA_APRENDIZ',

          entidadId:
            cuenta.id,

          matriculaId:
            matricula.id,

          documento:
            matricula.documento,

          consecutivoReferencia:
            matricula.consecutivo,

          descripcion:
            `Creación de obligación ${descripcion}.`,

          datosNuevos: {
            cuenta,
            detalle,
          },

          observaciones:
            body?.observaciones,
        })
      } catch (
        errorAuditoria
      ) {
        await supabase
          .from(
            'cuentas_aprendiz'
          )
          .delete()
          .eq(
            'id',
            cuenta.id
          )

        throw errorAuditoria
      }

      return NextResponse.json(
        {
          status:
            'success',

          message:
            'Obligación creada correctamente.',

          data:
            await obtenerDetalleCuenta(
              supabase,
              cuenta.id
            ),

          empresa:
            empresaRespuesta(
              empresa
            ),
        },
        {
          status:
            201,
        }
      )
    }

    // =====================================================
    // MODIFICAR CUENTA
    // =====================================================
    //
    // Para auditoría financiera, modificar valor_total
    // exige mantener sincronizado el detalle.
    //
    // Esta acción se permite de forma simple cuando la cuenta
    // tiene UN SOLO detalle activo.
    //
    // Las obligaciones de matrícula con varios componentes
    // deben modificarse posteriormente mediante una acción
    // específica sobre sus detalles.
    //
    // =====================================================

    if (
      accion ===
      'modificar_cuenta'
    ) {
      const cuenta =
        await obtenerCuenta(
          supabase,
          body?.cuenta_id
        )

      if (
        cuenta.estado ===
        'ANULADA'
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'No se puede modificar una obligación anulada.',
          },
          {
            status:
              409,
          }
        )
      }

      const detalles =
        await obtenerDetallesCuenta(
          supabase,
          cuenta.id
        )

      const totalAbonado =
        await obtenerTotalAbonado(
          supabase,
          cuenta.id
        )

      const nuevoValor =
        body?.valor_total !==
          undefined
          ? toNumero(
              body.valor_total
            )
          : Number(
              cuenta.valor_total
            )

      if (
        !nuevoValor ||
        nuevoValor <=
          0
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El valor total debe ser mayor que cero.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        nuevoValor <
        totalAbonado
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              `El valor de la obligación no puede ser inferior al total abonado ($${totalAbonado}).`,
          },
          {
            status:
              409,
          }
        )
      }

      const cambioValor =
        redondear(
          nuevoValor
        ) !==
        redondear(
          cuenta.valor_total
        )

      if (
        cambioValor &&
        detalles.length >
        1
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'Esta obligación contiene varios conceptos. El valor total no puede modificarse directamente porque debe conservar la discriminación de Curso, Examen Médico u otros componentes.',
          },
          {
            status:
              409,
          }
        )
      }

      const nuevoEstado =
        calcularEstadoCuenta({
          valorTotal:
            nuevoValor,

          totalAbonado,
        })

      const cambios = {
        valor_total:
          nuevoValor,

        descripcion:
          texto(
            body?.descripcion
          ) ||
          cuenta.descripcion,

        observaciones:
          body?.observaciones !==
            undefined
            ? texto(
                body.observaciones
              ) ||
              null
            : cuenta.observaciones,

        estado:
          nuevoEstado,

        updated_at:
          new Date()
            .toISOString(),
      }

      const {
        data:
          cuentaActualizada,

        error,
      } =
        await supabase
          .from(
            'cuentas_aprendiz'
          )
          .update(
            cambios
          )
          .eq(
            'id',
            cuenta.id
          )
          .select('*')
          .single()

      if (
        error
      ) {
        throw new Error(
          `No fue posible modificar la obligación: ${error.message}`
        )
      }

      if (
        cambioValor &&
        detalles.length ===
        1
      ) {
        const {
          error:
            errorDetalle,
        } =
          await supabase
            .from(
              'cuentas_aprendiz_detalle'
            )
            .update({
              valor:
                nuevoValor,

              descripcion:
                cambios.descripcion,

              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              'id',
              detalles[0].id
            )

        if (
          errorDetalle
        ) {
          await supabase
            .from(
              'cuentas_aprendiz'
            )
            .update({
              valor_total:
                cuenta.valor_total,

              descripcion:
                cuenta.descripcion,

              observaciones:
                cuenta.observaciones,

              estado:
                cuenta.estado,

              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              'id',
              cuenta.id
            )

          throw new Error(
            `No fue posible sincronizar el detalle de la obligación: ${errorDetalle.message}`
          )
        }
      }

      await registrarAuditoria({
        supabase,

        usuario,

        accion:
          'MODIFICAR_CUENTA',

        entidad:
          'CUENTA_APRENDIZ',

        entidadId:
          cuenta.id,

        matriculaId:
          detalles[0]?.matricula_id ||
          null,

        documento:
          cuenta.documento,

        descripcion:
          'Modificación de obligación del aprendiz.',

        datosAnteriores:
          cuenta,

        datosNuevos:
          cuentaActualizada,

        observaciones:
          body?.observaciones,
      })

      return NextResponse.json({
        status:
          'success',

        message:
          'Obligación actualizada correctamente.',

        data:
          await obtenerDetalleCuenta(
            supabase,
            cuenta.id
          ),
      })
    }

    // =====================================================
    // ANULAR CUENTA
    // =====================================================

    if (
      accion ===
      'anular_cuenta'
    ) {
      const cuenta =
        await obtenerCuenta(
          supabase,
          body?.cuenta_id
        )

      const motivo =
        texto(
          body?.motivo
        )

      if (
        !motivo
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El motivo de anulación es obligatorio.',
          },
          {
            status:
              400,
          }
        )
      }

      const totalAbonado =
        await obtenerTotalAbonado(
          supabase,
          cuenta.id
        )

      if (
        totalAbonado >
        0
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'No se puede anular una obligación que tiene recibos activos. Primero deben anularse los recibos.',
          },
          {
            status:
              409,
          }
        )
      }

      const detalles =
        await obtenerDetallesCuenta(
          supabase,
          cuenta.id
        )

      const {
        data:
          cuentaAnulada,

        error,
      } =
        await supabase
          .from(
            'cuentas_aprendiz'
          )
          .update({
            estado:
              'ANULADA',

            observaciones:
              texto(
                body?.observaciones
              ) ||
              cuenta.observaciones,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            cuenta.id
          )
          .select('*')
          .single()

      if (
        error
      ) {
        throw new Error(
          `No fue posible anular la obligación: ${error.message}`
        )
      }

      const {
        error:
          errorDetalles,
      } =
        await supabase
          .from(
            'cuentas_aprendiz_detalle'
          )
          .update({
            estado:
              'ANULADO',

            motivo_anulacion:
              motivo,

            usuario_anulacion:
              usuario,

            fecha_anulacion:
              new Date()
                .toISOString(),

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'cuenta_id',
            cuenta.id
          )
          .eq(
            'estado',
            'ACTIVO'
          )

      if (
        errorDetalles
      ) {
        await supabase
          .from(
            'cuentas_aprendiz'
          )
          .update({
            estado:
              cuenta.estado,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            cuenta.id
          )

        throw new Error(
          `No fue posible anular los componentes de la obligación: ${errorDetalles.message}`
        )
      }

      await registrarAuditoria({
        supabase,

        usuario,

        accion:
          'ANULAR_CUENTA',

        entidad:
          'CUENTA_APRENDIZ',

        entidadId:
          cuenta.id,

        matriculaId:
          detalles[0]?.matricula_id ||
          null,

        documento:
          cuenta.documento,

        descripcion:
          'Anulación de obligación del aprendiz.',

        datosAnteriores: {
          cuenta,
          detalles,
        },

        datosNuevos:
          cuentaAnulada,

        motivo,

        observaciones:
          body?.observaciones,
      })

      return NextResponse.json({
        status:
          'success',

        message:
          'Obligación anulada correctamente.',

        data:
          cuentaAnulada,
      })
    }

    // =====================================================
    // REGISTRAR ABONO
    // =====================================================

    if (
      accion ===
        'registrar_abono' ||
      accion ===
        'registrar_pago' ||
      accion ===
        'registrar_ingreso'
    ) {
      const cuenta =
        await obtenerCuenta(
          supabase,
          body?.cuenta_id
        )

      if (
        cuenta.estado ===
        'ANULADA'
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'No se pueden registrar abonos sobre una obligación anulada.',
          },
          {
            status:
              409,
          }
        )
      }

      const medioPago =
        await obtenerMedioPago(
          supabase,
          body?.medio_pago_id
        )

      const valor =
        toNumero(
          body?.valor
        )

      if (
        !valor ||
        valor <=
          0
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El valor del abono debe ser mayor que cero.',
          },
          {
            status:
              400,
          }
        )
      }

      const totalAnterior =
        await obtenerTotalAbonado(
          supabase,
          cuenta.id
        )

      const saldoAnterior =
        redondear(
          Number(
            cuenta.valor_total
          ) -
          totalAnterior
        )

      if (
        saldoAnterior <=
        0
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'La obligación ya se encuentra a paz y salvo.',
          },
          {
            status:
              409,
          }
        )
      }

      if (
        valor >
        saldoAnterior
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              `El abono ($${valor}) supera el saldo pendiente ($${saldoAnterior}).`,
          },
          {
            status:
              409,
          }
        )
      }

      const pagadoPor =
        mayusculas(
          body?.pagado_por
        ) ||
        'APRENDIZ'

      if (
        !PAGADO_POR_VALIDOS.has(
          pagadoPor
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El tipo de pagador no es válido.',
          },
          {
            status:
              400,
          }
        )
      }

      const detalles =
        await obtenerDetallesCuenta(
          supabase,
          cuenta.id
        )

      if (
        detalles.length ===
        0
      ) {
        throw new Error(
          'La obligación no tiene componentes financieros activos.'
        )
      }

      const distribucionPreparada =
        await construirDistribucionPago({
          supabase,

          detalles,

          totalAnterior,

          valor,
        })

      const matriculaIds =
        [
          ...new Set(
            detalles
              .map(
                detalle =>
                  detalle.matricula_id
              )
              .filter(
                Boolean
              )
          ),
        ]

      const matriculas =
        await obtenerMatriculasPorIds(
          supabase,
          matriculaIds
        )

      const matriculaPrincipal =
        matriculas[0] ||
        null

      const aprendizNombre =
        matriculaPrincipal
          ? [
              matriculaPrincipal.nombres,
              matriculaPrincipal.apellidos,
            ]
              .filter(
                Boolean
              )
              .join(
                ' '
              )
              .trim()
          : ''

      let nombrePagador =
        texto(
          body?.nombre_pagador
        )

      let documentoPagador =
        texto(
          body?.documento_pagador
        )

      // ===================================================
      // APRENDIZ
      // ===================================================

      if (
        pagadoPor ===
        'APRENDIZ'
      ) {
        nombrePagador =
          aprendizNombre ||
          nombrePagador

        documentoPagador =
          matriculaPrincipal?.documento ||
          cuenta.documento ||
          documentoPagador
      }

      // ===================================================
      // CONVENIO
      // ===================================================

      if (
        pagadoPor ===
        'CONVENIO'
      ) {
        if (
          !cuenta.convenio_id
        ) {
          return NextResponse.json(
            {
              status:
                'error',

              message:
                'Esta obligación no pertenece a un convenio.',
            },
            {
              status:
                409,
            }
          )
        }

        const convenio =
          await obtenerConvenio(
            supabase,
            cuenta.convenio_id
          )

        if (
          !convenio
        ) {
          return NextResponse.json(
            {
              status:
                'error',

              message:
                'No fue posible identificar el convenio asociado a la obligación.',
            },
            {
              status:
                409,
            }
          )
        }

        nombrePagador =
          convenio.nombre ||
          ''

        documentoPagador =
          convenio.documento ||
          ''
      }

      // ===================================================
      // ASESOR / TERCERO
      // ===================================================

            // ===================================================
      // TERCERO
      // ===================================================

      if (
        pagadoPor ===
        'TERCERO'
      ) {
        if (
          !nombrePagador
        ) {
          return NextResponse.json(
            {
              status:
                'error',

              message:
                'Debe indicar el nombre de quien realiza el pago.',
            },
            {
              status:
                400,
            }
          )
        }

        if (
          !documentoPagador
        ) {
          return NextResponse.json(
            {
              status:
                'error',

              message:
                'Debe indicar el documento de quien realiza el pago.',
            },
            {
              status:
                400,
            }
          )
        }
      }

      // ===================================================
      // REFERENCIA PARA RECIBOS_CAJA
      // ===================================================
      //
      // La tabla recibos_caja conserva todavía:
      //
      // matricula_id
      // categoria
      // concepto_id
      //
      // El recibo corresponde a la obligación completa,
      // pero estos campos se conservan como referencia
      // técnica usando el primer componente.
      //
      // El detalle real del cobro está en:
      // cuentas_aprendiz_detalle
      //
      // ===================================================

      const detalleReferencia =
        detalles[0]

      const categoriaReferencia =
        Array.isArray(
          detalleReferencia
            ?.categorias
        ) &&
        detalleReferencia
          .categorias
          .length >
          0
          ? mayusculas(
              detalleReferencia
                .categorias[0]
            )
          : null

      const descripcion =
        texto(
          body?.descripcion
        ) ||
        `ABONO ${cuenta.descripcion}`

      const {
        data:
          recibo,

        error:
          errorRecibo,
      } =
        await supabase
          .from(
            'recibos_caja'
          )
          .insert({
            cuenta_id:
              cuenta.id,

            matricula_id:
              detalleReferencia
                ?.matricula_id ||
              null,

            documento:
              cuenta.documento,

            categoria:
              categoriaReferencia,

            concepto_id:
              detalleReferencia
                ?.concepto_id,

            medio_pago_id:
              medioPago.id,

            fecha:
              fechaValida(
                body?.fecha
              )
                ? body.fecha
                : hoyColombia(),

            descripcion,

            valor,

            pagado_por:
              pagadoPor,

            nombre_pagador:
              nombrePagador ||
              null,

            documento_pagador:
              documentoPagador ||
              null,

            referencia_pago:
              texto(
                body?.referencia_pago
              ) ||
              null,

            recibido_por:
              usuario,

            observaciones:
              texto(
                body?.observaciones
              ) ||
              null,

            estado:
              'ACTIVO',

            tipo_origen:
              'MATRICULA',

            updated_at:
              new Date()
                .toISOString(),
          })
          .select('*')
          .single()

            if (
        errorRecibo
      ) {
        throw new Error(
          `No fue posible registrar el abono: ${errorRecibo.message}`
        )
      }

      let distribucion =
        []

      try {
        distribucion =
          await guardarDistribucionRecibo(
            supabase,
            recibo.id,
            distribucionPreparada
          )
      } catch (
        errorDistribucion
      ) {
        await supabase
          .from(
            'recibos_caja'
          )
          .delete()
          .eq(
            'id',
            recibo.id
          )

        throw errorDistribucion
      }

      const totalNuevo =
        redondear(
          totalAnterior +
          valor
        )

      const nuevoEstado =
        calcularEstadoCuenta({
          valorTotal:
            cuenta.valor_total,

          totalAbonado:
            totalNuevo,
        })

      const {
        error:
          errorEstado,
      } =
        await supabase
          .from(
            'cuentas_aprendiz'
          )
          .update({
            estado:
              nuevoEstado,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            cuenta.id
          )

      if (
        errorEstado
      ) {
        await supabase
          .from(
            'recibos_caja'
          )
          .delete()
          .eq(
            'id',
            recibo.id
          )

        throw new Error(
          `No fue posible actualizar el estado de la obligación: ${errorEstado.message}`
        )
      }

      try {
        await registrarAuditoria({
          supabase,

          usuario,

          accion:
            'CREAR_RECIBO',

          entidad:
            'RECIBO_CAJA',

          entidadId:
            recibo.id,

          matriculaId:
            detalleReferencia
              ?.matricula_id ||
            null,

          documento:
            cuenta.documento,

          consecutivoReferencia:
            consecutivoRecibo(
              recibo.id
            ),

          descripcion:
            `Ingreso de Caja por $${valor}.`,

          datosNuevos: {
            recibo,

            cuenta_id:
              cuenta.id,

            valor_obligacion:
              cuenta.valor_total,

            total_abonado:
              totalNuevo,

            saldo:
              Math.max(
                0,
                redondear(
                  Number(
                    cuenta.valor_total
                  ) -
                  totalNuevo
                )
              ),

            detalles_obligacion:
              detalles,
              distribucion,
          },

          observaciones:
            body?.observaciones,
        })
      } catch (
        errorAuditoria
      ) {
        await supabase
          .from(
            'recibos_caja'
          )
          .delete()
          .eq(
            'id',
            recibo.id
          )

        await supabase
          .from(
            'cuentas_aprendiz'
          )
          .update({
            estado:
              cuenta.estado,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            cuenta.id
          )

        throw errorAuditoria
      }

      return NextResponse.json(
        {
          status:
            'success',

          message:
            nuevoEstado ===
            'PAZ_Y_SALVO'
              ? 'Pago registrado correctamente. La obligación quedó a PAZ Y SALVO.'
              : 'Abono registrado correctamente.',

          data: {
            recibo: {
              ...recibo,

              consecutivo:
                consecutivoRecibo(
                  recibo.id
                ),

              medio_pago:
                medioPago,

              aprendiz: {
                nombre:
                  aprendizNombre,

                documento:
                  matriculaPrincipal
                    ?.documento ||
                  cuenta.documento,
              },

              pagador: {
                tipo:
                  pagadoPor,

                nombre:
                  nombrePagador,

                documento:
                  documentoPagador,
              },

              detalles_obligacion:
                detalles,
            },

            valor_total:
              redondear(
                cuenta.valor_total
              ),

            total_abonado:
              totalNuevo,

            saldo:
              Math.max(
                0,
                redondear(
                  Number(
                    cuenta.valor_total
                  ) -
                  totalNuevo
                )
              ),

            estado_cuenta:
              nuevoEstado,

            detalles:
              detalles,
              distribucion,
          },

          empresa:
            empresaRespuesta(
              empresa
            ),
        },
        {
          status:
            201,
        }
      )
    }

    // =====================================================
    // ANULAR RECIBO
    // =====================================================

    if (
      accion ===
      'anular_recibo'
    ) {
      const reciboId =
        toInt(
          body?.recibo_id
        )

      const motivo =
        texto(
          body?.motivo
        )

      if (
        !reciboId ||
        !motivo
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El recibo y el motivo de anulación son obligatorios.',
          },
          {
            status:
              400,
          }
        )
      }

      const {
        data:
          recibo,

        error:
          errorConsulta,
      } =
        await supabase
          .from(
            'recibos_caja'
          )
          .select('*')
          .eq(
            'id',
            reciboId
          )
          .maybeSingle()

      if (
        errorConsulta
      ) {
        throw new Error(
          `No fue posible consultar el recibo: ${errorConsulta.message}`
        )
      }

      if (
        !recibo
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'No se encontró el recibo.',
          },
          {
            status:
              404,
          }
        )
      }

      if (
        recibo.estado ===
        'ANULADO'
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El recibo ya se encuentra anulado.',
          },
          {
            status:
              409,
          }
        )
      }

      const cuenta =
        await obtenerCuenta(
          supabase,
          recibo.cuenta_id
        )

      const {
        data:
          reciboAnulado,

        error:
          errorAnulacion,
      } =
        await supabase
          .from(
            'recibos_caja'
          )
          .update({
            estado:
              'ANULADO',

            motivo_anulacion:
              motivo,

            usuario_anulacion:
              usuario,

            fecha_anulacion:
              new Date()
                .toISOString(),

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            recibo.id
          )
          .select('*')
          .single()

      if (
        errorAnulacion
      ) {
        throw new Error(
          `No fue posible anular el recibo: ${errorAnulacion.message}`
        )
      }

      const cuentaActualizada =
        await actualizarEstadoCuenta(
          supabase,
          cuenta
        )

      await registrarAuditoria({
        supabase,

        usuario,

        accion:
          'ANULAR_RECIBO',

        entidad:
          'RECIBO_CAJA',

        entidadId:
          recibo.id,

        matriculaId:
          recibo.matricula_id,

        documento:
          recibo.documento,

        consecutivoReferencia:
          consecutivoRecibo(
            recibo.id
          ),

        descripcion:
          'Anulación de recibo de Caja.',

        datosAnteriores:
          recibo,

        datosNuevos:
          reciboAnulado,

        motivo,
      })

      return NextResponse.json({
        status:
          'success',

        message:
          `${consecutivoRecibo(
            recibo.id
          )} anulado correctamente.`,

        data: {
          recibo:
            reciboAnulado,

          cuenta:
            cuentaActualizada,
        },

        empresa:
          empresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // CREAR EGRESO
    // =====================================================

    if (
      accion ===
      'crear_egreso'
    ) {
      const concepto =
        await obtenerConcepto(
          supabase,
          body?.concepto_id
        )

      if (
        ![
          'EGRESO',
          'AMBOS',
        ].includes(
          mayusculas(
            concepto.naturaleza
          )
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El concepto seleccionado no corresponde a un egreso.',
          },
          {
            status:
              400,
          }
        )
      }

      const medioPago =
        await obtenerMedioPago(
          supabase,
          body?.medio_pago_id
        )

      const valor =
        toNumero(
          body?.valor
        )

      const beneficiario =
        texto(
          body?.beneficiario
        )

      const descripcion =
        texto(
          body?.descripcion
        )

      if (
        !valor ||
        valor <=
          0 ||
        !beneficiario ||
        !descripcion
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'Beneficiario, descripción y valor son obligatorios.',
          },
          {
            status:
              400,
          }
        )
      }

      const {
        data:
          egreso,

        error:
          errorEgreso,
      } =
        await supabase
          .from(
            'egresos_caja'
          )
          .insert({
            concepto_id:
              concepto.id,

            medio_pago_id:
              medioPago.id,

            fecha:
              fechaValida(
                body?.fecha
              )
                ? body.fecha
                : hoyColombia(),

            beneficiario:
              beneficiario.toUpperCase(),

            tipo_documento_beneficiario:
              mayusculas(
                body?.tipo_documento_beneficiario
              ) ||
              null,

            documento_beneficiario:
              texto(
                body?.documento_beneficiario
              ) ||
              null,

            descripcion:
              descripcion.toUpperCase(),

            valor,

            numero_factura:
              texto(
                body?.numero_factura
              ) ||
              null,

            numero_cuenta_cobro:
              texto(
                body?.numero_cuenta_cobro
              ) ||
              null,

            referencia_pago:
              texto(
                body?.referencia_pago
              ) ||
              null,

            soporte_url:
              texto(
                body?.soporte_url
              ) ||
              null,

            pagado_por:
              usuario,

            observaciones:
              texto(
                body?.observaciones
              ) ||
              null,

            estado:
              'ACTIVO',

            updated_at:
              new Date()
                .toISOString(),
          })
          .select('*')
          .single()

      if (
        errorEgreso
      ) {
        throw new Error(
          `No fue posible registrar el egreso: ${errorEgreso.message}`
        )
      }

      try {
        await registrarAuditoria({
          supabase,

          usuario,

          accion:
            'CREAR_EGRESO',

          entidad:
            'EGRESO_CAJA',

          entidadId:
            egreso.id,

          consecutivoReferencia:
            consecutivoEgreso(
              egreso.id
            ),

          descripcion:
            `Egreso de Caja por $${valor} a ${beneficiario}.`,

          datosNuevos:
            egreso,

          observaciones:
            body?.observaciones,
        })
      } catch (
        errorAuditoria
      ) {
        await supabase
          .from(
            'egresos_caja'
          )
          .delete()
          .eq(
            'id',
            egreso.id
          )

        throw errorAuditoria
      }

      return NextResponse.json(
        {
          status:
            'success',

          message:
            'Egreso registrado correctamente.',

          data: {
            ...egreso,

            consecutivo:
              consecutivoEgreso(
                egreso.id
              ),

            concepto,

            medio_pago:
              medioPago,
          },

          empresa:
            empresaRespuesta(
              empresa
            ),
        },
        {
          status:
            201,
        }
      )
    }

    // =====================================================
    // ANULAR EGRESO
    // =====================================================

    if (
      accion ===
      'anular_egreso'
    ) {
      const egresoId =
        toInt(
          body?.egreso_id
        )

      const motivo =
        texto(
          body?.motivo
        )

      if (
        !egresoId ||
        !motivo
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El egreso y el motivo de anulación son obligatorios.',
          },
          {
            status:
              400,
          }
        )
      }

      const {
        data:
          anterior,

        error:
          errorConsulta,
      } =
        await supabase
          .from(
            'egresos_caja'
          )
          .select('*')
          .eq(
            'id',
            egresoId
          )
          .maybeSingle()

      if (
        errorConsulta
      ) {
        throw new Error(
          `No fue posible consultar el egreso: ${errorConsulta.message}`
        )
      }

      if (
        !anterior
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'No se encontró el egreso.',
          },
          {
            status:
              404,
          }
        )
      }

      if (
        anterior.estado ===
        'ANULADO'
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El egreso ya está anulado.',
          },
          {
            status:
              409,
          }
        )
      }

      const {
        data:
          egreso,

        error:
          errorAnulacion,
      } =
        await supabase
          .from(
            'egresos_caja'
          )
          .update({
            estado:
              'ANULADO',

            motivo_anulacion:
              motivo,

            usuario_anulacion:
              usuario,

            fecha_anulacion:
              new Date()
                .toISOString(),

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            egresoId
          )
          .select('*')
          .single()

      if (
        errorAnulacion
      ) {
        throw new Error(
          `No fue posible anular el egreso: ${errorAnulacion.message}`
        )
      }

      await registrarAuditoria({
        supabase,

        usuario,

        accion:
          'ANULAR_EGRESO',

        entidad:
          'EGRESO_CAJA',

        entidadId:
          egreso.id,

        consecutivoReferencia:
          consecutivoEgreso(
            egreso.id
          ),

        descripcion:
          'Anulación de egreso de Caja.',

        datosAnteriores:
          anterior,

        datosNuevos:
          egreso,

        motivo,
      })

      return NextResponse.json({
        status:
          'success',

        message:
          `${consecutivoEgreso(
            egreso.id
          )} anulado correctamente.`,

        data:
          egreso,

        empresa:
          empresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // CERRAR CAJA
    // =====================================================

    if (
      accion ===
      'cerrar_caja'
    ) {
      const periodoDesde =
        texto(
          body?.periodo_desde
        )

      const periodoHasta =
        texto(
          body?.periodo_hasta
        )

      if (
        !fechaHoraValida(
          periodoDesde
        ) ||
        !fechaHoraValida(
          periodoHasta
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El período del cierre no es válido.',
          },
          {
            status:
              400,
          }
        )
      }

      const desde =
        new Date(
          periodoDesde
        )

      const hasta =
        new Date(
          periodoHasta
        )

      if (
        hasta <
        desde
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'La fecha final del arqueo no puede ser anterior a la inicial.',
          },
          {
            status:
              400,
          }
        )
      }

      const tipoCierre =
        mayusculas(
          body?.tipo_cierre
        ) ||
        'DIARIO'

      if (
        !TIPOS_CIERRE.has(
          tipoCierre
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El tipo de cierre no es válido.',
          },
          {
            status:
              400,
          }
        )
      }

      // ===================================================
      // EVITAR CIERRES SUPERPUESTOS
      // ===================================================

      const {
        data:
          cierresExistentes,

        error:
          errorCierres,
      } =
        await supabase
          .from(
            'cierres_caja'
          )
          .select(`
            id,
            periodo_desde,
            periodo_hasta
          `)
          .lte(
            'periodo_desde',
            hasta.toISOString()
          )
          .gte(
            'periodo_hasta',
            desde.toISOString()
          )
          .limit(
            1
          )

      if (
        errorCierres
      ) {
        throw new Error(
          `No fue posible validar los cierres existentes: ${errorCierres.message}`
        )
      }

      if (
        (
          cierresExistentes ||
          []
        ).length >
        0
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El período seleccionado se cruza con un cierre de Caja existente.',
          },
          {
            status:
              409,
          }
        )
      }

      const [
        recibosResult,
        egresosResult,
        mediosResult,
      ] =
        await Promise.all([
          supabase
            .from(
              'recibos_caja'
            )
            .select(`
              id,
              valor,
              medio_pago_id,
              estado,
              created_at
            `)
            .gte(
              'created_at',
              desde.toISOString()
            )
            .lte(
              'created_at',
              hasta.toISOString()
            ),

          supabase
            .from(
              'egresos_caja'
            )
            .select(`
              id,
              valor,
              medio_pago_id,
              estado,
              created_at
            `)
            .gte(
              'created_at',
              desde.toISOString()
            )
            .lte(
              'created_at',
              hasta.toISOString()
            ),

          supabase
            .from(
              'medios_pago_caja'
            )
            .select(`
              id,
              nombre
            `),
        ])

      if (
        recibosResult.error
      ) {
        throw new Error(
          `No fue posible calcular los ingresos del arqueo: ${recibosResult.error.message}`
        )
      }

      if (
        egresosResult.error
      ) {
        throw new Error(
          `No fue posible calcular los egresos del arqueo: ${egresosResult.error.message}`
        )
      }

      if (
        mediosResult.error
      ) {
        throw new Error(
          `No fue posible consultar los medios de pago: ${mediosResult.error.message}`
        )
      }

      const mapaMedios =
        new Map(
          (
            mediosResult.data ||
            []
          ).map(
            item => [
              String(
                item.id
              ),
              mayusculas(
                item.nombre
              ),
            ]
          )
        )

      const resumenMedios = {}

      const recibos =
        recibosResult.data ||
        []

      const egresos =
        egresosResult.data ||
        []

      let ingresosEfectivo =
        0

      let ingresosOtros =
        0

      let egresosEfectivo =
        0

      let egresosOtros =
        0

      const recibosActivos =
        recibos.filter(
          item =>
            item.estado ===
            'ACTIVO'
        )

      const egresosActivos =
        egresos.filter(
          item =>
            item.estado ===
            'ACTIVO'
        )

      for (
        const recibo of
          recibosActivos
      ) {
        const medio =
          mapaMedios.get(
            String(
              recibo.medio_pago_id
            )
          ) ||
          'OTRO'

        if (
          !resumenMedios[
            medio
          ]
        ) {
          resumenMedios[
            medio
          ] = {
            ingresos:
              0,

            egresos:
              0,
          }
        }

        resumenMedios[
          medio
        ].ingresos =
          redondear(
            resumenMedios[
              medio
            ].ingresos +
            Number(
              recibo.valor ||
              0
            )
          )

        if (
          medio ===
          'EFECTIVO'
        ) {
          ingresosEfectivo +=
            Number(
              recibo.valor ||
              0
            )
        } else {
          ingresosOtros +=
            Number(
              recibo.valor ||
              0
            )
        }
      }

      for (
        const egreso of
          egresosActivos
      ) {
        const medio =
          mapaMedios.get(
            String(
              egreso.medio_pago_id
            )
          ) ||
          'OTRO'

        if (
          !resumenMedios[
            medio
          ]
        ) {
          resumenMedios[
            medio
          ] = {
            ingresos:
              0,

            egresos:
              0,
          }
        }

        resumenMedios[
          medio
        ].egresos =
          redondear(
            resumenMedios[
              medio
            ].egresos +
            Number(
              egreso.valor ||
              0
            )
          )

        if (
          medio ===
          'EFECTIVO'
        ) {
          egresosEfectivo +=
            Number(
              egreso.valor ||
              0
            )
        } else {
          egresosOtros +=
            Number(
              egreso.valor ||
              0
            )
        }
      }

      ingresosEfectivo =
        redondear(
          ingresosEfectivo
        )

      ingresosOtros =
        redondear(
          ingresosOtros
        )

      egresosEfectivo =
        redondear(
          egresosEfectivo
        )

      egresosOtros =
        redondear(
          egresosOtros
        )

      const totalIngresos =
        redondear(
          ingresosEfectivo +
          ingresosOtros
        )

      const totalEgresos =
        redondear(
          egresosEfectivo +
          egresosOtros
        )

      const saldoInicial =
        toNumero(
          body?.saldo_inicial_efectivo
        ) ??
        0

      const efectivoContado =
        toNumero(
          body?.efectivo_contado
        )

      if (
        efectivoContado ===
          null ||
        efectivoContado <
          0
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'Debe ingresar el efectivo contado durante el arqueo.',
          },
          {
            status:
              400,
          }
        )
      }

      const efectivoEsperado =
        redondear(
          saldoInicial +
          ingresosEfectivo -
          egresosEfectivo
        )

      const diferencia =
        redondear(
          efectivoContado -
          efectivoEsperado
        )

      const movimientoNeto =
        redondear(
          totalIngresos -
          totalEgresos
        )

      const {
        data:
          cierre,

        error:
          errorCierre,
      } =
        await supabase
          .from(
            'cierres_caja'
          )
          .insert({
            fecha:
              fechaValida(
                body?.fecha
              )
                ? body.fecha
                : hoyColombia(),

            tipo_cierre:
              tipoCierre,

            periodo_desde:
              desde.toISOString(),

            periodo_hasta:
              hasta.toISOString(),

            saldo_inicial_efectivo:
              saldoInicial,

            ingresos_efectivo:
              ingresosEfectivo,

            ingresos_otros_medios:
              ingresosOtros,

            total_ingresos_sistema:
              totalIngresos,

            egresos_efectivo:
              egresosEfectivo,

            egresos_otros_medios:
              egresosOtros,

            total_egresos_sistema:
              totalEgresos,

            efectivo_esperado:
              efectivoEsperado,

            efectivo_contado:
              efectivoContado,

            diferencia_efectivo:
              diferencia,

            movimiento_neto:
              movimientoNeto,

            resumen_medios_pago:
              resumenMedios,

            cantidad_recibos:
              recibosActivos.length,

            cantidad_egresos:
              egresosActivos.length,

            cantidad_recibos_anulados:
              recibos.filter(
                item =>
                  item.estado ===
                  'ANULADO'
              ).length,

            cantidad_egresos_anulados:
              egresos.filter(
                item =>
                  item.estado ===
                  'ANULADO'
              ).length,

            usuario_cierre:
              usuario,

            estado:
              'CERRADO',

            observaciones:
              texto(
                body?.observaciones
              ) ||
              null,

            updated_at:
              new Date()
                .toISOString(),
          })
          .select('*')
          .single()

      if (
        errorCierre
      ) {
        throw new Error(
          `No fue posible realizar el cierre de Caja: ${errorCierre.message}`
        )
      }

      try {
        await registrarAuditoria({
          supabase,

          usuario,

          accion:
            'CREAR_CIERRE',

          entidad:
            'CIERRE_CAJA',

          entidadId:
            cierre.id,

          consecutivoReferencia:
            consecutivoCierre(
              cierre.id
            ),

          descripcion:
            `Cierre de Caja ${tipoCierre}. Diferencia de efectivo: $${diferencia}.`,

          datosNuevos:
            cierre,

          observaciones:
            body?.observaciones,
        })
      } catch (
        errorAuditoria
      ) {
        await supabase
          .from(
            'cierres_caja'
          )
          .delete()
          .eq(
            'id',
            cierre.id
          )

        throw errorAuditoria
      }

      return NextResponse.json(
        {
          status:
            'success',

          message:
            diferencia ===
            0
              ? 'Cierre de Caja realizado. El efectivo se encuentra cuadrado.'
              : diferencia >
                0
                ? `Cierre realizado con sobrante de $${diferencia}.`
                : `Cierre realizado con faltante de $${Math.abs(
                    diferencia
                  )}.`,

          data: {
            ...cierre,

            consecutivo:
              consecutivoCierre(
                cierre.id
              ),

            resultado_efectivo:
              diferencia ===
              0
                ? 'CUADRADO'
                : diferencia >
                  0
                  ? 'SOBRANTE'
                  : 'FALTANTE',
          },

          empresa:
            empresaRespuesta(
              empresa
            ),
        },
        {
          status:
            201,
        }
      )
    }

    // =====================================================
    // REVISAR CIERRE
    // =====================================================

    if (
      accion ===
      'revisar_cierre'
    ) {
      const cierreId =
        toInt(
          body?.cierre_id
        )

      if (
        !cierreId
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El cierre de Caja es obligatorio.',
          },
          {
            status:
              400,
          }
        )
      }

      const {
        data:
          anterior,

        error:
          errorConsulta,
      } =
        await supabase
          .from(
            'cierres_caja'
          )
          .select('*')
          .eq(
            'id',
            cierreId
          )
          .maybeSingle()

      if (
        errorConsulta
      ) {
        throw new Error(
          `No fue posible consultar el cierre: ${errorConsulta.message}`
        )
      }

      if (
        !anterior
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'No se encontró el cierre solicitado.',
          },
          {
            status:
              404,
          }
        )
      }

      if (
        anterior.estado ===
        'REVISADO'
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'Este cierre ya fue revisado.',
          },
          {
            status:
              409,
          }
        )
      }

      const {
        data:
          cierre,

        error:
          errorRevision,
      } =
        await supabase
          .from(
            'cierres_caja'
          )
          .update({
            estado:
              'REVISADO',

            revisado_por:
              usuario,

            fecha_revision:
              new Date()
                .toISOString(),

            observaciones_revision:
              texto(
                body?.observaciones_revision
              ) ||
              null,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            cierreId
          )
          .select('*')
          .single()

      if (
        errorRevision
      ) {
        throw new Error(
          `No fue posible revisar el cierre: ${errorRevision.message}`
        )
      }

      await registrarAuditoria({
        supabase,

        usuario,

        accion:
          'REVISAR_CIERRE',

        entidad:
          'CIERRE_CAJA',

        entidadId:
          cierre.id,

        consecutivoReferencia:
          consecutivoCierre(
            cierre.id
          ),

        descripcion:
          'Revisión de cierre de Caja.',

        datosAnteriores:
          anterior,

        datosNuevos:
          cierre,

        observaciones:
          body?.observaciones_revision,
      })

      return NextResponse.json({
        status:
          'success',

        message:
          'Cierre revisado correctamente.',

        data: {
          ...cierre,

          consecutivo:
            consecutivoCierre(
              cierre.id
            ),
        },

        empresa:
          empresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // ACCIÓN INVÁLIDA
    // =====================================================

    return NextResponse.json(
      {
        status:
          'error',

        message:
          'Acción de Caja no válida.',
      },
      {
        status:
          400,
      }
    )
  } catch (
    error
  ) {
    console.error(
      'Error POST /api/admin/caja:',
      error
    )

    return respuestaError(
      error
    )
  }
}