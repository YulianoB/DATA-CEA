// app/api/documentos/vehiculos/route.js

import { NextResponse } from 'next/server'
import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// =========================================================
// CONSTANTES
// =========================================================

const DOCUMENTO_SOAT = 'SOAT'
const DOCUMENTO_RTM = 'RTM'
const DOCUMENTO_TARJETA_SERVICIO =
  'TARJETA_SERVICIO'

const DOCUMENTOS_EDITABLES_INSTRUCTOR = [
  DOCUMENTO_SOAT,
  DOCUMENTO_RTM,
]

const DOCUMENTOS_CONSULTABLES = [
  DOCUMENTO_SOAT,
  DOCUMENTO_RTM,
  DOCUMENTO_TARJETA_SERVICIO,
]

const ROL_ADMINISTRATIVO =
  'ADMINISTRATIVO'

// =========================================================
// HELPERS
// =========================================================

function respuestaError(error) {
  const respuesta =
    respuestaErrorEmpresa(error)

  return NextResponse.json(
    respuesta.body,
    {
      status:
        respuesta.status,
    }
  )
}

function normalizarTexto(valor) {
  return String(valor || '')
    .trim()
}

function normalizarMayusculas(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
}

function normalizarMinusculas(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
}

// =========================================================
// NORMALIZAR DOCUMENTO
// =========================================================

function normalizarDocumento(valor) {
  const documento =
    normalizarMayusculas(valor)
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .replace(
        /\s+/g,
        ' '
      )
      .trim()

  if (
    documento === 'SOAT' ||
    documento ===
      'POLIZA SOAT' ||
    documento ===
      'POLIZA DE SOAT'
  ) {
    return DOCUMENTO_SOAT
  }

  if (
    documento === 'RTM' ||
    documento ===
      'REVISION TECNICO MECANICA' ||
    documento ===
      'REVISION TECNICO-MECANICA' ||
    documento ===
      'REVISION TECNICOMECANICA' ||
    documento ===
      'TECNOMECANICA'
  ) {
    return DOCUMENTO_RTM
  }

  if (
    documento ===
      'TARJETA_SERVICIO' ||
    documento ===
      'TARJETA SERVICIO' ||
    documento ===
      'TARJETA DE SERVICIO'
  ) {
    return DOCUMENTO_TARJETA_SERVICIO
  }

  return documento
}

// =========================================================
// FECHA BOGOTÁ
// =========================================================

function hoyBogota() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone:
        'America/Bogota',
    }
  ).format(
    new Date()
  )
}

// =========================================================
// ESTADO VIGENCIA
// =========================================================

function obtenerEstadoVigencia(
  fechaVigencia
) {
  if (!fechaVigencia) {
    return 'SIN_VIGENCIA'
  }

  return (
    String(fechaVigencia) <
    hoyBogota()
      ? 'VENCIDO'
      : 'VIGENTE'
  )
}

// =========================================================
// VALIDAR FECHA
// =========================================================

function fechaValida(fecha) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    String(fecha || '')
  )
}

// =========================================================
// NORMALIZAR REGISTRO
// =========================================================

function normalizarRegistroDocumento(
  registro
) {
  if (!registro) {
    return null
  }

  return {
    ...registro,

    documento:
      normalizarDocumento(
        registro.documento
      ),

    estado_vigencia:
      obtenerEstadoVigencia(
        registro.fecha_vigencia
      ),
  }
}

// =========================================================
// OBTENER DOCUMENTO MÁS RECIENTE
// =========================================================

function obtenerDocumentoMasReciente(
  registros,
  documento
) {
  const tipo =
    normalizarDocumento(
      documento
    )

  return (
    registros.find(
      (registro) =>
        normalizarDocumento(
          registro.documento
        ) === tipo
    ) ||
    null
  )
}

// =========================================================
// SELECT VEHÍCULO
// =========================================================

const SELECT_VEHICULO = `
  id,
  placa,
  tipo_vehiculo,
  marca,
  estado,
  gps,
  propietario,

  clasificacion,
  origen,
  fecha_adquisicion,

  modelo,
  linea,
  tipo_carroceria,

  numero_chasis,
  numero_motor,
  vin,

  numero_licencia_transito,
  fecha_matricula,
  organismo_transito,

  created_at,
  updated_at
`

// =========================================================
// SELECT DOCUMENTO
// =========================================================

const SELECT_DOCUMENTO = `
  id,
  vehiculo_id,
  placa,
  tipo_vehiculo,
  documento,
  numero_documento,
  fecha_expedicion,
  fecha_vigencia,
  fecha_actualizacion,
  estado,
  nombre_quien_actualiza,
  created_at
`

// =========================================================
// OBTENER VEHÍCULO
// =========================================================

async function obtenerVehiculo(
  supabase,
  {
    vehiculoId = null,
    placa = null,
  }
) {
  let consulta =
    supabase
      .from('vehiculos')
      .select(
        SELECT_VEHICULO
      )

  if (
    vehiculoId &&
    Number.isInteger(
      Number(vehiculoId)
    )
  ) {
    consulta =
      consulta.eq(
        'id',
        Number(vehiculoId)
      )
  } else {
    consulta =
      consulta.eq(
        'placa',
        normalizarMayusculas(
          placa
        )
      )
  }

  const {
    data,
    error,
  } =
    await consulta
      .maybeSingle()

  if (error) {
    throw new Error(
      `No fue posible consultar el vehículo: ${error.message}`
    )
  }

  return data || null
}

// =========================================================
// HISTORIAL DOCUMENTAL
// =========================================================
//
// Se consulta por placa para mantener compatibilidad con
// registros antiguos que todavía tengan vehiculo_id NULL.
//
// El registro más reciente queda primero.
//
// =========================================================

async function obtenerHistorialDocumentos(
  supabase,
  vehiculo
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'vencimientos_vehiculos'
      )
      .select(
        SELECT_DOCUMENTO
      )
      .eq(
        'placa',
        vehiculo.placa
      )
      .order(
        'fecha_actualizacion',
        {
          ascending: false,
          nullsFirst: false,
        }
      )
      .order(
        'id',
        {
          ascending: false,
        }
      )

  if (error) {
    throw new Error(
      `No fue posible consultar los documentos del vehículo: ${error.message}`
    )
  }

  return (
    Array.isArray(data)
      ? data
      : []
  )
    .map(
      normalizarRegistroDocumento
    )
    .filter(
      (registro) =>
        DOCUMENTOS_CONSULTABLES.includes(
          registro.documento
        )
    )
}

// =========================================================
// INSERTAR REGISTRO HISTÓRICO
// =========================================================
//
// IMPORTANTE:
//
// Esta función solamente hace INSERT.
//
// Nunca UPDATE.
//
// =========================================================

async function insertarDocumentoHistorico({
  supabase,
  vehiculo,
  documento,
  numeroDocumento,
  fechaExpedicion,
  fechaVigencia,
  actualizadoPor,
}) {
  const payload = {
    vehiculo_id:
      vehiculo.id,

    placa:
      vehiculo.placa,

    tipo_vehiculo:
      vehiculo.tipo_vehiculo ||
      null,

    documento,

    numero_documento:
      numeroDocumento,

    fecha_expedicion:
      fechaExpedicion,

    fecha_vigencia:
      fechaVigencia,

    fecha_actualizacion:
      hoyBogota(),

    // Se conserva esta columna histórica.
    estado:
      vehiculo.estado ||
      null,

    nombre_quien_actualiza:
      actualizadoPor ||
      null,
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'vencimientos_vehiculos'
      )
      .insert(
        payload
      )
      .select(
        SELECT_DOCUMENTO
      )
      .single()

  if (error) {
    throw new Error(
      `No fue posible registrar el documento: ${error.message}`
    )
  }

  return normalizarRegistroDocumento(
    data
  )
}

// =========================================================
// VALIDAR DUPLICADO EXACTO
// =========================================================

function esDuplicadoExacto({
  anterior,
  numeroDocumento,
  fechaExpedicion,
  fechaVigencia,
}) {
  if (!anterior) {
    return false
  }

  return (
    normalizarMayusculas(
      anterior
        .numero_documento
    ) ===
      numeroDocumento &&
    String(
      anterior
        .fecha_expedicion ||
      ''
    ) ===
      fechaExpedicion &&
    String(
      anterior
        .fecha_vigencia ||
      ''
    ) ===
      fechaVigencia
  )
}

// =========================================================
// VALIDACIONES COMUNES DEL DOCUMENTO
// =========================================================

function validarDatosDocumento({
  documento,
  numeroDocumento,
  fechaExpedicion,
  fechaVigencia,
}) {
  if (
    !DOCUMENTOS_CONSULTABLES.includes(
      documento
    )
  ) {
    return (
      'El tipo de documento no es válido.'
    )
  }

  if (
    !numeroDocumento
  ) {
    return (
      'El número del documento es obligatorio.'
    )
  }

  if (
    !fechaExpedicion ||
    !fechaValida(
      fechaExpedicion
    )
  ) {
    return (
      'La fecha de expedición no es válida.'
    )
  }

  if (
    !fechaVigencia ||
    !fechaValida(
      fechaVigencia
    )
  ) {
    return (
      'La fecha de vigencia no es válida.'
    )
  }

  if (
    fechaVigencia <
    fechaExpedicion
  ) {
    return (
      'La fecha de vigencia no puede ser anterior a la fecha de expedición.'
    )
  }

  return ''
}

// =========================================================
// GET
// =========================================================

export async function GET(request) {
  try {
    const {
      supabaseAdmin,
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
      normalizarTexto(
        searchParams.get(
          'recurso'
        )
      )

    // =====================================================
    // VEHÍCULOS ACTIVOS
    // =====================================================

    if (
      recurso ===
      'vehiculos'
    ) {
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
            estado
          `)
          .order(
            'placa',
            {
              ascending: true,
            }
          )

      if (error) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              `No fue posible cargar los vehículos: ${error.message}`,
          },
          {
            status: 500,
          }
        )
      }

      const vehiculos =
        (
          Array.isArray(data)
            ? data
            : []
        )
          .filter(
            (vehiculo) => {
              const estado =
                normalizarMinusculas(
                  vehiculo.estado
                )

              return (
                !estado ||
                estado ===
                  'activo'
              )
            }
          )

      return NextResponse.json({
        status:
          'success',

        vehiculos,
      })
    }

    // =====================================================
    // DOCUMENTOS ACTUALES
    // =====================================================

    if (
      recurso ===
      'documentos'
    ) {
      const vehiculoId =
        Number(
          searchParams.get(
            'vehiculo_id'
          )
        )

      const placa =
        normalizarMayusculas(
          searchParams.get(
            'placa'
          )
        )

      if (
        (
          !Number.isInteger(
            vehiculoId
          ) ||
          vehiculoId <= 0
        ) &&
        !placa
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'Debe seleccionar un vehículo.',
          },
          {
            status: 400,
          }
        )
      }

      const vehiculo =
        await obtenerVehiculo(
          supabase,
          {
            vehiculoId:
              Number.isInteger(
                vehiculoId
              ) &&
              vehiculoId > 0
                ? vehiculoId
                : null,

            placa,
          }
        )

      if (!vehiculo) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El vehículo seleccionado no existe.',
          },
          {
            status: 404,
          }
        )
      }

      const historial =
        await obtenerHistorialDocumentos(
          supabase,
          vehiculo
        )

      const soat =
        obtenerDocumentoMasReciente(
          historial,
          DOCUMENTO_SOAT
        )

      const rtm =
        obtenerDocumentoMasReciente(
          historial,
          DOCUMENTO_RTM
        )

      const tarjetaServicio =
        obtenerDocumentoMasReciente(
          historial,
          DOCUMENTO_TARJETA_SERVICIO
        )

      const licenciaTransito = {
        numero:
          vehiculo
            .numero_licencia_transito ||
          null,

        fecha_matricula:
          vehiculo
            .fecha_matricula ||
          null,

        organismo_transito:
          vehiculo
            .organismo_transito ||
          null,
      }

      return NextResponse.json({
        status:
          'success',

        vehiculo,

        documentos: {
          soat,

          rtm,

          tarjeta_servicio:
            tarjetaServicio,

          licencia_transito:
            licenciaTransito,
        },

        tiene_documentos:
          Boolean(
            soat ||
            rtm ||
            tarjetaServicio ||
            licenciaTransito
              .numero
          ),
      })
    }

    // =====================================================
    // HISTORIAL COMPLETO
    // =====================================================

    if (
      recurso ===
      'historial'
    ) {
      const vehiculoId =
        Number(
          searchParams.get(
            'vehiculo_id'
          )
        )

      const placa =
        normalizarMayusculas(
          searchParams.get(
            'placa'
          )
        )

      if (
        (
          !Number.isInteger(
            vehiculoId
          ) ||
          vehiculoId <= 0
        ) &&
        !placa
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'Debe seleccionar un vehículo.',
          },
          {
            status: 400,
          }
        )
      }

      const vehiculo =
        await obtenerVehiculo(
          supabase,
          {
            vehiculoId:
              Number.isInteger(
                vehiculoId
              ) &&
              vehiculoId > 0
                ? vehiculoId
                : null,

            placa,
          }
        )

      if (!vehiculo) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El vehículo seleccionado no existe.',
          },
          {
            status: 404,
          }
        )
      }

      const historial =
        await obtenerHistorialDocumentos(
          supabase,
          vehiculo
        )

      return NextResponse.json({
        status:
          'success',

        vehiculo,

        historial,
      })
    }

    // =====================================================
    // RECURSO NO VÁLIDO
    // =====================================================

    return NextResponse.json(
      {
        status:
          'failed',

        message:
          'Recurso no válido.',
      },
      {
        status: 400,
      }
    )
  } catch (error) {
    console.error(
      'Error GET /api/documentos/vehiculos:',
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
//
// ACCIONES:
//
// guardar_documento
//   Instructor Práctica
//   SOAT / RTM
//
// guardar_tarjeta_servicio_admin
//   Administrativo
//   TARJETA_SERVICIO
//
// =========================================================

export async function POST(request) {
  try {
    const body =
      await request.json()

    const {
      supabaseAdmin,
    } =
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
    // DATOS COMUNES
    // =====================================================

    const vehiculoId =
      Number(
        body?.vehiculo_id
      )

    const placa =
      normalizarMayusculas(
        body?.placa
      )

    const documento =
      normalizarDocumento(
        body?.documento
      )

    const numeroDocumento =
      normalizarMayusculas(
        body?.numero_documento
      )

    const fechaExpedicion =
      normalizarTexto(
        body?.fecha_expedicion
      )

    const fechaVigencia =
      normalizarTexto(
        body?.fecha_vigencia
      )

    const actualizadoPor =
      normalizarTexto(
        body
          ?.nombre_quien_actualiza
      )

    const rolSolicitante =
      normalizarMayusculas(
        body?.rol_solicitante
      )

    // =====================================================
    // VEHÍCULO OBLIGATORIO
    // =====================================================

    if (
      (
        !Number.isInteger(
          vehiculoId
        ) ||
        vehiculoId <= 0
      ) &&
      !placa
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El vehículo es obligatorio.',
        },
        {
          status: 400,
        }
      )
    }

    // =====================================================
    // OBTENER VEHÍCULO
    // =====================================================

    const vehiculo =
      await obtenerVehiculo(
        supabase,
        {
          vehiculoId:
            Number.isInteger(
              vehiculoId
            ) &&
            vehiculoId > 0
              ? vehiculoId
              : null,

          placa,
        }
      )

    if (!vehiculo) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El vehículo seleccionado no existe.',
        },
        {
          status: 404,
        }
      )
    }

    // =====================================================
    // GUARDAR SOAT / RTM
    // INSTRUCTOR PRÁCTICA
    // =====================================================

    if (
      accion ===
      'guardar_documento'
    ) {
      // ---------------------------------------------------
      // TARJETA SERVICIO BLOQUEADA AQUÍ
      // ---------------------------------------------------

      if (
        documento ===
        DOCUMENTO_TARJETA_SERVICIO
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'La Tarjeta de Servicio solo puede ser registrada desde el módulo administrativo.',
          },
          {
            status: 403,
          }
        )
      }

      // ---------------------------------------------------
      // SOLO SOAT Y RTM
      // ---------------------------------------------------

      if (
        !DOCUMENTOS_EDITABLES_INSTRUCTOR.includes(
          documento
        )
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'Desde este módulo únicamente se permite registrar o renovar SOAT y RTM.',
          },
          {
            status: 400,
          }
        )
      }

      const mensajeValidacion =
        validarDatosDocumento({
          documento,
          numeroDocumento,
          fechaExpedicion,
          fechaVigencia,
        })

      if (
        mensajeValidacion
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              mensajeValidacion,
          },
          {
            status: 400,
          }
        )
      }

      // ---------------------------------------------------
      // VEHÍCULO DEBE ESTAR ACTIVO
      // ---------------------------------------------------

      const estadoVehiculo =
        normalizarMinusculas(
          vehiculo.estado
        )

      if (
        estadoVehiculo &&
        estadoVehiculo !==
          'activo'
      ) {
        return NextResponse.json(
          {
            status:
              'warning',

            message:
              'El vehículo seleccionado no se encuentra activo.',
          },
          {
            status: 409,
          }
        )
      }

      const historial =
        await obtenerHistorialDocumentos(
          supabase,
          vehiculo
        )

      const anterior =
        obtenerDocumentoMasReciente(
          historial,
          documento
        )

      if (
        esDuplicadoExacto({
          anterior,
          numeroDocumento,
          fechaExpedicion,
          fechaVigencia,
        })
      ) {
        return NextResponse.json(
          {
            status:
              'warning',

            message:
              `Este ${documento} ya está registrado con los mismos datos.`,

            documento:
              anterior,
          },
          {
            status: 409,
          }
        )
      }

      const nuevoDocumento =
        await insertarDocumentoHistorico({
          supabase,
          vehiculo,
          documento,
          numeroDocumento,
          fechaExpedicion,
          fechaVigencia,
          actualizadoPor,
        })

      return NextResponse.json(
        {
          status:
            'success',

          message:
            anterior
              ? `${documento} renovado correctamente. El registro anterior se conserva en el historial.`
              : `${documento} registrado correctamente.`,

          operacion:
            anterior
              ? 'renovacion'
              : 'creacion',

          documento_anterior_id:
            anterior?.id ||
            null,

          documento:
            nuevoDocumento,
        },
        {
          status: 201,
        }
      )
    }

    // =====================================================
    // TARJETA DE SERVICIO
    // ADMINISTRATIVO
    // =====================================================

    if (
      accion ===
      'guardar_tarjeta_servicio_admin'
    ) {
      // ---------------------------------------------------
      // PROTECCIÓN DE FLUJO ADMINISTRATIVO
      // ---------------------------------------------------

      if (
        rolSolicitante !==
        ROL_ADMINISTRATIVO
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'Solo el perfil Administrativo puede registrar la Tarjeta de Servicio.',
          },
          {
            status: 403,
          }
        )
      }

      // ---------------------------------------------------
      // FORZAR TIPO
      // ---------------------------------------------------
      //
      // No confiamos en body.documento para esta acción.
      //
      // ---------------------------------------------------

      const tipoDocumento =
        DOCUMENTO_TARJETA_SERVICIO

      const mensajeValidacion =
        validarDatosDocumento({
          documento:
            tipoDocumento,

          numeroDocumento,
          fechaExpedicion,
          fechaVigencia,
        })

      if (
        mensajeValidacion
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              mensajeValidacion,
          },
          {
            status: 400,
          }
        )
      }

      // ===================================================
      // HISTORIAL EXISTENTE
      // ===================================================

      const historial =
        await obtenerHistorialDocumentos(
          supabase,
          vehiculo
        )

      const anterior =
        obtenerDocumentoMasReciente(
          historial,
          DOCUMENTO_TARJETA_SERVICIO
        )

      // ===================================================
      // DUPLICADO EXACTO
      // ===================================================

      if (
        esDuplicadoExacto({
          anterior,
          numeroDocumento,
          fechaExpedicion,
          fechaVigencia,
        })
      ) {
        return NextResponse.json(
          {
            status:
              'warning',

            message:
              'Esta Tarjeta de Servicio ya está registrada con el mismo número, fecha de expedición y vigencia.',

            documento:
              anterior,
          },
          {
            status: 409,
          }
        )
      }

      // ===================================================
      // INSERTAR NUEVA VERSIÓN
      // ===================================================
      //
      // Incluso si ya existe una tarjeta:
      //
      // NO UPDATE
      //
      // siempre INSERT.
      //
      // ===================================================

      const nuevaTarjeta =
        await insertarDocumentoHistorico({
          supabase,
          vehiculo,

          documento:
            DOCUMENTO_TARJETA_SERVICIO,

          numeroDocumento,

          fechaExpedicion,

          fechaVigencia,

          actualizadoPor,
        })

      return NextResponse.json(
        {
          status:
            'success',

          message:
            anterior
              ? 'Nueva Tarjeta de Servicio registrada correctamente. La tarjeta anterior se conserva en el historial.'
              : 'Tarjeta de Servicio registrada correctamente.',

          operacion:
            anterior
              ? 'nueva_vinculacion'
              : 'creacion',

          documento_anterior_id:
            anterior?.id ||
            null,

          tarjeta_servicio:
            nuevaTarjeta,
        },
        {
          status: 201,
        }
      )
    }

    // =====================================================
    // ACCIÓN NO VÁLIDA
    // =====================================================

    return NextResponse.json(
      {
        status:
          'failed',

        message:
          'Acción no válida.',
      },
      {
        status: 400,
      }
    )
  } catch (error) {
    console.error(
      'Error POST /api/documentos/vehiculos:',
      error
    )

    return respuestaError(
      error
    )
  }
}