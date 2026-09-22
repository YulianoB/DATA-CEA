// app/api/admin/caja/convenios/route.js

import {
  NextResponse,
} from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// =========================================================
// CONSTANTES
// =========================================================

const LIMITE_RESULTADOS =
  500

const ESTADOS_CARTERA_VALIDOS =
  new Set([
    'PENDIENTE',
    'ABONADO',
    'PAZ_Y_SALVO',
    'TODOS',
  ])

// =========================================================
// ERROR EMPRESA
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

function numero(
  valor
) {
  const resultado =
    Number(
      valor ||
      0
    )

  return Number.isFinite(
    resultado
  )
    ? resultado
    : 0
}

function redondear(
  valor
) {
  return Math.round(
    numero(
      valor
    ) *
      100
  ) / 100
}

function enteroPositivo(
  valor
) {
  const resultado =
    Number(
      valor
    )

  if (
    !Number.isInteger(
      resultado
    ) ||
    resultado <= 0
  ) {
    return null
  }

  return resultado
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

function normalizarDocumento(
  valor
) {
  return texto(
    valor
  ).replace(
    /\s+/g,
    ''
  )
}

function normalizarBusqueda(
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
}

function nombreCompletoAprendiz(
  aprendiz
) {
  return [
    texto(
      aprendiz?.nombres
    ),

    texto(
      aprendiz?.apellidos
    ),
  ]
    .filter(
      Boolean
    )
    .join(
      ' '
    )
    .trim()
}

function construirEmpresaRespuesta(
  empresa
) {
  return {
    nit:
      empresa?.nit ||
      '',

    codigo:
      empresa?.codigo ||
      '',

    nombre:
      empresa?.nombre ||
      empresa?.razon_social ||
      '',

    razon_social:
      empresa?.razon_social ||
      '',

    direccion:
      empresa?.direccion ||
      '',

    ciudad:
      empresa?.ciudad ||
      '',

    departamento:
      empresa?.departamento ||
      '',

    telefono:
      empresa?.telefono ||
      '',

    email:
      empresa?.email_principal ||
      '',
  }
}

// =========================================================
// CONSULTAR CONVENIOS
// =========================================================

async function consultarConvenios(
  supabase
) {
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
        activo,
        created_at,
        updated_at
      `)
      .order(
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
      `No fue posible consultar los convenios: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// CONSULTAR APRENDICES DE CONVENIO
// =========================================================

async function consultarAprendicesConvenio(
  supabase,
  {
    fechaInicio,
    fechaFin,
    convenioId,
  }
) {
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
        ciudad,
        convenio,
        convenio_id,
        categorias,
        estado,
        origen_matricula,
        created_at,

        convenio_rel:convenios!aprendices_convenio_id_fkey (
          id,
          nombre,
          documento,
          celular,
          correo,
          activo
        )
      `)
      .eq(
        'origen_matricula',
        'CONVENIO'
      )

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
    fechaInicio
  ) {
    consulta =
      consulta.gte(
        'fecha_matricula',
        fechaInicio
      )
  }

  if (
    fechaFin
  ) {
    consulta =
      consulta.lte(
        'fecha_matricula',
        fechaFin
      )
  }

  const {
    data,
    error,
  } =
    await consulta
      .order(
        'fecha_matricula',
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
        LIMITE_RESULTADOS
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar los aprendices por convenio: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// CONSULTAR CUENTAS
// =========================================================

async function consultarCuentas(
  supabase,
  documentos
) {
  if (
    !Array.isArray(
      documentos
    ) ||
    documentos.length ===
      0
  ) {
    return []
  }

  const unicos =
    [
      ...new Set(
        documentos
          .map(
            normalizarDocumento
          )
          .filter(
            Boolean
          )
      ),
    ]

  if (
    unicos.length ===
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
        observaciones,
        creado_por,
        fecha_creacion,
        origen_matricula,
        created_at,
        updated_at,

        convenio:convenios!cuentas_aprendiz_convenio_fk (
          id,
          nombre
        )
      `)
      .in(
        'documento',
        unicos
      )
      .neq(
        'estado',
        'ANULADA'
      )
      .order(
        'created_at',
        {
          ascending:
            true,
        }
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar las cuentas de aprendices: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// CONSULTAR DETALLE DE OBLIGACIONES
// =========================================================

async function consultarDetallesCuenta(
  supabase,
  cuentasIds
) {
  if (
    !Array.isArray(
      cuentasIds
    ) ||
    cuentasIds.length ===
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
        creado_por,
        created_at,

        concepto:conceptos_caja (
          id,
          nombre
        )
      `)
      .in(
        'cuenta_id',
        cuentasIds
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
      `No fue posible consultar el detalle de obligaciones: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// CONSULTAR RECIBOS
// =========================================================
//
// Solo los recibos ACTIVO disminuyen la cartera.
//
// Los recibos ANULADO únicamente se incluyen cuando se
// solicita el detalle para conservar trazabilidad.
//
// =========================================================

async function consultarRecibos(
  supabase,
  cuentasIds,
  incluirAnulados = false
) {
  if (
    !Array.isArray(
      cuentasIds
    ) ||
    cuentasIds.length ===
      0
  ) {
    return []
  }

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

        concepto:conceptos_caja (
          id,
          nombre
        ),

        medio_pago:medios_pago_caja (
          id,
          nombre
        )
      `)
      .in(
        'cuenta_id',
        cuentasIds
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
    await consulta
      .order(
        'fecha',
        {
          ascending:
            true,
        }
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
      `No fue posible consultar los pagos de cartera: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// AGRUPAR POR CUENTA
// =========================================================

function agruparPorCuenta(
  registros
) {
  const mapa =
    new Map()

  for (
    const registro of
      registros
  ) {
    const cuentaId =
      Number(
        registro?.cuenta_id
      )

    if (
      !cuentaId
    ) {
      continue
    }

    if (
      !mapa.has(
        cuentaId
      )
    ) {
      mapa.set(
        cuentaId,
        []
      )
    }

    mapa
      .get(
        cuentaId
      )
      .push(
        registro
      )
  }

  return mapa
}

// =========================================================
// AGRUPAR CUENTAS POR DOCUMENTO
// =========================================================

function agruparCuentasPorDocumento(
  cuentas
) {
  const mapa =
    new Map()

  for (
    const cuenta of
      cuentas
  ) {
    const documento =
      normalizarDocumento(
        cuenta?.documento
      )

    if (
      !documento
    ) {
      continue
    }

    if (
      !mapa.has(
        documento
      )
    ) {
      mapa.set(
        documento,
        []
      )
    }

    mapa
      .get(
        documento
      )
      .push(
        cuenta
      )
  }

  return mapa
}

// =========================================================
// ESTADO DE CARTERA
// =========================================================
//
// Estados oficiales:
//
// PENDIENTE
// - No tiene pagos activos.
// - Conserva saldo.
//
// ABONADO
// - Tiene uno o más pagos activos.
// - Conserva saldo.
//
// PAZ_Y_SALVO
// - El saldo llegó a cero.
//
// =========================================================

function calcularEstadoCartera({
  valorTotal,
  totalPagado,
}) {
  const saldo =
    redondear(
      valorTotal -
      totalPagado
    )

  if (
    saldo <= 0
  ) {
    return 'PAZ_Y_SALVO'
  }

  if (
    totalPagado <= 0
  ) {
    return 'PENDIENTE'
  }

  return 'ABONADO'
}


// =========================================================
// CONSTRUIR CARTERA
// =========================================================

function construirCartera({
  aprendices,
  cuentas,
  detalles,
  recibos,
}) {
  const cuentasPorDocumento =
    agruparCuentasPorDocumento(
      cuentas
    )

  const detallesPorCuenta =
    agruparPorCuenta(
      detalles
    )

  const recibosPorCuenta =
    agruparPorCuenta(
      recibos
    )

  const resultado = []

  for (
    const aprendiz of
      aprendices
  ) {
    const documento =
      normalizarDocumento(
        aprendiz?.documento
      )

    let cuentasAprendiz =
      cuentasPorDocumento.get(
        documento
      ) ||
      []

    // =====================================================
    // PRIORIZAR CUENTAS DEL MISMO CONVENIO
    // =====================================================

    if (
      aprendiz?.convenio_id
    ) {
      const cuentasMismoConvenio =
        cuentasAprendiz.filter(
          cuenta =>
            Number(
              cuenta?.convenio_id
            ) ===
            Number(
              aprendiz.convenio_id
            )
        )

      if (
        cuentasMismoConvenio.length >
        0
      ) {
        cuentasAprendiz =
          cuentasMismoConvenio
      }
    }

    // =====================================================
    // SOLO CUENTAS ORIGINADAS EN CONVENIO
    // =====================================================

    cuentasAprendiz =
      cuentasAprendiz.filter(
        cuenta =>
          mayusculas(
            cuenta?.origen_matricula
          ) ===
          'CONVENIO'
      )

    let valorTotal =
      0

    let totalPagado =
      0

    let cantidadPagos =
      0

    let fechaUltimoPago =
      null

    const cuentasResultado =
      []

    for (
      const cuenta of
        cuentasAprendiz
    ) {
      const cuentaId =
        Number(
          cuenta?.id
        )

      const recibosCuenta =
        recibosPorCuenta.get(
          cuentaId
        ) ||
        []

      const detallesCuenta =
        detallesPorCuenta.get(
          cuentaId
        ) ||
        []

      const valorCuenta =
        redondear(
          cuenta?.valor_total
        )

      const pagadoCuenta =
        redondear(
          recibosCuenta.reduce(
            (
              suma,
              recibo
            ) =>
              suma +
              numero(
                recibo?.valor
              ),
            0
          )
        )

      const saldoCuenta =
        redondear(
          Math.max(
            0,
            valorCuenta -
              pagadoCuenta
          )
        )

      const estadoCuentaCalculado =
        calcularEstadoCartera({
          valorTotal:
            valorCuenta,

          totalPagado:
            pagadoCuenta,
        })

      valorTotal +=
        valorCuenta

      totalPagado +=
        pagadoCuenta

      cantidadPagos +=
        recibosCuenta.length

      for (
        const recibo of
          recibosCuenta
      ) {
        const fechaPago =
          texto(
            recibo?.fecha
          )

        if (
          fechaPago &&
          (
            !fechaUltimoPago ||
            fechaPago >
              fechaUltimoPago
          )
        ) {
          fechaUltimoPago =
            fechaPago
        }
      }

      cuentasResultado.push({
        ...cuenta,

        estado_bd:
          cuenta?.estado ||
          '',

        estado_cartera:
          estadoCuentaCalculado,

        valor_total:
          valorCuenta,

        total_pagado:
          pagadoCuenta,

        saldo:
          saldoCuenta,

        cantidad_pagos:
          recibosCuenta.length,

        detalle:
          detallesCuenta,
      })
    }

    valorTotal =
      redondear(
        valorTotal
      )

    totalPagado =
      redondear(
        totalPagado
      )

    const saldo =
      redondear(
        Math.max(
          0,
          valorTotal -
            totalPagado
        )
      )

    const estadoCartera =
      calcularEstadoCartera({
        valorTotal,
        totalPagado,
      })

    const convenio =
      aprendiz?.convenio_rel ||
      null

    resultado.push({
      matricula_id:
        aprendiz?.id,

      consecutivo:
        aprendiz?.consecutivo ||
        '',

      fecha_matricula:
        aprendiz?.fecha_matricula ||
        null,

      tipo_documento:
        aprendiz?.tipo_doc ||
        '',

      documento:
        aprendiz?.documento ||
        '',

      nombres:
        aprendiz?.nombres ||
        '',

      apellidos:
        aprendiz?.apellidos ||
        '',

      nombre_completo:
        nombreCompletoAprendiz(
          aprendiz
        ),

      celular:
        aprendiz?.celular ||
        '',

      correo:
        aprendiz?.correo ||
        '',

      ciudad:
        aprendiz?.ciudad ||
        '',

      categorias:
        Array.isArray(
          aprendiz?.categorias
        )
          ? aprendiz.categorias
          : [],

      estado_aprendiz:
        aprendiz?.estado ||
        '',

      origen_matricula:
        aprendiz?.origen_matricula ||
        '',

      convenio_id:
        aprendiz?.convenio_id ||
        null,

      convenio_nombre:
        convenio?.nombre ||
        aprendiz?.convenio ||
        '',

      convenio,

      cantidad_cuentas:
        cuentasAprendiz.length,

      valor_total:
        valorTotal,

      total_pagado:
        totalPagado,

      saldo,

      cantidad_pagos:
        cantidadPagos,

      fecha_ultimo_pago:
        fechaUltimoPago,

      estado_cartera:
        estadoCartera,

      tiene_obligacion:
        cuentasAprendiz.length >
        0,

      cuentas:
        cuentasResultado,
    })
  }

  return resultado
}

// =========================================================
// FILTRAR CARTERA
// =========================================================

function filtrarCartera(
  cartera,
  {
    estadoCartera,
    busqueda,
  }
) {
  const buscar =
    normalizarBusqueda(
      busqueda
    )

  return cartera.filter(
    item => {
      // ===================================================
      // PENDIENTE
      // ===================================================

      if (
        estadoCartera ===
        'PENDIENTE'
      ) {
        if (
          item.estado_cartera !==
            'PENDIENTE' ||
          item.saldo <=
            0 ||
          !item.tiene_obligacion
        ) {
          return false
        }
      }

      // ===================================================
      // ABONADO
      // ===================================================

      if (
        estadoCartera ===
        'ABONADO'
      ) {
        if (
          item.estado_cartera !==
            'ABONADO' ||
          item.total_pagado <=
            0 ||
          item.saldo <=
            0 ||
          !item.tiene_obligacion
        ) {
          return false
        }
      }

      // ===================================================
      // PAZ Y SALVO
      // ===================================================

      if (
        estadoCartera ===
        'PAZ_Y_SALVO'
      ) {
        if (
          item.estado_cartera !==
            'PAZ_Y_SALVO' ||
          !item.tiene_obligacion
        ) {
          return false
        }
      }

      // ===================================================
      // TODOS
      // ===================================================
      //
      // No se aplica filtro adicional.
      //

      // ===================================================
      // BÚSQUEDA
      // ===================================================

      if (
        buscar
      ) {
        const contenido =
          normalizarBusqueda(
            [
              item?.documento,
              item?.consecutivo,
              item?.nombre_completo,
              item?.convenio_nombre,
              ...(item?.categorias ||
                []),
            ].join(
              ' '
            )
          )

        if (
          !contenido.includes(
            buscar
          )
        ) {
          return false
        }
      }

      return true
    }
  )
}

// =========================================================
// RESUMEN CARTERA
// =========================================================

function calcularResumen(
  cartera
) {
  let valorTotal =
    0

  let pagado =
    0

  let saldo =
    0

  let pendientes =
    0

  let abonados =
    0

  let pazYSalvo =
    0

  let sinCuenta =
    0

  for (
    const item of
      cartera
  ) {
    valorTotal +=
      numero(
        item?.valor_total
      )

    pagado +=
      numero(
        item?.total_pagado
      )

    saldo +=
      numero(
        item?.saldo
      )

    if (
      !item?.tiene_obligacion
    ) {
      sinCuenta +=
        1
    }

    if (
      item?.estado_cartera ===
      'PENDIENTE'
    ) {
      pendientes +=
        1
    }

    if (
      item?.estado_cartera ===
      'ABONADO'
    ) {
      abonados +=
        1
    }

    if (
      item?.estado_cartera ===
      'PAZ_Y_SALVO'
    ) {
      pazYSalvo +=
        1
    }
  }

  return {
    cantidad_aprendices:
      cartera.length,

    valor_total:
      redondear(
        valorTotal
      ),

    total_pagado:
      redondear(
        pagado
      ),

    saldo_pendiente:
      redondear(
        saldo
      ),

    pendientes,

    abonados,

    paz_y_salvo:
      pazYSalvo,

    sin_cuenta:
      sinCuenta,

    // =====================================================
    // COMPATIBILIDAD CON page.jsx ACTUAL
    // =====================================================
    //
    // La página todavía utiliza estos nombres en algunas
    // tarjetas. Los conservamos como alias.
    //
    // =====================================================

    sin_abonos:
      pendientes,

    con_abonos:
      abonados,
  }
}

// =========================================================
// DETALLE DE APRENDIZ
// =========================================================

async function consultarDetalleAprendiz(
  supabase,
  matriculaId
) {
  const {
    data:
      aprendiz,

    error:
      errorAprendiz,
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
        direccion,
        barrio,
        ciudad,
        convenio,
        convenio_id,
        categorias,
        estado,
        origen_matricula,
        created_at,

        convenio_rel:convenios!aprendices_convenio_id_fkey (
          id,
          nombre,
          documento,
          celular,
          direccion,
          correo,
          activo
        )
      `)
      .eq(
        'id',
        matriculaId
      )
      .maybeSingle()

  if (
    errorAprendiz
  ) {
    throw new Error(
      `No fue posible consultar el aprendiz: ${errorAprendiz.message}`
    )
  }

  if (
    !aprendiz
  ) {
    return null
  }

  const cuentas =
    await consultarCuentas(
      supabase,
      [
        aprendiz.documento,
      ]
    )

  let cuentasAprendiz =
    cuentas.filter(
      cuenta =>
        mayusculas(
          cuenta?.origen_matricula
        ) ===
        'CONVENIO'
    )

  // =======================================================
  // MISMO CONVENIO
  // =======================================================

  if (
    aprendiz?.convenio_id
  ) {
    const mismoConvenio =
      cuentasAprendiz.filter(
        cuenta =>
          Number(
            cuenta?.convenio_id
          ) ===
          Number(
            aprendiz.convenio_id
          )
      )

    if (
      mismoConvenio.length >
      0
    ) {
      cuentasAprendiz =
        mismoConvenio
    }
  }

  const cuentasIds =
    cuentasAprendiz
      .map(
        cuenta =>
          Number(
            cuenta?.id
          )
      )
      .filter(
        Boolean
      )

  const [
    detalles,
    recibos,
  ] =
    await Promise.all([
      consultarDetallesCuenta(
        supabase,
        cuentasIds
      ),

      consultarRecibos(
        supabase,
        cuentasIds,
        true
      ),
    ])

  const recibosActivos =
    recibos.filter(
      recibo =>
        mayusculas(
          recibo?.estado
        ) ===
        'ACTIVO'
    )

  const cartera =
    construirCartera({
      aprendices: [
        aprendiz,
      ],

      cuentas:
        cuentasAprendiz,

      detalles,

      recibos:
        recibosActivos,
    })

  const resumen =
    cartera[0] ||
    null

  return {
    ...resumen,

    aprendiz,

    cuentas:
      resumen?.cuentas ||
      [],

    recibos,

    pagos_activos:
      recibosActivos,

    pagos_anulados:
      recibos.filter(
        recibo =>
          mayusculas(
            recibo?.estado
          ) ===
          'ANULADO'
      ),
  }
}

// =========================================================
// GET
// =========================================================

export async function GET(
  request
) {
  try {
    // =====================================================
    // MULTIEMPRESA
    // =====================================================

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
        ) ||
        'cartera'
      ).toLowerCase()

    // =====================================================
    // CATÁLOGO DE CONVENIOS
    // =====================================================

    if (
      recurso ===
      'convenios'
    ) {
      const convenios =
        await consultarConvenios(
          supabase
        )

      return NextResponse.json({
        status:
          'success',

        data:
          convenios,

        total:
          convenios.length,

        empresa:
          construirEmpresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // DETALLE DE APRENDIZ
    // =====================================================

    if (
      recurso ===
      'detalle'
    ) {
      const matriculaId =
        enteroPositivo(
          searchParams.get(
            'matricula_id'
          ) ||
          searchParams.get(
            'id'
          )
        )

      if (
        !matriculaId
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El identificador de la matrícula es obligatorio.',
          },
          {
            status:
              400,
          }
        )
      }

      const detalle =
        await consultarDetalleAprendiz(
          supabase,
          matriculaId
        )

      if (
        !detalle
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'No se encontró el aprendiz solicitado.',
          },
          {
            status:
              404,
          }
        )
      }

      return NextResponse.json({
        status:
          'success',

        data:
          detalle,

        empresa:
          construirEmpresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // CARTERA
    // =====================================================

    if (
      recurso ===
      'cartera'
    ) {
      const convenioId =
        enteroPositivo(
          searchParams.get(
            'convenio_id'
          )
        )

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

      const busqueda =
        texto(
          searchParams.get(
            'busqueda'
          )
        )

      // ===================================================
      // ESTADO POR DEFECTO
      // ===================================================
      //
      // PENDIENTE:
      // aprendiz con obligación y sin pagos activos.
      //
      // ===================================================

      const estadoCartera =
        mayusculas(
          searchParams.get(
            'estado_cartera'
          ) ||
          'PENDIENTE'
        )

      // ===================================================
      // VALIDAR FECHA INICIAL
      // ===================================================

      if (
        fechaInicio &&
        !fechaValida(
          fechaInicio
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'La fecha inicial no es válida.',
          },
          {
            status:
              400,
          }
        )
      }

      // ===================================================
      // VALIDAR FECHA FINAL
      // ===================================================

      if (
        fechaFin &&
        !fechaValida(
          fechaFin
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'La fecha final no es válida.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        fechaInicio &&
        fechaFin &&
        fechaFin <
          fechaInicio
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'La fecha final no puede ser anterior a la fecha inicial.',
          },
          {
            status:
              400,
          }
        )
      }

      // ===================================================
      // VALIDAR ESTADO
      // ===================================================

      if (
        !ESTADOS_CARTERA_VALIDOS.has(
          estadoCartera
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El estado de cartera solicitado no es válido.',
          },
          {
            status:
              400,
          }
        )
      }

      // ===================================================
      // 1. APRENDICES DE CONVENIO
      // ===================================================

      const aprendices =
        await consultarAprendicesConvenio(
          supabase,
          {
            fechaInicio,
            fechaFin,
            convenioId,
          }
        )

      // ===================================================
      // SIN APRENDICES
      // ===================================================

      if (
        aprendices.length ===
        0
      ) {
        return NextResponse.json({
          status:
            'success',

          data:
            [],

          total:
            0,

          total_universo:
            0,

          resumen: {
            cantidad_aprendices:
              0,

            valor_total:
              0,

            total_pagado:
              0,

            saldo_pendiente:
              0,

            pendientes:
              0,

            abonados:
              0,

            paz_y_salvo:
              0,

            sin_cuenta:
              0,

            sin_abonos:
              0,

            con_abonos:
              0,
          },

          filtros: {
            convenio_id:
              convenioId,

            fecha_inicio:
              fechaInicio,

            fecha_fin:
              fechaFin,

            estado_cartera:
              estadoCartera,

            busqueda,
          },

          empresa:
            construirEmpresaRespuesta(
              empresa
            ),
        })
      }

      // ===================================================
      // 2. DOCUMENTOS
      // ===================================================

      const documentos =
        aprendices
          .map(
            aprendiz =>
              normalizarDocumento(
                aprendiz?.documento
              )
          )
          .filter(
            Boolean
          )

      // ===================================================
      // 3. CUENTAS
      // ===================================================

      const cuentas =
        await consultarCuentas(
          supabase,
          documentos
        )

      const cuentasConvenio =
        cuentas.filter(
          cuenta =>
            mayusculas(
              cuenta?.origen_matricula
            ) ===
            'CONVENIO'
        )

      const cuentasIds =
        cuentasConvenio
          .map(
            cuenta =>
              Number(
                cuenta?.id
              )
          )
          .filter(
            Boolean
          )

      // ===================================================
      // 4. DETALLE + PAGOS ACTIVOS
      // ===================================================

      const [
        detalles,
        recibos,
      ] =
        await Promise.all([
          consultarDetallesCuenta(
            supabase,
            cuentasIds
          ),

          consultarRecibos(
            supabase,
            cuentasIds,
            false
          ),
        ])

      // ===================================================
      // 5. CONSTRUIR CARTERA
      // ===================================================

      const carteraCompleta =
        construirCartera({
          aprendices,

          cuentas:
            cuentasConvenio,

          detalles,

          recibos,
        })

      // ===================================================
      // 6. RESUMEN GENERAL
      // ===================================================
      //
      // El resumen se calcula sobre todo el universo que
      // cumple convenio y rango de matrícula.
      //
      // No se limita al estado seleccionado.
      //
      // ===================================================

      const resumen =
        calcularResumen(
          carteraCompleta
        )

      // ===================================================
      // 7. FILTRAR TABLA
      // ===================================================

      const carteraFiltrada =
        filtrarCartera(
          carteraCompleta,
          {
            estadoCartera,
            busqueda,
          }
        )

      // ===================================================
      // RESPUESTA
      // ===================================================

      return NextResponse.json({
        status:
          'success',

        data:
          carteraFiltrada,

        total:
          carteraFiltrada.length,

        total_universo:
          carteraCompleta.length,

        resumen,

        filtros: {
          convenio_id:
            convenioId,

          fecha_inicio:
            fechaInicio,

          fecha_fin:
            fechaFin,

          estado_cartera:
            estadoCartera,

          busqueda,
        },

        empresa:
          construirEmpresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // RECURSO INVÁLIDO
    // =====================================================

    return NextResponse.json(
      {
        status:
          'error',

        message:
          'Recurso no válido.',
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
      'Error GET /api/admin/caja/convenios:',
      error
    )

    return respuestaError(
      error
    )
  }
}