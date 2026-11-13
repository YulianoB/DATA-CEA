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

// Consultas paginadas para no truncar la cartera al límite de PostgREST.
// Los lotes también evitan URLs demasiado largas en filtros .in().
async function consultarTodosLotes(crearConsulta, etiqueta, tamano = 500) {
  const resultado = []
  for (let inicio = 0; ; inicio += tamano) {
    const { data, error } = await crearConsulta().range(inicio, inicio + tamano - 1)
    if (error) throw new Error(`No fue posible consultar ${etiqueta}: ${error.message}`)
    resultado.push(...(data || []))
    if (!data || data.length < tamano) break
  }
  return resultado
}

async function consultarPorIdsEnLotes(ids, crearConsulta, etiqueta) {
  const resultado = []
  const unicos = [...new Set(ids.filter(Boolean))]
  for (let i = 0; i < unicos.length; i += 150) {
    const lote = unicos.slice(i, i + 150)
    resultado.push(...await consultarTodosLotes(() => crearConsulta(lote), etiqueta))
  }
  return resultado
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
  const construirConsulta = () => {
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

    return consulta.order('fecha_matricula', { ascending: false })
      .order('id', { ascending: false })
  }
  return consultarTodosLotes(construirConsulta, 'los aprendices por convenio')
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

  return consultarPorIdsEnLotes(unicos, lote =>
    supabase.from('cuentas_aprendiz').select(`
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
      `).in('documento', lote).neq('estado','ANULADA').order('created_at',{ascending:true}), 'consultarCuentas')
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

  return consultarPorIdsEnLotes(cuentasIds, lote =>
    supabase.from('cuentas_aprendiz_detalle').select(`
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
      `).in('cuenta_id', lote).eq('estado','ACTIVO').order('id',{ascending:true}), 'consultarDetallesCuenta')
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

  return consultarPorIdsEnLotes(cuentasIds, lote => {
    let consulta = supabase.from('recibos_caja').select(`
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
      `).in('cuenta_id', lote)
    if (!incluirAnulados) consulta = consulta.eq('estado', 'ACTIVO')
    return consulta.order('fecha',{ascending:true}).order('id',{ascending:true})
  }, 'consultarRecibos')
}

// Las aplicaciones identifican qué parte del recibo corresponde a cada
// componente de la obligación, incluso cuando una cuenta incluye dos matrículas.
async function consultarAplicacionesRecibos(supabase, recibos) {
  return consultarPorIdsEnLotes(recibos.map(r => r.id), lote =>
    supabase.from('recibos_caja_detalle')
      .select('id,recibo_id,cuenta_detalle_id,valor')
      .in('recibo_id', lote)
      .order('id', { ascending: true }), 'aplicaciones de recibos')
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

  // Una obligación de $0 aún sin liquidar no equivale a paz y salvo.
  if (valorTotal <= 0) return 'SIN_LIQUIDAR'

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
  aplicaciones = [],
}) {
  const cuentasPorId = new Map(cuentas.map(c => [Number(c.id), c]))
  const detallesPorId = new Map(detalles.map(d => [Number(d.id), d]))
  const detallesPorCuenta = agruparPorCuenta(detalles)
  const aplicacionesPorRecibo = new Map() // Indexadas por recibo_id.
  for (const aplicacion of aplicaciones) {
    const id = Number(aplicacion.recibo_id)
    if (!aplicacionesPorRecibo.has(id)) aplicacionesPorRecibo.set(id, [])
    aplicacionesPorRecibo.get(id).push(aplicacion)
  }

  const cuentasPorMatricula = new Map()
  const valores = new Map()
  const pagos = new Map()
  const pagosPorCuenta = new Map()
  const recibosPorMatricula = new Map()
  const fechaPagos = new Map()
  const matriculasValidas = new Set(aprendices.map(a => Number(a.id)))

  const asociar = (matriculaId, cuentaId, valor = 0, pagado = 0, recibo = null) => {
    const id = Number(matriculaId)
    if (!matriculasValidas.has(id)) return
    if (!cuentasPorMatricula.has(id)) cuentasPorMatricula.set(id, new Set())
    cuentasPorMatricula.get(id).add(cuentaId)
    valores.set(id, redondear((valores.get(id) || 0) + valor))
    pagos.set(id, redondear((pagos.get(id) || 0) + pagado))
    const clave = `${id}:${cuentaId}`
    pagosPorCuenta.set(clave, redondear((pagosPorCuenta.get(clave) || 0) + pagado))
    if (recibo && pagado) {
      if (!recibosPorMatricula.has(id)) recibosPorMatricula.set(id, new Set())
      recibosPorMatricula.get(id).add(recibo.id)
      const fecha = texto(recibo.fecha)
      if (fecha && fecha > (fechaPagos.get(id) || '')) fechaPagos.set(id, fecha)
    }
  }

  for (const detalle of detalles) {
    const cuenta = cuentasPorId.get(Number(detalle.cuenta_id))
    if (!cuenta || mayusculas(cuenta.origen_matricula) !== 'CONVENIO') continue
    if (!matriculasValidas.has(Number(detalle.matricula_id))) continue
    asociar(detalle.matricula_id, Number(cuenta.id), numero(detalle.valor))
  }

  for (const recibo of recibos) {
    const cuentaId = Number(recibo.cuenta_id)
    const cuenta = cuentasPorId.get(cuentaId)
    if (!cuenta || mayusculas(cuenta.origen_matricula) !== 'CONVENIO') continue
    const aplicacionesRecibo = aplicacionesPorRecibo.get(Number(recibo.id)) || []
    const aplicadas = aplicacionesRecibo.filter(a => detallesPorId.has(Number(a.cuenta_detalle_id)))
    if (aplicadas.length) {
      let totalAplicado = 0
      for (const aplicacion of aplicadas) {
        const detalle = detallesPorId.get(Number(aplicacion.cuenta_detalle_id))
        if (Number(detalle.cuenta_id) !== cuentaId) continue
        const monto = numero(aplicacion.valor)
        totalAplicado += monto
        asociar(detalle.matricula_id, cuentaId, 0, monto, recibo)
      }
      if (Math.abs(totalAplicado - numero(recibo.valor)) > 0.01) {
        console.warn('Recibo con diferencia de distribución en cartera:', recibo.id)
      }
      continue
    }
    // Recibos históricos sin distribución: solo asignar cuando su matrícula
    // es explícita o cuando toda la obligación pertenece a una matrícula.
    const vinculados = detallesPorCuenta.get(cuentaId) || []
    const matriculasCuenta = [...new Set(vinculados.map(d => Number(d.matricula_id)).filter(Boolean))]
    const idExplicito = Number(recibo.matricula_id)
    const matricula = matriculasCuenta.includes(idExplicito)
      ? idExplicito
      : matriculasCuenta.length === 1 ? matriculasCuenta[0] : null
    if (matricula) asociar(matricula, cuentaId, 0, numero(recibo.valor), recibo)
    else console.warn('Recibo sin matrícula asociable en cartera:', recibo.id)
  }

  return aprendices.map(aprendiz => {
    const matriculaId = Number(aprendiz.id)
    const cuentasIds = [...(cuentasPorMatricula.get(matriculaId) || [])]
    const cuentasResultado = cuentasIds.map(id => {
      const cuenta = cuentasPorId.get(id)
      const detalleMatricula = (detallesPorCuenta.get(id) || [])
        .filter(d => Number(d.matricula_id) === matriculaId)
      const valorTotal = redondear(detalleMatricula.reduce((n,d) => n + numero(d.valor), 0))
      const pagado = redondear(pagosPorCuenta.get(`${matriculaId}:${id}`) || 0)
      return {
        ...cuenta,
        estado_bd: cuenta?.estado || '',
        estado_cartera: calcularEstadoCartera({valorTotal,totalPagado:pagado}),
        valor_total: valorTotal,
        total_pagado: pagado,
        saldo: redondear(Math.max(0, valorTotal - pagado)),
        detalle: detalleMatricula,
      }
    })
    const valorTotal = redondear(valores.get(matriculaId) || 0)
    const totalPagado = redondear(pagos.get(matriculaId) || 0)
    const saldo = redondear(Math.max(0, valorTotal - totalPagado))
    const tieneObligacion = cuentasIds.length > 0
    return {
      matricula_id: aprendiz.id,
      consecutivo: aprendiz.consecutivo || '',
      fecha_matricula: aprendiz.fecha_matricula || null,
      tipo_documento: aprendiz.tipo_doc || '',
      documento: aprendiz.documento || '',
      nombres: aprendiz.nombres || '',
      apellidos: aprendiz.apellidos || '',
      nombre_completo: nombreCompletoAprendiz(aprendiz),
      celular: aprendiz.celular || '',
      correo: aprendiz.correo || '',
      ciudad: aprendiz.ciudad || '',
      categorias: Array.isArray(aprendiz.categorias) ? aprendiz.categorias : [],
      estado_aprendiz: aprendiz.estado || '',
      origen_matricula: aprendiz.origen_matricula || '',
      convenio_id: aprendiz.convenio_id || null,
      convenio_nombre: aprendiz?.convenio_rel?.nombre || aprendiz.convenio || '',
      convenio: aprendiz.convenio_rel || null,
      cantidad_cuentas: cuentasIds.length,
      valor_total: valorTotal,
      total_pagado: totalPagado,
      saldo,
      cantidad_pagos: recibosPorMatricula.get(matriculaId)?.size || 0,
      fecha_ultimo_pago: fechaPagos.get(matriculaId) || null,
      estado_cartera: !tieneObligacion || valorTotal <= 0
        ? 'SIN_LIQUIDAR'
        : calcularEstadoCartera({ valorTotal, totalPagado }),
      tiene_obligacion: tieneObligacion,
      cuentas: cuentasResultado,
    }
  })
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

  const aplicaciones = await consultarAplicacionesRecibos(supabase, recibos)

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
      aplicaciones,
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

      const aplicaciones = await consultarAplicacionesRecibos(supabase, recibos)

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
          aplicaciones,
        })

      // Los importes pertenecen al universo filtrado completo, no solo
      // a la página visible; mismo criterio para tarjetas y pie de tabla.
      const carteraFiltrada = filtrarCartera(carteraCompleta, {
        estadoCartera,
        busqueda,
      })
      const resumen = calcularResumen(carteraFiltrada)
      const pagina = Math.max(1, Math.min(100000, enteroPositivo(searchParams.get('pagina')) || 1))
      const porPaginaSolicitado = enteroPositivo(searchParams.get('por_pagina')) || 25
      const porPagina = [25, 50, 100].includes(porPaginaSolicitado) ? porPaginaSolicitado : 25
      const total = carteraFiltrada.length
      const totalPaginas = Math.max(1, Math.ceil(total / porPagina))
      const paginaActual = Math.min(pagina, totalPaginas)
      const carteraPaginada = carteraFiltrada.slice(
        (paginaActual - 1) * porPagina, paginaActual * porPagina
      )

      // ===================================================
      // RESPUESTA
      // ===================================================

      return NextResponse.json({
        status:
          'success',

        data:
          carteraPaginada,

        total,
        pagina: paginaActual,
        por_pagina: porPagina,
        total_paginas: totalPaginas,
        hay_mas: paginaActual < totalPaginas,

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