// app/api/admin/caja/cierre/route.js

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

const LIMITE_HISTORIAL =
  200

const ROL_RECIBE_CAJA =
  'AUXILIAR_ADMINISTRATIVO'

const TIPOS_CIERRE_VALIDOS =
  new Set([
    'TURNO',
    'DIARIO',
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

function numeroNoNegativo(
  valor
) {
  if (
    valor === '' ||
    valor === null ||
    valor === undefined
  ) {
    return 0
  }

  const numero =
    Number(
      valor
    )

  if (
    !Number.isFinite(
      numero
    ) ||
    numero < 0
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
    Number(
      valor ||
      0
    ) *
      100
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

function timestampValido(
  valor
) {
  if (
    !texto(
      valor
    )
  ) {
    return false
  }

  const fecha =
    new Date(
      valor
    )

  return !Number.isNaN(
    fecha.getTime()
  )
}

function nombreCompletoPersonal(
  personal
) {
  return [
    texto(
      personal?.nombres
    ),

    texto(
      personal?.apellidos
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
// INICIO / FIN DÍA COLOMBIA
// =========================================================

function inicioDiaColombia(
  fecha
) {
  return `${fecha}T00:00:00-05:00`
}

function finDiaColombia(
  fecha
) {
  return `${fecha}T23:59:59.999-05:00`
}

// =========================================================
// EMPRESA RESPUESTA
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
// GENERAR CONSECUTIVO
// =========================================================

function generarConsecutivo(
  id,
  tipoCierre,
  fecha
) {
  const prefijo =
    tipoCierre ===
    'TURNO'
      ? 'AT'
      : 'CD'

  const anio =
    texto(
      fecha
    ).slice(
      0,
      4
    )

  return `${prefijo}-${anio}-${String(
    id
  ).padStart(
    6,
    '0'
  )}`
}

// =========================================================
// NORMALIZAR MEDIO DE PAGO
// =========================================================

function nombreMedioPago(
  registro
) {
  return (
    texto(
      registro
        ?.medio_pago
        ?.nombre
    ) ||
    'SIN ESPECIFICAR'
  )
}

// =========================================================
// PERSONAL AUTORIZADO PARA RECIBIR CAJA
// =========================================================
//
// Se toma de perfiles_usuario porque los permisos de la
// aplicación están definidos por rol.
//
// Únicamente se permiten perfiles:
// rol    = AUXILIAR_ADMINISTRATIVO
// estado = activo
//
// Luego se relaciona con personal por personal_id.
//
// =========================================================

async function consultarPersonalRecibeCaja(
  supabase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'perfiles_usuario'
      )
      .select(`
        id,
        personal_id,
        cuenta_usuario_id,
        rol,
        estado,
        fecha_asignacion,

        personal:personal (
          id,
          tipo_documento,
          documento,
          nombres,
          apellidos,
          cargo,
          tipo_personal,
          estado,
          telefono,
          email
        )
      `)
      .eq(
        'rol',
        ROL_RECIBE_CAJA
      )
      .eq(
        'estado',
        'activo'
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
      `No fue posible consultar el personal autorizado para recibir caja: ${error.message}`
    )
  }

  const registros =
    Array.isArray(
      data
    )
      ? data
      : []

  const resultado = []

  const vistos =
    new Set()

  for (
    const perfil of
      registros
  ) {
    const personal =
      perfil?.personal

    if (
      !personal
    ) {
      continue
    }

    // =====================================================
    // PERSONAL ACTIVO
    // =====================================================

    const estadoPersonal =
      mayusculas(
        personal?.estado
      )

    if (
      estadoPersonal &&
      estadoPersonal !==
        'ACTIVO'
    ) {
      continue
    }

    const personalId =
      personal?.id

    if (
      !personalId ||
      vistos.has(
        personalId
      )
    ) {
      continue
    }

    vistos.add(
      personalId
    )

    resultado.push({
      id:
        personalId,

      perfil_id:
        perfil?.id,

      cuenta_usuario_id:
        perfil?.cuenta_usuario_id,

      personal_id:
        perfil?.personal_id,

      rol:
        perfil?.rol,

      estado_perfil:
        perfil?.estado,

      tipo_documento:
        personal?.tipo_documento ||
        '',

      documento:
        personal?.documento ||
        '',

      nombres:
        personal?.nombres ||
        '',

      apellidos:
        personal?.apellidos ||
        '',

      nombre_completo:
        nombreCompletoPersonal(
          personal
        ),

      cargo:
        personal?.cargo ||
        '',

      tipo_personal:
        personal?.tipo_personal ||
        '',

      estado:
        personal?.estado ||
        '',

      telefono:
        personal?.telefono ||
        '',

      email:
        personal?.email ||
        '',
    })
  }

  resultado.sort(
    (
      a,
      b
    ) =>
      a.nombre_completo.localeCompare(
        b.nombre_completo,
        'es',
        {
          sensitivity:
            'base',
        }
      )
  )

  return resultado
}

// =========================================================
// CONSULTAR INGRESOS DEL PERÍODO
// =========================================================

async function consultarIngresos(
  supabase,
  periodoDesde,
  periodoHasta
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
        nombre_cliente,
        tipo_documento_cliente,
        documento_cliente,
        celular_cliente,
        correo_cliente,
        tipo_origen,
        created_at,

        concepto:conceptos_caja (
          id,
          nombre,
          naturaleza
        ),

        medio_pago:medios_pago_caja (
          id,
          nombre
        )
      `)
      .gte(
        'created_at',
        periodoDesde
      )
      .lte(
        'created_at',
        periodoHasta
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
      `No fue posible consultar los ingresos: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// CONSULTAR EGRESOS DEL PERÍODO
// =========================================================

async function consultarEgresos(
  supabase,
  periodoDesde,
  periodoHasta
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
        medio_pago_id,
        vehiculo_id,
        placa,
        fecha,
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

        concepto:conceptos_caja (
          id,
          nombre,
          naturaleza
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
      .gte(
        'created_at',
        periodoDesde
      )
      .lte(
        'created_at',
        periodoHasta
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
// CALCULAR MOVIMIENTOS
// =========================================================

function calcularMovimientos({
  ingresos,
  egresos,
  saldoInicialEfectivo = 0,
  efectivoContado = null,
}) {
  let ingresosEfectivo =
    0

  let ingresosOtrosMedios =
    0

  let totalIngresosSistema =
    0

  let egresosEfectivo =
    0

  let egresosOtrosMedios =
    0

  let totalEgresosSistema =
    0

  let cantidadRecibos =
    0

  let cantidadEgresos =
    0

  let cantidadRecibosAnulados =
    0

  let cantidadEgresosAnulados =
    0

  const resumenMedios =
    {}

  // =======================================================
  // INGRESOS
  // =======================================================

  for (
    const ingreso of
      ingresos
  ) {
    const estado =
      mayusculas(
        ingreso?.estado
      )

    const medio =
      nombreMedioPago(
        ingreso
      )

    const valor =
      redondear(
        ingreso?.valor
      )

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

        neto:
          0,

        cantidad_ingresos:
          0,

        cantidad_egresos:
          0,
      }
    }

    if (
      estado ===
      'ANULADO'
    ) {
      cantidadRecibosAnulados +=
        1

      continue
    }

    cantidadRecibos +=
      1

    totalIngresosSistema +=
      valor

    resumenMedios[
      medio
    ].ingresos +=
      valor

    resumenMedios[
      medio
    ].cantidad_ingresos +=
      1

    if (
      mayusculas(
        medio
      ) ===
      'EFECTIVO'
    ) {
      ingresosEfectivo +=
        valor
    } else {
      ingresosOtrosMedios +=
        valor
    }
  }

  // =======================================================
  // EGRESOS
  // =======================================================

  for (
    const egreso of
      egresos
  ) {
    const estado =
      mayusculas(
        egreso?.estado
      )

    const medio =
      nombreMedioPago(
        egreso
      )

    const valor =
      redondear(
        egreso?.valor
      )

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

        neto:
          0,

        cantidad_ingresos:
          0,

        cantidad_egresos:
          0,
      }
    }

    if (
      estado ===
      'ANULADO'
    ) {
      cantidadEgresosAnulados +=
        1

      continue
    }

    cantidadEgresos +=
      1

    totalEgresosSistema +=
      valor

    resumenMedios[
      medio
    ].egresos +=
      valor

    resumenMedios[
      medio
    ].cantidad_egresos +=
      1

    if (
      mayusculas(
        medio
      ) ===
      'EFECTIVO'
    ) {
      egresosEfectivo +=
        valor
    } else {
      egresosOtrosMedios +=
        valor
    }
  }

  // =======================================================
  // NETO POR MEDIO
  // =======================================================

  for (
    const medio of
      Object.keys(
        resumenMedios
      )
  ) {
    resumenMedios[
      medio
    ].ingresos =
      redondear(
        resumenMedios[
          medio
        ].ingresos
      )

    resumenMedios[
      medio
    ].egresos =
      redondear(
        resumenMedios[
          medio
        ].egresos
      )

    resumenMedios[
      medio
    ].neto =
      redondear(
        resumenMedios[
          medio
        ].ingresos -
        resumenMedios[
          medio
        ].egresos
      )
  }

  const saldoInicial =
    redondear(
      saldoInicialEfectivo
    )

  const efectivoEsperado =
    redondear(
      saldoInicial +
      ingresosEfectivo -
      egresosEfectivo
    )

  const movimientoNeto =
    redondear(
      totalIngresosSistema -
      totalEgresosSistema
    )

  const efectivoContadoNumero =
    efectivoContado ===
      null
      ? null
      : redondear(
          efectivoContado
        )

  const diferenciaEfectivo =
    efectivoContadoNumero ===
      null
      ? null
      : redondear(
          efectivoContadoNumero -
          efectivoEsperado
        )

  return {
    saldo_inicial_efectivo:
      saldoInicial,

    ingresos_efectivo:
      redondear(
        ingresosEfectivo
      ),

    ingresos_otros_medios:
      redondear(
        ingresosOtrosMedios
      ),

    total_ingresos_sistema:
      redondear(
        totalIngresosSistema
      ),

    egresos_efectivo:
      redondear(
        egresosEfectivo
      ),

    egresos_otros_medios:
      redondear(
        egresosOtrosMedios
      ),

    total_egresos_sistema:
      redondear(
        totalEgresosSistema
      ),

    efectivo_esperado:
      efectivoEsperado,

    efectivo_contado:
      efectivoContadoNumero,

    diferencia_efectivo:
      diferenciaEfectivo,

    movimiento_neto:
      movimientoNeto,

    resumen_medios_pago:
      resumenMedios,

    cantidad_recibos:
      cantidadRecibos,

    cantidad_egresos:
      cantidadEgresos,

    cantidad_recibos_anulados:
      cantidadRecibosAnulados,

    cantidad_egresos_anulados:
      cantidadEgresosAnulados,
  }
}

// =========================================================
// OBTENER ÚLTIMO CIERRE
// =========================================================

async function obtenerUltimoCierre(
  supabase,
  fecha
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'cierres_caja'
      )
      .select(`
        id,
        consecutivo,
        fecha,
        tipo_cierre,
        periodo_desde,
        periodo_hasta,
        saldo_inicial_efectivo,
        efectivo_esperado,
        efectivo_contado,
        diferencia_efectivo,
        usuario_cierre,
        usuario_entrega,
        usuario_recibe,
        estado,
        created_at
      `)
      .eq(
        'fecha',
        fecha
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
    error
  ) {
    throw new Error(
      `No fue posible consultar el último cierre: ${error.message}`
    )
  }

  return data
}

// =========================================================
// VERIFICAR CIERRE DIARIO
// =========================================================

async function existeCierreDiario(
  supabase,
  fecha
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'cierres_caja'
      )
      .select(`
        id,
        consecutivo,
        fecha,
        tipo_cierre,
        periodo_desde,
        periodo_hasta,
        efectivo_esperado,
        efectivo_contado,
        diferencia_efectivo,
        usuario_cierre,
        estado
      `)
      .eq(
        'fecha',
        fecha
      )
      .eq(
        'tipo_cierre',
        'DIARIO'
      )
      .limit(
        1
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible validar el cierre diario: ${error.message}`
    )
  }

  return data
}

// =========================================================
// PERÍODO SUGERIDO
// =========================================================

async function obtenerPeriodoSugerido(
  supabase,
  tipoCierre,
  fecha
) {
  const ahora =
    new Date()
      .toISOString()

  if (
    tipoCierre ===
    'DIARIO'
  ) {
    return {
      periodo_desde:
        inicioDiaColombia(
          fecha
        ),

      periodo_hasta:
        fecha ===
        hoyColombia()
          ? ahora
          : finDiaColombia(
              fecha
            ),
    }
  }

  const ultimo =
    await obtenerUltimoCierre(
      supabase,
      fecha
    )

  return {
    periodo_desde:
      ultimo
        ?.periodo_hasta ||
      inicioDiaColombia(
        fecha
      ),

    periodo_hasta:
      ahora,
  }
}

// =========================================================
// OBTENER CIERRE POR ID
// =========================================================

async function obtenerCierrePorId(
  supabase,
  id
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'cierres_caja'
      )
      .select(`
        id,
        consecutivo,
        fecha,
        tipo_cierre,
        periodo_desde,
        periodo_hasta,
        saldo_inicial_efectivo,
        ingresos_efectivo,
        ingresos_otros_medios,
        total_ingresos_sistema,
        egresos_efectivo,
        egresos_otros_medios,
        total_egresos_sistema,
        efectivo_esperado,
        efectivo_contado,
        diferencia_efectivo,
        movimiento_neto,
        resumen_medios_pago,
        cantidad_recibos,
        cantidad_egresos,
        cantidad_recibos_anulados,
        cantidad_egresos_anulados,
        usuario_cierre,
        usuario_entrega,
        usuario_recibe,
        estado,
        revisado_por,
        fecha_revision,
        observaciones,
        observaciones_revision,
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
      `No fue posible consultar el cierre: ${error.message}`
    )
  }

  return data
}

// =========================================================
// HISTORIAL
// =========================================================

async function listarCierres(
  supabase,
  {
    fechaInicio,
    fechaFin,
    tipoCierre,
  }
) {
  let consulta =
    supabase
      .from(
        'cierres_caja'
      )
      .select(`
        id,
        consecutivo,
        fecha,
        tipo_cierre,
        periodo_desde,
        periodo_hasta,
        total_ingresos_sistema,
        total_egresos_sistema,
        efectivo_esperado,
        efectivo_contado,
        diferencia_efectivo,
        movimiento_neto,
        cantidad_recibos,
        cantidad_egresos,
        usuario_cierre,
        usuario_entrega,
        usuario_recibe,
        estado,
        created_at
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
    tipoCierre
  ) {
    consulta =
      consulta.eq(
        'tipo_cierre',
        tipoCierre
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
        LIMITE_HISTORIAL
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar el historial de cierres: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
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
    // PERSONAL AUTORIZADO
    // =====================================================

    if (
      recurso ===
      'personal'
    ) {
      const personal =
        await consultarPersonalRecibeCaja(
          supabase
        )

      return NextResponse.json({
        status:
          'success',

        data:
          personal,

        total:
          personal.length,

        rol:
          ROL_RECIBE_CAJA,

        empresa:
          construirEmpresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // ARQUEO / PREVISUALIZACIÓN
    // =====================================================

    if (
      recurso ===
      'arqueo'
    ) {
      const fecha =
        texto(
          searchParams.get(
            'fecha'
          )
        ) ||
        hoyColombia()

      const tipoCierre =
        mayusculas(
          searchParams.get(
            'tipo_cierre'
          ) ||
          'TURNO'
        )

      const saldoInicial =
        numeroNoNegativo(
          searchParams.get(
            'saldo_inicial_efectivo'
          )
        )

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
              'La fecha no es válida.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        !TIPOS_CIERRE_VALIDOS.has(
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

      if (
        saldoInicial ===
        null
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El saldo inicial en efectivo no es válido.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        tipoCierre ===
        'DIARIO'
      ) {
        const cierreExistente =
          await existeCierreDiario(
            supabase,
            fecha
          )

        if (
          cierreExistente
        ) {
          return NextResponse.json(
            {
              status:
                'error',

              message:
                `La caja del ${fecha} ya tiene cierre diario ${
                  cierreExistente
                    .consecutivo ||
                  ''
                }.`.trim(),

              data: {
                cierre_existente:
                  cierreExistente,
              },
            },
            {
              status:
                409,
            }
          )
        }
      }

      const periodo =
        await obtenerPeriodoSugerido(
          supabase,
          tipoCierre,
          fecha
        )

      const [
        ingresos,
        egresos,
        ultimoCierre,
      ] =
        await Promise.all([
          consultarIngresos(
            supabase,
            periodo.periodo_desde,
            periodo.periodo_hasta
          ),

          consultarEgresos(
            supabase,
            periodo.periodo_desde,
            periodo.periodo_hasta
          ),

          obtenerUltimoCierre(
            supabase,
            fecha
          ),
        ])

      let saldoInicialUsado =
        saldoInicial

      if (
        tipoCierre ===
          'TURNO' &&
        !searchParams.has(
          'saldo_inicial_efectivo'
        ) &&
        ultimoCierre
      ) {
        saldoInicialUsado =
          redondear(
            ultimoCierre
              .efectivo_contado
          )
      }

      const calculo =
        calcularMovimientos({
          ingresos,
          egresos,

          saldoInicialEfectivo:
            saldoInicialUsado,

          efectivoContado:
            null,
        })

      return NextResponse.json({
        status:
          'success',

        data: {
          fecha,

          tipo_cierre:
            tipoCierre,

          periodo_desde:
            periodo.periodo_desde,

          periodo_hasta:
            periodo.periodo_hasta,

          ...calculo,

          ingresos,

          egresos,

          ultimo_cierre:
            ultimoCierre,
        },

        empresa:
          construirEmpresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // HISTORIAL
    // =====================================================

    if (
      recurso ===
      'historial'
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

      const tipoCierre =
        mayusculas(
          searchParams.get(
            'tipo_cierre'
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
        tipoCierre &&
        !TIPOS_CIERRE_VALIDOS.has(
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

      const cierres =
        await listarCierres(
          supabase,
          {
            fechaInicio,
            fechaFin,
            tipoCierre,
          }
        )

      return NextResponse.json({
        status:
          'success',

        data:
          cierres,

        total:
          cierres.length,

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
              'El identificador del cierre es obligatorio.',
          },
          {
            status:
              400,
          }
        )
      }

      const cierre =
        await obtenerCierrePorId(
          supabase,
          id
        )

      if (
        !cierre
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El cierre solicitado no existe.',
          },
          {
            status:
              404,
          }
        )
      }

      const [
        ingresos,
        egresos,
      ] =
        await Promise.all([
          consultarIngresos(
            supabase,
            cierre.periodo_desde,
            cierre.periodo_hasta
          ),

          consultarEgresos(
            supabase,
            cierre.periodo_desde,
            cierre.periodo_hasta
          ),
        ])

      return NextResponse.json({
        status:
          'success',

        data: {
          ...cierre,

          ingresos,

          egresos,
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
      'Error GET /api/admin/caja/cierre:',
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
    // REGISTRAR CIERRE / ARQUEO
    // =====================================================

    if (
      accion ===
      'cerrar'
    ) {
      const fecha =
        texto(
          body?.fecha
        ) ||
        hoyColombia()

      const tipoCierre =
        mayusculas(
          body?.tipo_cierre
        )

      const usuarioCierre =
        mayusculas(
          body?.usuario_cierre ||
          body?.usuario
        )

      const usuarioEntrega =
        mayusculas(
          body?.usuario_entrega
        )

      const usuarioRecibe =
        mayusculas(
          body?.usuario_recibe
        )

      const observaciones =
        texto(
          body?.observaciones
        )

      const saldoInicial =
        numeroNoNegativo(
          body?.saldo_inicial_efectivo
        )

      const efectivoContado =
        numeroNoNegativo(
          body?.efectivo_contado
        )

      // ===================================================
      // VALIDACIONES
      // ===================================================

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
              'La fecha no es válida.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        !TIPOS_CIERRE_VALIDOS.has(
          tipoCierre
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'Seleccione Arqueo de Turno o Cierre Diario.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        saldoInicial ===
        null
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El saldo inicial en efectivo no es válido.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        efectivoContado ===
        null
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'Ingrese el efectivo contado.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        !usuarioCierre
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'No se pudo identificar el usuario que realiza la operación.',
          },
          {
            status:
              400,
          }
        )
      }

      // ===================================================
      // ARQUEO DE TURNO
      // ===================================================
      // El arqueo registra el estado de la caja realizado
      // por el usuario autenticado. La entrega o destino
      // físico de la caja es informativo y opcional; no
      // determina quién operará el siguiente turno.

      if (
        tipoCierre ===
        'TURNO' &&
        !usuarioEntrega
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'No se pudo identificar quién realiza el arqueo de turno.',
          },
          {
            status:
              400,
          }
        )
      }

      // NO DUPLICAR CIERRE DIARIO
      // ===================================================

      if (
        tipoCierre ===
        'DIARIO'
      ) {
        const cierreExistente =
          await existeCierreDiario(
            supabase,
            fecha
          )

        if (
          cierreExistente
        ) {
          return NextResponse.json(
            {
              status:
                'error',

              message:
                `Ya existe un cierre diario para esta fecha: ${
                  cierreExistente
                    .consecutivo ||
                  `#${cierreExistente.id}`
                }.`,

              data: {
                cierre_existente:
                  cierreExistente,
              },
            },
            {
              status:
                409,
            }
          )
        }
      }

      // ===================================================
      // PERÍODO
      // ===================================================

      let periodoDesde =
        texto(
          body?.periodo_desde
        )

      let periodoHasta =
        texto(
          body?.periodo_hasta
        )

      if (
        !periodoDesde ||
        !periodoHasta
      ) {
        const periodo =
          await obtenerPeriodoSugerido(
            supabase,
            tipoCierre,
            fecha
          )

        periodoDesde =
          periodo.periodo_desde

        periodoHasta =
          periodo.periodo_hasta
      }

      if (
        !timestampValido(
          periodoDesde
        ) ||
        !timestampValido(
          periodoHasta
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El período de la operación no es válido.',
          },
          {
            status:
              400,
          }
        )
      }

      if (
        new Date(
          periodoHasta
        ).getTime() <=
        new Date(
          periodoDesde
        ).getTime()
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'La hora final debe ser posterior a la hora inicial.',
          },
          {
            status:
              400,
          }
        )
      }

      // ===================================================
      // MOVIMIENTOS REALES
      // ===================================================

      const [
        ingresos,
        egresos,
      ] =
        await Promise.all([
          consultarIngresos(
            supabase,
            periodoDesde,
            periodoHasta
          ),

          consultarEgresos(
            supabase,
            periodoDesde,
            periodoHasta
          ),
        ])

      const calculo =
        calcularMovimientos({
          ingresos,
          egresos,

          saldoInicialEfectivo:
            saldoInicial,

          efectivoContado,
        })

      // ===================================================
      // INSERT
      // ===================================================

      const {
        data:
          cierreCreado,

        error:
          errorInsert,
      } =
        await supabase
          .from(
            'cierres_caja'
          )
          .insert({
            fecha,

            tipo_cierre:
              tipoCierre,

            periodo_desde:
              periodoDesde,

            periodo_hasta:
              periodoHasta,

            saldo_inicial_efectivo:
              calculo
                .saldo_inicial_efectivo,

            ingresos_efectivo:
              calculo
                .ingresos_efectivo,

            ingresos_otros_medios:
              calculo
                .ingresos_otros_medios,

            total_ingresos_sistema:
              calculo
                .total_ingresos_sistema,

            egresos_efectivo:
              calculo
                .egresos_efectivo,

            egresos_otros_medios:
              calculo
                .egresos_otros_medios,

            total_egresos_sistema:
              calculo
                .total_egresos_sistema,

            efectivo_esperado:
              calculo
                .efectivo_esperado,

            efectivo_contado:
              calculo
                .efectivo_contado,

            diferencia_efectivo:
              calculo
                .diferencia_efectivo,

            movimiento_neto:
              calculo
                .movimiento_neto,

            resumen_medios_pago:
              calculo
                .resumen_medios_pago,

            cantidad_recibos:
              calculo
                .cantidad_recibos,

            cantidad_egresos:
              calculo
                .cantidad_egresos,

            cantidad_recibos_anulados:
              calculo
                .cantidad_recibos_anulados,

            cantidad_egresos_anulados:
              calculo
                .cantidad_egresos_anulados,

            usuario_cierre:
              usuarioCierre,

            usuario_entrega:
              tipoCierre ===
              'TURNO'
                ? usuarioEntrega
                : usuarioCierre,

            usuario_recibe:
              tipoCierre ===
              'TURNO'
                ? usuarioRecibe
                : null,

            estado:
              'CERRADO',

            observaciones:
              observaciones ||
              null,

            consecutivo:
              null,
          })
          .select(`
            id,
            fecha,
            tipo_cierre,
            periodo_desde,
            periodo_hasta,
            saldo_inicial_efectivo,
            ingresos_efectivo,
            ingresos_otros_medios,
            total_ingresos_sistema,
            egresos_efectivo,
            egresos_otros_medios,
            total_egresos_sistema,
            efectivo_esperado,
            efectivo_contado,
            diferencia_efectivo,
            movimiento_neto,
            resumen_medios_pago,
            cantidad_recibos,
            cantidad_egresos,
            cantidad_recibos_anulados,
            cantidad_egresos_anulados,
            usuario_cierre,
            usuario_entrega,
            usuario_recibe,
            estado,
            observaciones,
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
              `No fue posible registrar la operación: ${errorInsert.message}`,
          },
          {
            status:
              400,
          }
        )
      }

      // ===================================================
      // CONSECUTIVO
      // ===================================================

      const consecutivo =
        generarConsecutivo(
          cierreCreado.id,
          tipoCierre,
          fecha
        )

      const {
        data:
          cierreActualizado,

        error:
          errorConsecutivo,
      } =
        await supabase
          .from(
            'cierres_caja'
          )
          .update({
            consecutivo,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            cierreCreado.id
          )
          .select(`
            id,
            consecutivo,
            fecha,
            tipo_cierre,
            periodo_desde,
            periodo_hasta,
            saldo_inicial_efectivo,
            ingresos_efectivo,
            ingresos_otros_medios,
            total_ingresos_sistema,
            egresos_efectivo,
            egresos_otros_medios,
            total_egresos_sistema,
            efectivo_esperado,
            efectivo_contado,
            diferencia_efectivo,
            movimiento_neto,
            resumen_medios_pago,
            cantidad_recibos,
            cantidad_egresos,
            cantidad_recibos_anulados,
            cantidad_egresos_anulados,
            usuario_cierre,
            usuario_entrega,
            usuario_recibe,
            estado,
            observaciones,
            created_at,
            updated_at
          `)
          .single()

      if (
        errorConsecutivo
      ) {
        await supabase
          .from(
            'cierres_caja'
          )
          .delete()
          .eq(
            'id',
            cierreCreado.id
          )

        return NextResponse.json(
          {
            status:
              'error',

            message:
              `No fue posible generar el consecutivo: ${errorConsecutivo.message}`,
          },
          {
            status:
              500,
          }
        )
      }

      // ===================================================
      // RESPUESTA
      // ===================================================

      return NextResponse.json(
        {
          status:
            'success',

          message:
            tipoCierre ===
            'TURNO'
              ? `Arqueo de turno ${consecutivo} registrado correctamente.`
              : `Cierre diario ${consecutivo} registrado correctamente.`,

          data: {
            ...cierreActualizado,

            ingresos,

            egresos,
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
    // ACCIÓN INVÁLIDA
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
      'Error POST /api/admin/caja/cierre:',
      error
    )

    return respuestaError(
      error
    )
  }
}