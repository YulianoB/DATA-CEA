// app/api/admin/caja/egresos/route.js
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
const LIMITE_CONSULTA =
  200
const ESTADOS_VALIDOS =
  new Set([
    'ACTIVO',
    'ANULADO',
  ])
// =========================================================
// RESPUESTA ERROR
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
function limpiarBusqueda(
  valor
) {
  return texto(
    valor
  ).replace(
    /[%\_]/g,
    ''
  )
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
function enteroPositivo(
  valor
) {
  if (
    valor === '' ||
    valor === null ||
    valor === undefined
  ) {
    return null
  }
  const numero =
    Number(
      valor
    )
  if (
    !Number.isInteger(
      numero
    ) ||
    numero <= 0
  ) {
    return null
  }
  return numero
}
function numeroPositivo(
  valor
) {
  if (
    valor === '' ||
    valor === null ||
    valor === undefined
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
    ) ||
    numero <= 0
  ) {
    return null
  }
  return Math.round(
    numero * 100
  ) / 100
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
// EMPRESA
// =========================================================
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
    representante_legal:
      empresa?.representante_legal ||
      '',
    documento_representante:
      empresa?.documento_representante ||
      '',
  }
}
// =========================================================
// CONSECUTIVO CUENTA DE COBRO
// =========================================================
//
// Ejemplo:
//
// CC-2026-000025
//
// Se construye a partir del ID real del egreso.
// No requiere tabla adicional, trigger ni función SQL.
//
// =========================================================
function generarConsecutivoCuentaCobro(
  id,
  fecha
) {
  const fechaTexto =
    texto(
      fecha
    )
  const anio =
    /^\d{4}/.test(
      fechaTexto
    )
      ? fechaTexto.slice(
          0,
          4
        )
      : hoyColombia()
          .slice(
            0,
            4
          )
  const numero =
    String(
      id
    ).padStart(
      6,
      '0'
    )
  return `CC-${anio}-${numero}`
}
// =========================================================
// CONCEPTO
// =========================================================
async function obtenerConcepto(
  supabase,
  conceptoId
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
        nombre,
        descripcion,
        naturaleza,
        requiere_aprendiz,
        requiere_vehiculo,
        es_gasto_pesv,
        categoria_pesv,
        activo
      `)
      .eq(
        'id',
        conceptoId
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
    const errorConcepto =
      new Error(
        'El concepto seleccionado no existe.'
      )
    errorConcepto.status =
      400
    throw errorConcepto
  }
  if (
    data.activo !==
    true
  ) {
    const errorConcepto =
      new Error(
        'El concepto seleccionado se encuentra inactivo.'
      )
    errorConcepto.status =
      400
    throw errorConcepto
  }
  const naturaleza =
    mayusculas(
      data.naturaleza
    )
  if (
    ![
      'EGRESO',
      'AMBOS',
    ].includes(
      naturaleza
    )
  ) {
    const errorConcepto =
      new Error(
        'El concepto seleccionado no está habilitado para egresos.'
      )
    errorConcepto.status =
      400
    throw errorConcepto
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
        descripcion,
        activo
      `)
      .eq(
        'id',
        medioPagoId
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
    const errorMedio =
      new Error(
        'El medio de pago seleccionado no existe.'
      )
    errorMedio.status =
      400
    throw errorMedio
  }
  if (
    data.activo !==
    true
  ) {
    const errorMedio =
      new Error(
        'El medio de pago seleccionado se encuentra inactivo.'
      )
    errorMedio.status =
      400
    throw errorMedio
  }
  return data
}
// =========================================================
// VEHÍCULO
// =========================================================
async function obtenerVehiculo(
  supabase,
  vehiculoId
) {
  if (
    !vehiculoId
  ) {
    return null
  }
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'vehiculos'
      )
      .select(`
        id,
        placa,
        tipo_vehiculo,
        marca,
        linea,
        modelo,
        estado,
        propietario,
        clasificacion
      `)
      .eq(
        'id',
        vehiculoId
      )
      .maybeSingle()
  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar el vehículo: ${error.message}`
    )
  }
  if (
    !data
  ) {
    const errorVehiculo =
      new Error(
        'El vehículo seleccionado no existe.'
      )
    errorVehiculo.status =
      400
    throw errorVehiculo
  }
  return data
}
// =========================================================
// AUDITORÍA
// =========================================================
async function registrarAuditoria(
  supabase,
  {
    usuario,
    accion,
    entidadId,
    consecutivoReferencia,
    descripcion,
    datosAnteriores = null,
    datosNuevos = null,
    motivo = null,
    observaciones = null,
  }
) {
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
          'EGRESO_CAJA',
        entidad_id:
          entidadId,
        matricula_id:
          null,
        documento:
          null,
        consecutivo_referencia:
          texto(
            consecutivoReferencia
          ) ||
          null,
        descripcion:
          texto(
            descripcion
          ),
        datos_anteriores:
          datosAnteriores,
        datos_nuevos:
          datosNuevos,
        motivo:
          texto(
            motivo
          ) ||
          null,
        observaciones:
          texto(
            observaciones
          ) ||
          null,
        origen:
          'MODULO_CAJA_EGRESOS',
      })
  if (
    error
  ) {
    throw new Error(
      `No fue posible registrar la auditoría: ${error.message}`
    )
  }
}
// =========================================================
// EGRESO POR ID
// =========================================================
async function obtenerEgresoPorId(
  supabase,
  id
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'egresos_caja'
      )
      .select(`
        id,
        concepto_id,
        es_gasto_pesv,
        categoria_pesv,
        medio_pago_id,
        vehiculo_id,
        placa,
        fecha,
        modalidad,
        receptor_dinero,
        tipo_documento_receptor,
        documento_receptor,
        estado_legalizacion,
        fecha_legalizacion,
        valor_legalizado,
        valor_reintegrado,
        valor_reembolsado,
        legalizado_por,
        observaciones_legalizacion,
        beneficiario,
        tipo_documento_beneficiario,
        documento_beneficiario,
        descripcion,
        valor,
        numero_factura,
        numero_cuenta_cobro,
        referencia_pago,
        pagado_por,
        observaciones,
        estado,
        motivo_anulacion,
        usuario_anulacion,
        fecha_anulacion,
        created_at,
        updated_at,
        concepto:conceptos_caja (
          id,
          nombre,
          descripcion,
          naturaleza,
          requiere_vehiculo,
          es_gasto_pesv,
          categoria_pesv
        ),
        medio_pago:medios_pago_caja (
          id,
          nombre
        ),
        vehiculo:vehiculos (
          id,
          placa,
          tipo_vehiculo,
          marca,
          linea,
          modelo,
          estado,
          propietario,
          clasificacion
        )
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
      `No fue posible consultar el egreso: ${error.message}`
    )
  }
  return data
}
// =========================================================
// LISTAR EGRESOS
// =========================================================
async function listarEgresos(
  supabase,
  {
    busqueda,
    fechaInicio,
    fechaFin,
    estado,
    conceptoId,
  }
) {
  let consulta =
    supabase
      .from(
        'egresos_caja'
      )
      .select(`
        id,
        concepto_id,
        es_gasto_pesv,
        categoria_pesv,
        medio_pago_id,
        vehiculo_id,
        placa,
        fecha,
        modalidad,
        receptor_dinero,
        tipo_documento_receptor,
        documento_receptor,
        estado_legalizacion,
        fecha_legalizacion,
        valor_legalizado,
        valor_reintegrado,
        valor_reembolsado,
        legalizado_por,
        observaciones_legalizacion,
        beneficiario,
        tipo_documento_beneficiario,
        documento_beneficiario,
        descripcion,
        valor,
        numero_factura,
        numero_cuenta_cobro,
        referencia_pago,
        pagado_por,
        observaciones,
        estado,
        motivo_anulacion,
        usuario_anulacion,
        fecha_anulacion,
        created_at,
        updated_at,
        concepto:conceptos_caja (
          id,
          nombre,
          descripcion,
          naturaleza,
          requiere_vehiculo,
          es_gasto_pesv,
          categoria_pesv
        ),
        medio_pago:medios_pago_caja (
          id,
          nombre
        ),
        vehiculo:vehiculos (
          id,
          placa,
          tipo_vehiculo,
          marca,
          linea,
          modelo
        )
      `)
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
  if (
    estado
  ) {
    consulta =
      consulta.eq(
        'estado',
        estado
      )
  }
  if (
    conceptoId
  ) {
    consulta =
      consulta.eq(
        'concepto_id',
        conceptoId
      )
  }
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
          `referencia_pago.ilike.%${termino}%`,
          `placa.ilike.%${termino}%`,
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
        LIMITE_CONSULTA
      )
  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar los egresos: ${error.message}`
    )
  }
  return Array.isArray(
    data
  )
    ? data
    : []
}
// =========================================================
// RESUMEN
// =========================================================
async function obtenerResumen(
  supabase,
  {
    fechaInicio,
    fechaFin,
  }
) {
  let consulta =
    supabase
      .from(
        'egresos_caja'
      )
      .select(`
        id,
        valor,
        modalidad,
        valor_reintegrado,
        valor_reembolsado,
        estado,
        medio_pago:medios_pago_caja (
          id,
          nombre
        )
      `)
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
  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar el resumen de egresos: ${error.message}`
    )
  }
  const registros =
    Array.isArray(
      data
    )
      ? data
      : []
  let totalEgresos =
    0
  let totalEfectivo =
    0
  let totalOtrosMedios =
    0
  let cantidadEgresos =
    0
  let cantidadAnulados =
    0
  for (
    const registro of
      registros
  ) {
    const estado =
      mayusculas(
        registro?.estado
      )
    if (
      estado ===
      'ANULADO'
    ) {
      cantidadAnulados +=
        1
      continue
    }
    // Misma conciliación neta aplicada en el cierre diario.
    const valor = Number(registro?.valor || 0) +
      (mayusculas(registro?.modalidad) === 'ENTREGA_PARA_LEGALIZAR'
        ? Number(registro?.valor_reembolsado || 0) -
          Number(registro?.valor_reintegrado || 0)
        : 0)
    cantidadEgresos +=
      1
    totalEgresos +=
      valor
    const medio =
      mayusculas(
        registro
          ?.medio_pago
          ?.nombre
      )
    if (
      medio ===
      'EFECTIVO'
    ) {
      totalEfectivo +=
        valor
    } else {
      totalOtrosMedios +=
        valor
    }
  }
  return {
    total_egresos:
      totalEgresos,
    total_efectivo:
      totalEfectivo,
    total_otros_medios:
      totalOtrosMedios,
    cantidad_egresos:
      cantidadEgresos,
    cantidad_anulados:
      cantidadAnulados,
  }
}
// =========================================================
// EFECTIVO DISPONIBLE PARA EGRESOS
// =========================================================
//
// El control aplica únicamente cuando el medio de pago es
// EFECTIVO. Los pagos realizados por transferencia, cuenta
// bancaria u otros medios siguen registrándose completos,
// pero no afectan el efectivo físico del arqueo.
//
// Si ingresan recursos de reserva físicamente a la caja,
// primero deben registrarse como ingreso con medio EFECTIVO.
// Así queda trazado el origen del dinero antes de gastarlo.
//
// =========================================================
async function obtenerEfectivoDisponible(
  supabase
) {
  const {
    data:
      ultimoCierre,
    error:
      errorCierre,
  } =
    await supabase
      .from(
        'cierres_caja'
      )
      .select(
        'periodo_hasta'
      )
      .order(
        'periodo_hasta',
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
        1
      )
      .maybeSingle()

  if (
    errorCierre
  ) {
    throw new Error(
      `No fue posible consultar el último arqueo para validar el efectivo: ${errorCierre.message}`
    )
  }

  const periodoDesde =
    ultimoCierre?.periodo_hasta ||
    '1970-01-01T00:00:00.000Z'

  const [
    respuestaIngresos,
    respuestaEgresos,
  ] =
    await Promise.all([
      supabase
        .from(
          'recibos_caja'
        )
        .select(`
          valor,
          estado,
          medio_pago:medios_pago_caja (
            nombre
          )
        `)
        .gt(
          'created_at',
          periodoDesde
        ),

      supabase
        .from(
          'egresos_caja'
        )
        .select(`
          valor,
          modalidad,
          valor_reintegrado,
          valor_reembolsado,
          estado,
          medio_pago:medios_pago_caja (
            nombre
          )
        `)
        .gt(
          'created_at',
          periodoDesde
        ),
    ])

  if (
    respuestaIngresos.error
  ) {
    throw new Error(
      `No fue posible validar los ingresos en efectivo: ${respuestaIngresos.error.message}`
    )
  }

  if (
    respuestaEgresos.error
  ) {
    throw new Error(
      `No fue posible validar los egresos en efectivo: ${respuestaEgresos.error.message}`
    )
  }

  const ingresosEfectivo =
    (
      respuestaIngresos.data ||
      []
    ).reduce(
      (
        total,
        registro
      ) => {
        if (
          mayusculas(
            registro?.estado
          ) ===
            'ANULADO' ||
          mayusculas(
            registro
              ?.medio_pago
              ?.nombre
          ) !==
            'EFECTIVO'
        ) {
          return total
        }

        return (
          total +
          Number(
            registro?.valor ||
            0
          )
        )
      },
      0
    )

  const egresosEfectivo =
    (
      respuestaEgresos.data ||
      []
    ).reduce(
      (
        total,
        registro
      ) => {
        if (
          mayusculas(
            registro?.estado
          ) ===
            'ANULADO' ||
          mayusculas(
            registro
              ?.medio_pago
              ?.nombre
          ) !==
            'EFECTIVO'
        ) {
          return total
        }

        return (
          total +
          Number(
            registro?.valor ||
            0
          ) -
          (mayusculas(registro?.modalidad) === 'ENTREGA_PARA_LEGALIZAR'
            ? Number(registro?.valor_reintegrado || 0)
            : 0) +
          (mayusculas(registro?.modalidad) === 'ENTREGA_PARA_LEGALIZAR'
            ? Number(registro?.valor_reembolsado || 0)
            : 0)
        )
      },
      0
    )

  return {
    ingresos_efectivo:
      Math.round(
        ingresosEfectivo *
        100
      ) / 100,

    egresos_efectivo:
      Math.round(
        egresosEfectivo *
        100
      ) / 100,

    disponible:
      Math.max(
        0,
        Math.round(
          (
            ingresosEfectivo -
            egresosEfectivo
          ) *
          100
        ) / 100
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
    // LISTAR
    // =====================================================
    if (
      recurso ===
      'listar'
    ) {
      const busqueda =
        texto(
          searchParams.get(
            'q'
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
      const estado =
        mayusculas(
          searchParams.get(
            'estado'
          )
        )
      const conceptoId =
        enteroPositivo(
          searchParams.get(
            'concepto_id'
          )
        )
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
      if (
        estado &&
        !ESTADOS_VALIDOS.has(
          estado
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',
            message:
              'El estado seleccionado no es válido.',
          },
          {
            status:
              400,
          }
        )
      }
      const registros =
        await listarEgresos(
          supabase,
          {
            busqueda,
            fechaInicio,
            fechaFin,
            estado,
            conceptoId,
          }
        )
      return NextResponse.json({
        status:
          'success',
        data:
          registros,
        total:
          registros.length,
        limite:
          LIMITE_CONSULTA,
        empresa:
          construirEmpresaRespuesta(
            empresa
          ),
      })
    }
    // =====================================================
    // DETALLE
    // =====================================================
    if (
      recurso ===
      'detalle'
    ) {
      const id =
        enteroPositivo(
          searchParams.get(
            'id'
          )
        )
      if (
        !id
      ) {
        return NextResponse.json(
          {
            status:
              'error',
            message:
              'El identificador del egreso es obligatorio.',
          },
          {
            status:
              400,
          }
        )
      }
      const egreso =
        await obtenerEgresoPorId(
          supabase,
          id
        )
      if (
        !egreso
      ) {
        return NextResponse.json(
          {
            status:
              'error',
            message:
              'El egreso solicitado no existe.',
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
          egreso,
        empresa:
          construirEmpresaRespuesta(
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
      const fechaInicio =
        texto(
          searchParams.get(
            'fecha_inicio'
          )
        ) ||
        hoyColombia()
      const fechaFin =
        texto(
          searchParams.get(
            'fecha_fin'
          )
        ) ||
        fechaInicio
      if (
        !fechaValida(
          fechaInicio
        ) ||
        !fechaValida(
          fechaFin
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',
            message:
              'El rango de fechas no es válido.',
          },
          {
            status:
              400,
          }
        )
      }
      if (
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
      const resumen =
        await obtenerResumen(
          supabase,
          {
            fechaInicio,
            fechaFin,
          }
        )
      return NextResponse.json({
        status:
          'success',
        data:
          resumen,
        empresa:
          construirEmpresaRespuesta(
            empresa
          ),
      })
    }
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
      'Error GET /api/admin/caja/egresos:',
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
    // =====================================================
    // VALIDAR DISPONIBILIDAD DE EFECTIVO
    // =====================================================
    if (
      accion ===
      'validar_efectivo'
    ) {
      const medioPagoId =
        enteroPositivo(
          body?.medio_pago_id
        )

      const valor =
        numeroPositivo(
          body?.valor
        )

      if (
        !medioPagoId ||
        valor === null
      ) {
        return NextResponse.json({
          status: 'success',
          data: {
            requiere_justificacion: false,
            efectivo_disponible: 0,
            recursos_adicionales: 0,
          },
        })
      }

      const medioPago =
        await obtenerMedioPago(
          supabase,
          medioPagoId
        )

      if (
        mayusculas(
          medioPago?.nombre
        ) !==
        'EFECTIVO'
      ) {
        return NextResponse.json({
          status: 'success',
          data: {
            requiere_justificacion: false,
            efectivo_disponible: null,
            recursos_adicionales: 0,
          },
        })
      }

      const efectivo =
        await obtenerEfectivoDisponible(
          supabase
        )

      const faltante =
        Math.max(
          0,
          Math.round(
            (
              valor -
              efectivo.disponible
            ) *
            100
          ) / 100
        )

      return NextResponse.json({
        status: 'success',
        data: {
          requiere_justificacion:
            faltante > 0,
          efectivo_disponible:
            efectivo.disponible,
          recursos_adicionales:
            faltante,
        },
      })
    }

    // =====================================================
    // REGISTRAR
    // =====================================================
    if (
      accion ===
      'registrar'
    ) {
      const conceptoId =
        enteroPositivo(
          body?.concepto_id
        )
      const medioPagoId =
        enteroPositivo(
          body?.medio_pago_id
        )
      const vehiculoId =
        enteroPositivo(
          body?.vehiculo_id
        )
      const fecha =
        texto(
          body?.fecha
        ) ||
        hoyColombia()
      const modalidad =
        mayusculas(body?.modalidad || 'PAGO_DIRECTO')
      const esEntregaParaLegalizar =
        modalidad === 'ENTREGA_PARA_LEGALIZAR'
      const receptorDinero =
        mayusculas(body?.receptor_dinero)
      const tipoDocumentoReceptor =
        mayusculas(body?.tipo_documento_receptor)
      const documentoReceptor =
        texto(body?.documento_receptor)
      const beneficiario =
        mayusculas(body?.beneficiario)
      const tipoDocumento =
        mayusculas(
          body?.tipo_documento_beneficiario
        )
      const documento =
        texto(
          body?.documento_beneficiario
        )
      const descripcion =
        mayusculas(
          body?.descripcion
        )
      const valor =
        numeroPositivo(
          body?.valor
        )
      // ===================================================
      // OPCIONALES
      // ===================================================
      const numeroFactura =
        texto(
          body?.numero_factura
        )
      const referenciaPago =
        texto(
          body?.referencia_pago
        )
      const observaciones =
        mayusculas(
          body?.observaciones
        )
      // ===================================================
      // USUARIO OPERACIÓN
      // ===================================================
      const pagadoPor =
        mayusculas(
          body?.pagado_por ||
          body?.usuario
        )
      // ===================================================
      // VALIDACIONES
      // ===================================================
      if (
        !conceptoId
      ) {
        return NextResponse.json(
          {
            status:
              'error',
            message:
              'Seleccione un concepto de egreso.',
          },
          {
            status:
              400,
          }
        )
      }
      if (
        !medioPagoId
      ) {
        return NextResponse.json(
          {
            status:
              'error',
            message:
              'Seleccione un medio de pago.',
          },
          {
            status:
              400,
          }
        )
      }
      if (
        !fechaValida(
          fecha
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',
            message:
              'La fecha del egreso no es válida.',
          },
          {
            status:
              400,
          }
        )
      }
      if (!['PAGO_DIRECTO', 'ENTREGA_PARA_LEGALIZAR'].includes(modalidad)) {
        return NextResponse.json(
          { status: 'error', message: 'La modalidad del egreso no es válida.' },
          { status: 400 }
        )
      }
      if (esEntregaParaLegalizar && !receptorDinero) {
        return NextResponse.json(
          { status: 'error', message: 'Indique la persona que recibe el dinero para legalizar.' },
          { status: 400 }
        )
      }
      if (esEntregaParaLegalizar && !documentoReceptor) {
        return NextResponse.json(
          { status: 'error', message: 'El documento de la persona que recibe el dinero es obligatorio.' },
          { status: 400 }
        )
      }
      if (!esEntregaParaLegalizar && !beneficiario) {
        return NextResponse.json(
          { status: 'error', message: 'El beneficiario es obligatorio.' },
          { status: 400 }
        )
      }
      if (!esEntregaParaLegalizar && !documento) {
        return NextResponse.json(
          { status: 'error', message: 'El documento del beneficiario es obligatorio.' },
          { status: 400 }
        )
      }
      if (
        !descripcion
      ) {
        return NextResponse.json(
          {
            status:
              'error',
            message:
              'La descripción del egreso es obligatoria.',
          },
          {
            status:
              400,
          }
        )
      }
      if (
        valor ===
        null
      ) {
        return NextResponse.json(
          {
            status:
              'error',
            message:
              'Ingrese un valor válido mayor a cero.',
          },
          {
            status:
              400,
          }
        )
      }
      if (
        !pagadoPor
      ) {
        return NextResponse.json(
          {
            status:
              'error',
            message:
              'No se pudo identificar el usuario que registra el egreso.',
          },
          {
            status:
              400,
          }
        )
      }
      // ===================================================
      // VALIDAR CONCEPTO Y MEDIO
      // ===================================================
      const [
        concepto,
        medioPago,
      ] =
        await Promise.all([
          obtenerConcepto(
            supabase,
            conceptoId
          ),
          obtenerMedioPago(
            supabase,
            medioPagoId
          ),
        ])
      // ===================================================
      // CONTROL / JUSTIFICACIÓN DE EFECTIVO INSUFICIENTE
      // ===================================================
      //
      // El egreso debe conservarse por su valor real aunque
      // supere el efectivo generado por la operación del CEA.
      // En ese caso no se crea un ingreso artificial: se exige
      // únicamente dejar en Observaciones la justificación del
      // origen de los recursos con que se completó el pago.
      //
      if (
        mayusculas(
          medioPago?.nombre
        ) ===
        'EFECTIVO'
      ) {
        const efectivo =
          await obtenerEfectivoDisponible(
            supabase
          )

        if (
          valor >
          efectivo.disponible
        ) {
          const faltante =
            Math.round(
              (
                valor -
                efectivo.disponible
              ) *
              100
            ) / 100

          if (
            !observaciones
          ) {
            return NextResponse.json(
              {
                status:
                  'error',

                code:
                  'JUSTIFICACION_RECURSOS_REQUERIDA',

                message:
                  `El egreso es por $${valor.toLocaleString('es-CO')} y el efectivo disponible es $${efectivo.disponible.toLocaleString('es-CO')}. Debe justificar en Observaciones de dónde provienen los $${faltante.toLocaleString('es-CO')} adicionales utilizados para completar el egreso.`,

                data: {
                  valor_egreso:
                    valor,

                  efectivo_disponible:
                    efectivo.disponible,

                  recursos_adicionales:
                    faltante,

                  requiere_justificacion:
                    true,
                },
              },
              {
                status:
                  400,
              }
            )
          }
        }
      }

      // ===================================================
      // CLASIFICACIÓN PESV DEL CONCEPTO
      // ===================================================
      if (
        concepto?.es_gasto_pesv === true &&
        !texto(concepto?.categoria_pesv)
      ) {
        return NextResponse.json(
          {
            status: 'error',
            message:
              'El concepto está marcado como gasto PESV pero no tiene una destinación PESV configurada.',
          },
          { status: 400 }
        )
      }
      // ===================================================
      // VEHÍCULO
      // ===================================================
      let vehiculo =
        null
      if (
        concepto
          ?.requiere_vehiculo ===
        true
      ) {
        if (
          !vehiculoId
        ) {
          return NextResponse.json(
            {
              status:
                'error',
              message:
                'Este concepto requiere seleccionar un vehículo.',
            },
            {
              status:
                400,
            }
          )
        }
        vehiculo =
          await obtenerVehiculo(
            supabase,
            vehiculoId
          )
      } else if (
        vehiculoId
      ) {
        vehiculo =
          await obtenerVehiculo(
            supabase,
            vehiculoId
          )
      }
      const placa =
        vehiculo?.placa
          ? mayusculas(
              vehiculo.placa
            )
          : null
      // ===================================================
      // REGISTRAR EGRESO
      // ===================================================
      const {
        data:
          egresoCreado,
        error:
          errorInsert,
      } =
        await supabase
          .from(
            'egresos_caja'
          )
          .insert({
            concepto_id:
              concepto.id,
            // Snapshot histórico PESV tomado del concepto en la BD.
            es_gasto_pesv:
              concepto.es_gasto_pesv === true,
            categoria_pesv:
              concepto.es_gasto_pesv === true
                ? mayusculas(concepto.categoria_pesv)
                : null,
            medio_pago_id:
              medioPago.id,
            vehiculo_id:
              vehiculo?.id ||
              null,
            placa,
            fecha,
            modalidad,
            receptor_dinero: esEntregaParaLegalizar ? receptorDinero : null,
            tipo_documento_receptor: esEntregaParaLegalizar ? (tipoDocumentoReceptor || null) : null,
            documento_receptor: esEntregaParaLegalizar ? documentoReceptor : null,
            estado_legalizacion: esEntregaParaLegalizar ? 'PENDIENTE' : 'NO_APLICA',
            fecha_legalizacion: null,
            valor_legalizado: null,
            valor_reintegrado: 0,
            valor_reembolsado: 0,
            legalizado_por: null,
            observaciones_legalizacion: null,
            // Para entregas pendientes, el beneficiario registrado
            // identifica al receptor inicial de los fondos, no al
            // proveedor definitivo. Conservamos los campos específicos
            // de receptor y la modalidad para distinguir ambos roles.
            beneficiario: esEntregaParaLegalizar ? receptorDinero : beneficiario,
            tipo_documento_beneficiario: esEntregaParaLegalizar
              ? (tipoDocumentoReceptor || null)
              : (tipoDocumento || null),
            documento_beneficiario: esEntregaParaLegalizar
              ? documentoReceptor
              : documento,
            descripcion,
            valor,
            // =============================================
            // OPCIONALES
            // =============================================
            numero_factura:
              numeroFactura ||
              null,
            referencia_pago:
              referenciaPago ||
              null,
            // soporte_url se deja sin utilizar.
            numero_cuenta_cobro:
              null,
            pagado_por:
              pagadoPor,
            observaciones:
              observaciones ||
              null,
            estado:
              'ACTIVO',
          })
          .select(`
            id,
            concepto_id,
            es_gasto_pesv,
            categoria_pesv,
            medio_pago_id,
            vehiculo_id,
            placa,
            fecha,
            modalidad,
            receptor_dinero,
            tipo_documento_receptor,
            documento_receptor,
            estado_legalizacion,
            fecha_legalizacion,
            valor_legalizado,
            valor_reintegrado,
            valor_reembolsado,
            legalizado_por,
            observaciones_legalizacion,
            beneficiario,
            tipo_documento_beneficiario,
            documento_beneficiario,
            descripcion,
            valor,
            numero_factura,
            numero_cuenta_cobro,
            referencia_pago,
            pagado_por,
            observaciones,
            estado,
            created_at,
            updated_at
          `)
          .single()
      if (
        errorInsert
      ) {
        return NextResponse.json(
          {
            status:
              'error',
            message:
              `No fue posible registrar el egreso: ${errorInsert.message}`,
          },
          {
            status:
              400,
          }
        )
      }
      // ===================================================
      // GENERAR CONSECUTIVO
      // ===================================================
      const consecutivo =
        esEntregaParaLegalizar
          ? null
          : generarConsecutivoCuentaCobro(
              egresoCreado.id,
              fecha
            )
      const {
        data:
          egresoActualizado,
        error:
          errorConsecutivo,
      } =
        await supabase
          .from(
            'egresos_caja'
          )
          .update({
            numero_cuenta_cobro:
              consecutivo,
            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            egresoCreado.id
          )
          .select(`
            id,
            concepto_id,
            es_gasto_pesv,
            categoria_pesv,
            medio_pago_id,
            vehiculo_id,
            placa,
            fecha,
            modalidad,
            receptor_dinero,
            tipo_documento_receptor,
            documento_receptor,
            estado_legalizacion,
            fecha_legalizacion,
            valor_legalizado,
            valor_reintegrado,
            valor_reembolsado,
            legalizado_por,
            observaciones_legalizacion,
            beneficiario,
            tipo_documento_beneficiario,
            documento_beneficiario,
            descripcion,
            valor,
            numero_factura,
            numero_cuenta_cobro,
            referencia_pago,
            pagado_por,
            observaciones,
            estado,
            created_at,
            updated_at
          `)
          .single()
      if (
        errorConsecutivo
      ) {
        await supabase
          .from(
            'egresos_caja'
          )
          .delete()
          .eq(
            'id',
            egresoCreado.id
          )
        return NextResponse.json(
          {
            status:
              'error',
            message:
              `No fue posible finalizar el registro del egreso: ${errorConsecutivo.message}`,
          },
          {
            status:
              500,
          }
        )
      }
      // ===================================================
      // AUDITORÍA
      // ===================================================
      try {
        await registrarAuditoria(
          supabase,
          {
            usuario:
              pagadoPor,
            accion:
              'CREAR_EGRESO',
            entidadId:
              egresoActualizado.id,
            consecutivoReferencia:
              consecutivo,
            descripcion:
              esEntregaParaLegalizar
                ? `REGISTRO DE ENTREGA PARA LEGALIZAR A ${receptorDinero}.`
                : `REGISTRO DE EGRESO ${consecutivo} A FAVOR DE ${beneficiario}.`,
            datosNuevos: {
              ...egresoActualizado,
              concepto: {
                id:
                  concepto.id,
                nombre:
                  concepto.nombre,
              },
              medio_pago: {
                id:
                  medioPago.id,
                nombre:
                  medioPago.nombre,
              },
              vehiculo:
                vehiculo
                  ? {
                      id:
                        vehiculo.id,
                      placa:
                        vehiculo.placa,
                      tipo_vehiculo:
                        vehiculo.tipo_vehiculo,
                      marca:
                        vehiculo.marca,
                      linea:
                        vehiculo.linea,
                      modelo:
                        vehiculo.modelo,
                    }
                  : null,
            },
            observaciones,
          }
        )
      } catch (
        errorAuditoria
      ) {
        console.error(
          'Error auditoría creación egreso:',
          errorAuditoria
        )
        // El registro recién creado se revierte porque
        // todavía no ha sido entregado como operación exitosa.
        await supabase
          .from(
            'egresos_caja'
          )
          .delete()
          .eq(
            'id',
            egresoActualizado.id
          )
        return NextResponse.json(
          {
            status:
              'error',
            message:
              'El egreso no fue registrado porque no fue posible guardar su trazabilidad.',
          },
          {
            status:
              500,
          }
        )
      }
      // ===================================================
      // RESPUESTA COMPLETA
      // ===================================================
      return NextResponse.json(
        {
          status:
            'success',
          message:
            `Egreso ${consecutivo} registrado correctamente.`,
          data: {
            ...egresoActualizado,
            concepto,
            medio_pago:
              medioPago,
            vehiculo,
          },
          empresa:
            construirEmpresaRespuesta(
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
    // EDITAR EGRESO OPERATIVO (MISMA FECHA Y CONSECUTIVO)
    // =====================================================
    if (accion === 'editar') {
      const id = enteroPositivo(body?.id)
      const usuario = mayusculas(body?.usuario)
      if(!id || !usuario) return NextResponse.json({
        status:'error',message:'No se identificó el egreso o el usuario.'},{status:400})
      const anterior=await obtenerEgresoPorId(supabase,id)
      if(!anterior) return NextResponse.json({status:'error',message:'Egreso no encontrado.'},{status:404})
      if(mayusculas(anterior.estado)!=='ACTIVO')
        return NextResponse.json({status:'error',message:'Solo se pueden corregir egresos activos.'},{status:409})
      // La fecha no cambia, incluso si el soporte se revisa días después.
      if(body.fecha && texto(body.fecha)!==texto(anterior.fecha))
        return NextResponse.json({status:'error',message:'La fecha del egreso no es editable.'},{status:400})
      const valor=Number(body.valor)
      if(!Number.isFinite(valor)||valor<0||Math.round(valor*100)!==valor*100)
        return NextResponse.json({status:'error',message:'Ingrese un valor mayor o igual a cero, con máximo dos decimales.'},{status:400})
      const conceptoId=enteroPositivo(body.concepto_id)
      const medioId=enteroPositivo(body.medio_pago_id)
      const beneficiario=mayusculas(body.beneficiario)
      const documento=texto(body.documento_beneficiario)
      const descripcion=mayusculas(body.descripcion)
      if(!conceptoId||!medioId||!beneficiario||!documento||!descripcion)
        return NextResponse.json({status:'error',message:'Complete concepto, medio de pago, beneficiario, documento y descripción.'},{status:400})
      // Comprobar catálogos actuales, conservando claves foráneas existentes.
      await Promise.all([obtenerConcepto(supabase,conceptoId),obtenerMedioPago(supabase,medioId)])
      const vehiculoId=enteroPositivo(body.vehiculo_id)
      let placa=null
      if(vehiculoId){
        const {data:vehiculo,error:errorVehiculo}=await supabase.from('vehiculos')
          .select('id,placa').eq('id',vehiculoId).maybeSingle()
        if(errorVehiculo)throw errorVehiculo
        if(!vehiculo)return NextResponse.json({status:'error',message:'Seleccione un vehículo válido.'},{status:400})
        placa=vehiculo.placa
      }
      // La entrega deja de tener compensaciones separadas: valor es el gasto
      // neto definitivo. El consecutivo, ID y fecha permanecen intactos.
      const cambios={
        concepto_id:conceptoId,medio_pago_id:medioId,
        vehiculo_id:vehiculoId||null,placa,
        beneficiario,tipo_documento_beneficiario:mayusculas(body.tipo_documento_beneficiario)||null,
        documento_beneficiario:documento,descripcion,
        valor:Math.round(valor*100)/100,
        numero_factura:texto(body.numero_factura)||null,
        referencia_pago:texto(body.referencia_pago)||null,
        observaciones:mayusculas(body.observaciones)||null,
        modalidad:'PAGO_DIRECTO',
        valor_reintegrado:0,valor_reembolsado:0,valor_legalizado:0,
        estado_legalizacion:null,fecha_legalizacion:null,
        observaciones_legalizacion:null,
        receptor_dinero:null,tipo_documento_receptor:null,documento_receptor:null,
        updated_at:new Date().toISOString()
      }
      const {data,error}=await supabase.from('egresos_caja')
        .update(cambios).eq('id',id).eq('estado','ACTIVO')
        .eq('updated_at',anterior.updated_at)
        .select('*').maybeSingle()
      if(error)return NextResponse.json({status:'error',message:'No fue posible corregir el egreso: '+error.message},{status:400})
      if(!data)return NextResponse.json({status:'error',message:'El egreso fue modificado por otro usuario. Actualice antes de guardar.'},{status:409})
      return NextResponse.json({status:'success',data,
        message:valor===0?'Egreso conservado con valor $0. No afecta los totales.':'Egreso corregido en el mismo registro.'})
    }
    // =====================================================
    // LEGALIZAR / AJUSTAR ANTICIPO
    // =====================================================
    if (accion === 'legalizar') {
      const id = enteroPositivo(body?.id)
      const usuario = mayusculas(body?.usuario || body?.pagado_por)
      const gasto = Number(body?.valor_legalizado)
      const reintegro = Number(body?.valor_reintegrado ?? 0)
      const reembolso = Number(body?.valor_reembolsado ?? 0)
      const factura = texto(body?.numero_factura)
      const proveedor = mayusculas(body?.proveedor_final)
      const observaciones = mayusculas(body?.observaciones_legalizacion)
      const soporteRecibido = body?.soporte_recibido === true
      const hoy = hoyColombia()
      const error = (message, status = 400) =>
        NextResponse.json({ status: 'error', message }, { status })

      if (!id || !usuario) return error('Indique el egreso y el usuario responsable.')
      const anterior = await obtenerEgresoPorId(supabase, id)
      if (!anterior || anterior.estado !== 'ACTIVO' ||
          anterior.modalidad !== 'ENTREGA_PARA_LEGALIZAR') {
        return error('El egreso no existe o no corresponde a una entrega activa para legalizar.', 409)
      }
      const montoValido = n => Number.isFinite(n) && n >= 0 &&
        Math.round(n * 100) / 100 === n
      if (![gasto, reintegro, reembolso].every(montoValido)) {
        return error('Los valores de la legalización deben ser numéricos, no negativos y con máximo dos decimales.')
      }
      const centavos = n => Math.round(Number(n || 0) * 100)
      const saldo = centavos(anterior.valor) + centavos(reembolso) -
        centavos(reintegro) - centavos(gasto)
      if (saldo < 0) return error('El gasto más el reintegro no puede superar el dinero entregado y reembolsado.')
      if (soporteRecibido && !factura) {
        return error('Para confirmar el soporte indique el número de factura o comprobante.')
      }
      if (soporteRecibido && !proveedor) {
        return error('Indique el proveedor final que emitió el soporte.')
      }
      if (!observaciones) return error('Describa la rendición o justificación del dinero.')

      const dineroAnterior = centavos(anterior.valor_reintegrado) !== centavos(reintegro) ||
        centavos(anterior.valor_reembolsado) !== centavos(reembolso) ||
        centavos(anterior.valor_legalizado) !== centavos(gasto)
      const ajusteEfectivo = centavos(anterior.valor_reintegrado) !== centavos(reintegro) ||
        centavos(anterior.valor_reembolsado) !== centavos(reembolso)

      // No recalcular movimientos de periodos arqueados/cerrados.
      // Tampoco permitir modificar importes en una fecha posterior.
      if (dineroAnterior) {
        if (texto(anterior.fecha) !== hoy) {
          return error('Los importes solo se pueden conciliar el mismo día del egreso. La factura puede completarse después.', 409)
        }
        const { data: cierre, error: errorCierre } = await supabase
          .from('cierres_caja').select('id, tipo_cierre, periodo_hasta')
          .gte('periodo_hasta', anterior.created_at)
          .order('periodo_hasta', { ascending: true })
          .limit(1).maybeSingle()
        if (errorCierre) return error('No fue posible verificar los arqueos de Caja.', 500)
        if (cierre) {
          return error('Ya existe un arqueo o cierre que incluye la entrega. No se permite modificar sus valores.', 409)
        }
        if (ajusteEfectivo &&
            mayusculas(anterior.medio_pago?.nombre) !== 'EFECTIVO') {
          return error('Los reintegros y reembolsos en este formulario solo están habilitados para entregas en efectivo.')
        }
      }
      // El proveedor se registra en las observaciones de legalización;
      // beneficiario conserva siempre la identidad del receptor del anticipo.
      const notaProveedor = proveedor ? `PROVEEDOR FINAL: ${proveedor}. ` : ''
      const detalleLegalizacion = notaProveedor + observaciones
      const estadoLegalizacion = saldo === 0 && soporteRecibido
        ? 'LEGALIZADO' : gasto > 0 || reintegro > 0 || reembolso > 0
          ? 'PARCIAL' : 'PENDIENTE'

      const cambios = {
        valor_legalizado: gasto,
        valor_reintegrado: reintegro,
        valor_reembolsado: reembolso,
        estado_legalizacion: estadoLegalizacion,
        fecha_legalizacion: estadoLegalizacion === 'LEGALIZADO' ? hoy : null,
        legalizado_por: usuario,
        observaciones_legalizacion: detalleLegalizacion,
        numero_factura: factura || null,
        updated_at: new Date().toISOString(),
      }
      const { data: actualizado, error: errorUpdate } = await supabase
        .from('egresos_caja').update(cambios)
        .eq('id', id).eq('estado', 'ACTIVO')
        .eq('updated_at', anterior.updated_at)
        .select('id, valor, valor_legalizado, valor_reintegrado, valor_reembolsado, estado_legalizacion, numero_factura, updated_at')
        .maybeSingle()
      if (errorUpdate) return error(`No fue posible legalizar el egreso: ${errorUpdate.message}`, 400)
      if (!actualizado) return error('El egreso fue modificado por otro usuario. Consulte nuevamente antes de guardar.', 409)
      try {
        await registrarAuditoria(supabase, {
          usuario, accion: 'LEGALIZAR_EGRESO', entidadId: id,
          consecutivoReferencia: anterior.numero_cuenta_cobro,
          descripcion: `LEGALIZACIÓN DEL EGRESO #${id}. ESTADO ${estadoLegalizacion}.`,
          datosAnteriores: anterior,
          datosNuevos: { ...actualizado, proveedor_final: proveedor, soporte_recibido: soporteRecibido },
          observaciones: detalleLegalizacion,
        })
      } catch (errorAuditoria) {
        // No dejar una modificación financiera sin auditoría.
        const restauracion = {
          valor_legalizado: anterior.valor_legalizado,
          valor_reintegrado: anterior.valor_reintegrado,
          valor_reembolsado: anterior.valor_reembolsado,
          estado_legalizacion: anterior.estado_legalizacion,
          fecha_legalizacion: anterior.fecha_legalizacion,
          legalizado_por: anterior.legalizado_por,
          observaciones_legalizacion: anterior.observaciones_legalizacion,
          numero_factura: anterior.numero_factura,
          updated_at: anterior.updated_at,
        }
        const { error: errorRestauracion } = await supabase
          .from('egresos_caja').update(restauracion)
          .eq('id', id).eq('updated_at', actualizado.updated_at)
        if (errorRestauracion) console.error('Error restaurando legalización sin auditoría:', errorRestauracion)
        return error('No fue posible registrar la auditoría de la legalización. Compruebe el historial antes de reintentar.', 500)
      }
      return NextResponse.json({
        status: 'success',
        message: estadoLegalizacion === 'LEGALIZADO'
          ? 'Egreso legalizado y conciliado correctamente.'
          : 'Rendición registrada. El egreso continúa pendiente de legalización completa.',
        data: { ...actualizado, saldo_pendiente: saldo / 100 },
      })
    }

    // =====================================================
    // ANULAR
    // =====================================================
    if (
      accion ===
      'anular'
    ) {
      const id =
        enteroPositivo(
          body?.id
        )
      const motivo =
        mayusculas(
          body?.motivo_anulacion ||
          body?.motivo
        )
      const usuario =
        mayusculas(
          body?.usuario_anulacion ||
          body?.usuario
        )
      if (
        !id
      ) {
        return NextResponse.json(
          {
            status:
              'error',
            message:
              'El identificador del egreso es obligatorio.',
          },
          {
            status:
              400,
          }
        )
      }
      if (
        !motivo
      ) {
        return NextResponse.json(
          {
            status:
              'error',
            message:
              'Debe indicar el motivo de la anulación.',
          },
          {
            status:
              400,
          }
        )
      }
      if (
        !usuario
      ) {
        return NextResponse.json(
          {
            status:
              'error',
            message:
              'No se pudo identificar el usuario que realiza la anulación.',
          },
          {
            status:
              400,
          }
        )
      }
      // ===================================================
      // CONSULTAR REGISTRO ORIGINAL
      // ===================================================
      const egresoAnterior =
        await obtenerEgresoPorId(
          supabase,
          id
        )
      if (
        !egresoAnterior
      ) {
        return NextResponse.json(
          {
            status:
              'error',
            message:
              'El egreso no existe.',
          },
          {
            status:
              404,
          }
        )
      }
      if (
        mayusculas(
          egresoAnterior.estado
        ) ===
        'ANULADO'
      ) {
        return NextResponse.json(
          {
            status:
              'error',
            message:
              'Este egreso ya se encuentra anulado.',
          },
          {
            status:
              409,
          }
        )
      }
      const fechaAnulacion =
        new Date()
          .toISOString()
      // ===================================================
      // ANULAR
      // ===================================================
      const {
        data:
          egresoAnulado,
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
              fechaAnulacion,
            updated_at:
              fechaAnulacion,
          })
          .eq(
            'id',
            id
          )
          .eq(
            'estado',
            'ACTIVO'
          )
          .select(`
            id,
            concepto_id,
            es_gasto_pesv,
            categoria_pesv,
            medio_pago_id,
            vehiculo_id,
            placa,
            fecha,
            modalidad,
            receptor_dinero,
            tipo_documento_receptor,
            documento_receptor,
            estado_legalizacion,
            fecha_legalizacion,
            valor_legalizado,
            valor_reintegrado,
            valor_reembolsado,
            legalizado_por,
            observaciones_legalizacion,
            beneficiario,
            tipo_documento_beneficiario,
            documento_beneficiario,
            descripcion,
            valor,
            numero_factura,
            numero_cuenta_cobro,
            referencia_pago,
            pagado_por,
            observaciones,
            estado,
            motivo_anulacion,
            usuario_anulacion,
            fecha_anulacion,
            created_at,
            updated_at
          `)
          .maybeSingle()
      if (
        errorAnulacion
      ) {
        return NextResponse.json(
          {
            status:
              'error',
            message:
              `No fue posible anular el egreso: ${errorAnulacion.message}`,
          },
          {
            status:
              400,
          }
        )
      }
      if (
        !egresoAnulado
      ) {
        return NextResponse.json(
          {
            status:
              'error',
            message:
              'El egreso no pudo ser anulado porque su estado cambió.',
          },
          {
            status:
              409,
          }
        )
      }
      // ===================================================
      // AUDITORÍA
      // ===================================================
      try {
        await registrarAuditoria(
          supabase,
          {
            usuario,
            accion:
              'ANULAR_EGRESO',
            entidadId:
              id,
            consecutivoReferencia:
              egresoAnterior
                .numero_cuenta_cobro,
            descripcion:
              `ANULACIÓN DEL EGRESO ${
                egresoAnterior
                  .numero_cuenta_cobro ||
                `#${id}`
              }.`,
            datosAnteriores:
              egresoAnterior,
            datosNuevos:
              egresoAnulado,
            motivo,
          }
        )
      } catch (
        errorAuditoria
      ) {
        console.error(
          'Error auditoría anulación egreso:',
          errorAuditoria
        )
        // =================================================
        // RESTAURAR ESTADO
        // =================================================
        await supabase
          .from(
            'egresos_caja'
          )
          .update({
            estado:
              egresoAnterior.estado,
            motivo_anulacion:
              egresoAnterior
                .motivo_anulacion,
            usuario_anulacion:
              egresoAnterior
                .usuario_anulacion,
            fecha_anulacion:
              egresoAnterior
                .fecha_anulacion,
            updated_at:
              egresoAnterior
                .updated_at ||
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            id
          )
        return NextResponse.json(
          {
            status:
              'error',
            message:
              'La anulación no fue aplicada porque no fue posible guardar su trazabilidad.',
          },
          {
            status:
              500,
          }
        )
      }
      return NextResponse.json({
        status:
          'success',
        message:
          `Egreso ${
            egresoAnulado
              .numero_cuenta_cobro ||
            `#${id}`
          } anulado correctamente.`,
        data:
          egresoAnulado,
        empresa:
          construirEmpresaRespuesta(
            empresa
          ),
      })
    }
    // =====================================================
    // ACCIÓN NO VÁLIDA
    // =====================================================
    return NextResponse.json(
      {
        status:
          'error',
        message:
          'La acción solicitada no es válida.',
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
      'Error POST /api/admin/caja/egresos:',
      error
    )
    return respuestaError(
      error
    )
  }
}
