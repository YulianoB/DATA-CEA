// app/api/preoperacionales/route.js

import { NextResponse } from 'next/server'
import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// =========================================================
// HELPERS
// =========================================================

function respuestaError(error) {
  const respuesta =
    respuestaErrorEmpresa(error)

  return NextResponse.json(
    respuesta.body,
    {
      status: respuesta.status,
    }
  )
}

function normalizarTexto(valor) {
  return String(valor || '').trim()
}

function normalizarMayusculas(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
}

// =========================================================
// FECHA
// =========================================================

function fechaValida(
  valor
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    normalizarTexto(
      valor
    )
  )
}

// =========================================================
// FECHA COMPARACIÓN DOCUMENTO
// =========================================================

function fechaOrdenDocumento(
  registro
) {
  return (
    normalizarTexto(
      registro?.fecha_actualizacion
    ) ||
    normalizarTexto(
      registro?.created_at
    ) ||
    normalizarTexto(
      registro?.fecha_expedicion
    ) ||
    ''
  )
}

// =========================================================
// ÚLTIMO DOCUMENTO POR TIPO
// =========================================================
//
// vencimientos_vehiculos conserva historial.
//
// Para validar la operación solamente se toma
// el registro más reciente de cada documento.
//
// =========================================================

function obtenerUltimosDocumentosVehiculo(
  documentos
) {
  const mapa =
    new Map()

  for (
    const registro of
      Array.isArray(
        documentos
      )
        ? documentos
        : []
  ) {
    const tipo =
      normalizarMayusculas(
        registro?.documento
      )

    if (
      !tipo
    ) {
      continue
    }

    const anterior =
      mapa.get(
        tipo
      )

    if (
      !anterior
    ) {
      mapa.set(
        tipo,
        registro
      )

      continue
    }

    const fechaActual =
      fechaOrdenDocumento(
        registro
      )

    const fechaAnterior =
      fechaOrdenDocumento(
        anterior
      )

    if (
      fechaActual >
      fechaAnterior
    ) {
      mapa.set(
        tipo,
        registro
      )

      continue
    }

    if (
      fechaActual ===
        fechaAnterior &&
      Number(
        registro?.id
      ) >
        Number(
          anterior?.id
        )
    ) {
      mapa.set(
        tipo,
        registro
      )
    }
  }

  return [
    ...mapa.values(),
  ]
}

// =========================================================
// EVALUAR DOCUMENTACIÓN DEL VEHÍCULO
// =========================================================

function evaluarDocumentacionVehiculo({
  documentos,
  fechaReferencia,
}) {
  const ultimos =
    obtenerUltimosDocumentosVehiculo(
      documentos
    )

  if (
    ultimos.length ===
    0
  ) {
    return {
      valido:
        false,

      motivo:
        'El vehículo no tiene documentación de vigencias registrada.',

      documentos:
        [],
    }
  }

  const evaluados =
    ultimos.map(
      registro => {
        const vigencia =
          normalizarTexto(
            registro?.fecha_vigencia
          ).slice(
            0,
            10
          )

        const estado =
          normalizarMayusculas(
            registro?.estado
          )

        const estadoBloqueado =
          [
            'VENCIDO',
            'VENCIDA',
            'INACTIVO',
            'INACTIVA',
          ].includes(
            estado
          )

        const vigente =
          Boolean(
            vigencia &&
            fechaValida(
              vigencia
            ) &&
            vigencia >=
              fechaReferencia &&
            !estadoBloqueado
          )

        return {
          ...registro,
          vigente,
        }
      }
    )

  const vencidos =
    evaluados.filter(
      item =>
        !item?.vigente
    )

  if (
    vencidos.length >
    0
  ) {
    const nombres =
      vencidos
        .map(
          item =>
            normalizarTexto(
              item?.documento
            ) ||
            'Documento'
        )
        .filter(
          Boolean
        )

    return {
      valido:
        false,

      motivo:
        `El vehículo presenta documentación vencida o no vigente: ${nombres.join(
          ', '
        )}.`,

      documentos:
        evaluados,

      documentos_no_vigentes:
        vencidos,
    }
  }

  return {
    valido:
      true,

    motivo:
      '',

    documentos:
      evaluados,

    documentos_no_vigentes:
      [],
  }
}

// =========================================================
// GET
// =========================================================

export async function GET(request) {
  try {
    const { supabaseAdmin } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request
      )

    const supabase =
      supabaseAdmin

    const { searchParams } =
      new URL(request.url)

    const recurso =
      normalizarTexto(
        searchParams.get('recurso')
      )

    // =====================================================
    // VEHÍCULOS
    // =====================================================

    if (recurso === 'vehiculos') {
      const {
        data,
        error,
      } = await supabase
        .from('vehiculos')
        .select(`
          id,
          placa,
          tipo_vehiculo,
          marca,
          estado
        `)
        .order(
          'placa',
          {
            ascending: true,
          }
        )

      if (error) {
        console.error(
          'Error cargando vehículos para preoperacional:',
          error
        )

        return NextResponse.json(
          {
            status: 'failed',
            message:
              `No fue posible cargar los vehículos: ${error.message}`,
          },
          {
            status: 500,
          }
        )
      }

      return NextResponse.json({
        status: 'success',
        vehiculos:
          data || [],
      })
    }

    // =====================================================
// DOCUMENTACIÓN VEHÍCULO
// =====================================================

if (
  recurso ===
    'documentacion_vehiculo'
) {
  const placa =
    normalizarMayusculas(
      searchParams.get(
        'placa'
      )
    )

  const fecha =
    normalizarTexto(
      searchParams.get(
        'fecha'
      )
    )

  if (
    !placa
  ) {
    return NextResponse.json(
      {
        status:
          'failed',

        message:
          'La placa es obligatoria.',
      },
      {
        status:
          400,
      }
    )
  }

  if (
    !fecha ||
    !fechaValida(
      fecha
    )
  ) {
    return NextResponse.json(
      {
        status:
          'failed',

        message:
          'La fecha de validación no es válida.',
      },
      {
        status:
          400,
      }
    )
  }

  // ===================================================
  // VEHÍCULO
  // ===================================================

  const {
    data: vehiculo,
    error: vehiculoError,
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
        estado
      `)
      .eq(
        'placa',
        placa
      )
      .maybeSingle()

  if (
    vehiculoError
  ) {
    throw new Error(
      `No fue posible consultar el vehículo: ${vehiculoError.message}`
    )
  }

  if (
    !vehiculo
  ) {
    return NextResponse.json(
      {
        status:
          'failed',

        message:
          'El vehículo seleccionado no existe.',
      },
      {
        status:
          404,
      }
    )
  }

  // ===================================================
  // VIGENCIAS
  // ===================================================

  const {
    data: documentos,
    error: documentosError,
  } =
    await supabase
      .from(
        'vencimientos_vehiculos'
      )
      .select(`
        id,
        vehiculo_id,
        placa,
        documento,
        numero_documento,
        fecha_expedicion,
        fecha_vigencia,
        fecha_actualizacion,
        estado,
        created_at
      `)
      .eq(
        'vehiculo_id',
        vehiculo.id
      )
      .order(
        'id',
        {
          ascending:
            false,
        }
      )

  if (
    documentosError
  ) {
    throw new Error(
      `No fue posible consultar la documentación del vehículo: ${documentosError.message}`
    )
  }

  const validacion =
    evaluarDocumentacionVehiculo({
      documentos:
        documentos || [],

      fechaReferencia:
        fecha,
    })

  return NextResponse.json({
    status:
      'success',

    vehiculo,

    valido:
      validacion.valido,

    motivo:
      validacion.motivo,

    documentos:
      validacion.documentos,

    documentos_no_vigentes:
      validacion
        .documentos_no_vigentes ||
      [],
  })
}

    // =====================================================
    // RECURSO NO VÁLIDO
    // =====================================================

    return NextResponse.json(
      {
        status: 'failed',
        message:
          'Recurso no válido. Use vehiculos o documentacion_vehiculo.',
      },
      {
        status: 400,
      }
    )
  } catch (error) {
    console.error(
      'Error GET /api/preoperacionales:',
      error
    )

    return respuestaError(error)
  }
}

// =========================================================
// POST
// =========================================================

export async function POST(request) {
  try {
    const body =
      await request.json()

    const { supabaseAdmin } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    const supabase =
      supabaseAdmin

    const accion =
      normalizarTexto(
        body?.accion
      )

    // =====================================================
    // VALIDAR ACCIÓN
    // =====================================================

    if (
      accion &&
      accion !== 'registrar'
    ) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            'Acción no válida.',
        },
        {
          status: 400,
        }
      )
    }

    // =====================================================
    // NORMALIZAR DATOS
    // =====================================================

    const placa =
      normalizarMayusculas(
        body?.placa
      )

    const fechaRegistro =
      normalizarTexto(
        body?.fecha_registro
      )

    const horaRegistro =
      normalizarTexto(
        body?.hora_registro
      )

    const tipoVehiculo =
      normalizarTexto(
        body?.tipo_vehiculo
      )

    const marca =
      normalizarTexto(
        body?.marca
      )

    const usuarioEncargado =
      normalizarTexto(
        body?.usuario_encargado
      )

    const revisionExterior =
      normalizarMayusculas(
        body?.revision_exterior
      )

    const motor =
      normalizarMayusculas(
        body?.motor
      )

    const interiorFuncionamiento =
      normalizarMayusculas(
        body?.interior_funcionamiento
      )

    const equiposPrevencion =
      normalizarMayusculas(
        body?.equipos_prevencion
      )

    const documentos =
      normalizarMayusculas(
        body?.documentos
      )

    const observaciones =
      normalizarTexto(
        body?.observaciones
      )

    const estadoObservacion =
      normalizarMayusculas(
        body?.estado_observacion
      )

    const kilometraje =
      Number(
        body?.km_registro
      )

    // =====================================================
    // VALIDACIONES BÁSICAS
    // =====================================================

    if (!placa) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            'La placa es obligatoria.',
        },
        {
          status: 400,
        }
      )
    }

    if (!fechaRegistro) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            'La fecha del registro es obligatoria.',
        },
        {
          status: 400,
        }
      )
    }

    if (!horaRegistro) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            'La hora del registro es obligatoria.',
        },
        {
          status: 400,
        }
      )
    }

    if (
      !Number.isFinite(
        kilometraje
      ) ||
      kilometraje < 0
    ) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            'El kilometraje no es válido.',
        },
        {
          status: 400,
        }
      )
    }

    if (!usuarioEncargado) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            'El usuario encargado es obligatorio.',
        },
        {
          status: 400,
        }
      )
    }

    // =====================================================
    // VALIDAR SECCIONES
    // =====================================================

    const estadosPermitidos =
      [
        'CONFORME',
        'NO CONFORME',
      ]

    const secciones = [
      {
        nombre:
          'Revisión exterior',
        valor:
          revisionExterior,
      },
      {
        nombre:
          'Motor',
        valor:
          motor,
      },
      {
        nombre:
          'Interior y funcionamiento',
        valor:
          interiorFuncionamiento,
      },
      {
        nombre:
          'Equipos de prevención',
        valor:
          equiposPrevencion,
      },
      {
        nombre:
          'Documentos',
        valor:
          documentos,
      },
    ]

    for (
      const seccion of secciones
    ) {
      if (
        !estadosPermitidos.includes(
          seccion.valor
        )
      ) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              `Debe completar correctamente la sección: ${seccion.nombre}.`,
          },
          {
            status: 400,
          }
        )
      }
    }

    const existeNoConforme =
      secciones.some(
        (seccion) =>
          seccion.valor ===
          'NO CONFORME'
      )

    if (
      existeNoConforme &&
      !observaciones
    ) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            'Debe registrar observaciones cuando existe una sección NO CONFORME.',
        },
        {
          status: 400,
        }
      )
    }

    // =====================================================
    // VALIDAR VEHÍCULO
    // =====================================================

    const {
      data: vehiculo,
      error: vehiculoError,
    } = await supabase
      .from('vehiculos')
      .select(`
        id,
        placa,
        tipo_vehiculo,
        marca,
        estado
      `)
      .eq(
        'placa',
        placa
      )
      .maybeSingle()

    if (vehiculoError) {
      console.error(
        'Error validando vehículo:',
        vehiculoError
      )

      return NextResponse.json(
        {
          status: 'failed',
          message:
            `No fue posible validar el vehículo: ${vehiculoError.message}`,
        },
        {
          status: 500,
        }
      )
    }

    if (!vehiculo) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            'El vehículo seleccionado no existe.',
        },
        {
          status: 404,
        }
      )
    }

    // =====================================================
// VALIDAR DOCUMENTACIÓN VEHÍCULO
// =====================================================

const {
  data: documentosVehiculo,
  error: documentosVehiculoError,
} =
  await supabase
    .from(
      'vencimientos_vehiculos'
    )
    .select(`
      id,
      vehiculo_id,
      placa,
      documento,
      numero_documento,
      fecha_expedicion,
      fecha_vigencia,
      fecha_actualizacion,
      estado,
      created_at
    `)
    .eq(
      'vehiculo_id',
      vehiculo.id
    )
    .order(
      'id',
      {
        ascending:
          false,
      }
    )

if (
  documentosVehiculoError
) {
  return NextResponse.json(
    {
      status:
        'failed',

      message:
        `No fue posible validar la documentación del vehículo: ${documentosVehiculoError.message}`,
    },
    {
      status:
        500,
    }
  )
}

const validacionDocumental =
  evaluarDocumentacionVehiculo({
    documentos:
      documentosVehiculo ||
      [],

    fechaReferencia:
      fechaRegistro,
  })

if (
  !validacionDocumental
    .valido
) {
  return NextResponse.json(
    {
      status:
        'failed',

      codigo:
        'VEHICULO_DOCUMENTACION_NO_VIGENTE',

      message:
        validacionDocumental
          .motivo,

      documentos:
        validacionDocumental
          .documentos,

      documentos_no_vigentes:
        validacionDocumental
          .documentos_no_vigentes ||
        [],
    },
    {
      status:
        409,
    }
  )
}

    // =====================================================
    // VALIDAR DUPLICADO
    // =====================================================
    //
    // Esta validación se repite aquí aunque también exista
    // /api/validaciones/preoperacional.
    //
    // La validación del frontend mejora la experiencia.
    // Esta validación protege directamente el INSERT.
    //
    // =====================================================

    const {
      data: duplicado,
      error: duplicadoError,
    } = await supabase
      .from('preoperacionales')
      .select('id')
      .eq(
        'placa',
        placa
      )
      .eq(
        'fecha_registro',
        fechaRegistro
      )
      .limit(1)

    if (duplicadoError) {
      console.error(
        'Error validando duplicado preoperacional:',
        duplicadoError
      )

      return NextResponse.json(
        {
          status: 'failed',
          message:
            `No fue posible validar duplicado: ${duplicadoError.message}`,
        },
        {
          status: 500,
        }
      )
    }

    if (
      Array.isArray(
        duplicado
      ) &&
      duplicado.length > 0
    ) {
      return NextResponse.json(
        {
          status: 'warning',
          message:
            `Ya existe una inspección registrada hoy para la placa ${placa}.`,
        },
        {
          status: 409,
        }
      )
    }

    // =====================================================
    // PREPARAR PAYLOAD
    // =====================================================
    //
    // El consecutivo NO se calcula previamente.
    //
    // Primero se inserta la inspección.
    // PostgreSQL genera el ID serial.
    //
    // Después:
    //
    // id 1   -> IP-0000001
    // id 25  -> IP-0000025
    // id 350 -> IP-0000350
    //
    // =====================================================

    const payload = {
      timestamp_registro:
        body?.timestamp_registro ||
        new Date().toISOString(),

      fecha_registro:
        fechaRegistro,

      hora_registro:
        horaRegistro,

      placa,

      tipo_vehiculo:
        tipoVehiculo ||
        vehiculo.tipo_vehiculo ||
        null,

      marca:
        marca ||
        vehiculo.marca ||
        null,

      km_registro:
        kilometraje,

      usuario_encargado:
        usuarioEncargado,

      revision_exterior:
        revisionExterior,

      motor,

      interior_funcionamiento:
        interiorFuncionamiento,

      equipos_prevencion:
        equiposPrevencion,

      documentos,

      observaciones:
        observaciones ||
        '',

      estado_observacion:
        estadoObservacion ||
        (
          existeNoConforme
            ? 'PENDIENTE'
            : ''
        ),
    }

    // =====================================================
    // 1. INSERTAR SIN CONSECUTIVO
    // =====================================================

    const {
      data: nuevaInspeccion,
      error: insertError,
    } = await supabase
      .from('preoperacionales')
      .insert(payload)
      .select('id')
      .single()

    if (insertError) {
      console.error(
        'Error insertando preoperacional:',
        insertError
      )

      return NextResponse.json(
        {
          status: 'failed',
          message:
            `No fue posible guardar la inspección: ${insertError.message}`,
        },
        {
          status: 500,
        }
      )
    }

    if (
      !nuevaInspeccion?.id
    ) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            'La inspección fue creada, pero no se obtuvo su identificador.',
        },
        {
          status: 500,
        }
      )
    }

    // =====================================================
    // 2. GENERAR CONSECUTIVO DESDE EL ID
    // =====================================================

    const consecutivo =
      `IP-${String(
        nuevaInspeccion.id
      ).padStart(
        7,
        '0'
      )}`

    // =====================================================
    // 3. ACTUALIZAR REGISTRO CON EL CONSECUTIVO
    // =====================================================

    const {
      data: inspeccion,
      error: updateError,
    } = await supabase
      .from('preoperacionales')
      .update({
        consecutivo,
      })
      .eq(
        'id',
        nuevaInspeccion.id
      )
      .select(`
        id,
        consecutivo,
        timestamp_registro,
        fecha_registro,
        hora_registro,
        placa,
        tipo_vehiculo,
        marca,
        km_registro,
        usuario_encargado,
        revision_exterior,
        motor,
        interior_funcionamiento,
        equipos_prevencion,
        documentos,
        observaciones,
        estado_observacion
      `)
      .single()

    // =====================================================
    // 4. SI FALLA EL CONSECUTIVO, REVERTIR
    // =====================================================

    if (updateError) {
      console.error(
        'Error asignando consecutivo preoperacional:',
        updateError
      )

      const {
        error: rollbackError,
      } = await supabase
        .from('preoperacionales')
        .delete()
        .eq(
          'id',
          nuevaInspeccion.id
        )

      if (rollbackError) {
        console.error(
          'Error eliminando preoperacional incompleto:',
          rollbackError
        )

        return NextResponse.json(
          {
            status: 'failed',
            message:
              'No fue posible asignar el consecutivo y tampoco fue posible eliminar automáticamente el registro incompleto.',
            registro_incompleto_id:
              nuevaInspeccion.id,
          },
          {
            status: 500,
          }
        )
      }

      return NextResponse.json(
        {
          status: 'failed',
          message:
            'No fue posible asignar el consecutivo. El registro incompleto fue eliminado automáticamente.',
        },
        {
          status: 500,
        }
      )
    }

    // =====================================================
    // RESPUESTA
    // =====================================================

    return NextResponse.json(
      {
        status: 'success',

        message:
          'Inspección preoperacional registrada correctamente.',

        consecutivo,

        inspeccion,

        // Se conserva también esta clave por compatibilidad
        // con páginas antiguas que pudieran buscar "data".
        data:
          inspeccion,

        // Y esta por compatibilidad con el page actual.
        preoperacional:
          inspeccion,
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(
      'Error POST /api/preoperacionales:',
      error
    )

    return respuestaError(error)
  }
}