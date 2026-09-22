// app/api/horarios/simple/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// =========================================================
// CONSTANTES
// =========================================================

const ESTADO_ABIERTO = 'Abierto'
const ESTADO_CERRADO = 'Cerrado'
const ESTADO_NO_CERRADO = 'No Cerrado'

const ROL_INSTRUCTOR_TEORIA = 'INSTRUCTOR TEORÍA'
const ROL_AUXILIAR_ADMINISTRATIVO = 'AUXILIAR ADMINISTRATIVO'

// =========================================================
// HELPERS
// =========================================================

function respuestaError(error) {
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

function normalizarTexto(valor) {
  return String(
    valor || ''
  ).trim()
}

function normalizarMayusculas(valor) {
  return String(
    valor || ''
  )
    .trim()
    .toUpperCase()
}

function ahoraBogota() {
  const timeZone =
    'America/Bogota'

  const ahora =
    new Date()

  const fecha =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',

        timeZone,
      }
    ).format(
      ahora
    )

  const hora =
    new Intl.DateTimeFormat(
      'en-GB',
      {
        hour:
          '2-digit',

        minute:
          '2-digit',

        second:
          '2-digit',

        hour12:
          false,

        timeZone,
      }
    ).format(
      ahora
    )

  return {
    fecha,
    hora,

    // Conservamos el formato utilizado por el sistema.
    timestamp:
      `${fecha}T${hora}-05:00`,
  }
}

// =========================================================
// NORMALIZAR ROL
// =========================================================
//
// Aceptamos:
//
// INSTRUCTOR TEORÍA
// INSTRUCTOR TEORIA
// INSTRUCTOR_TEORIA
//
// AUXILIAR ADMINISTRATIVO
// AUXILIAR_ADMINISTRATIVO
//
// =========================================================

function normalizarRol(valor) {
  const rol =
    normalizarMayusculas(
      valor
    )
      .replace(
        /_/g,
        ' '
      )
      .replace(
        /\s+/g,
        ' '
      )

  if (
    rol ===
      'INSTRUCTOR TEORIA' ||
    rol ===
      'INSTRUCTOR TEORÍA'
  ) {
    return ROL_INSTRUCTOR_TEORIA
  }

  if (
    rol ===
    'AUXILIAR ADMINISTRATIVO'
  ) {
    return ROL_AUXILIAR_ADMINISTRATIVO
  }

  return rol
}

function rolPermitido(valor) {
  const rol =
    normalizarRol(
      valor
    )

  return [
    ROL_INSTRUCTOR_TEORIA,
    ROL_AUXILIAR_ADMINISTRATIVO,
  ].includes(
    rol
  )
}

// =========================================================
// DURACIÓN
// =========================================================

function calcularDuracionMinutos(
  timestampEntrada,
  timestampSalida
) {
  if (
    !timestampEntrada ||
    !timestampSalida
  ) {
    return 0
  }

  try {
    const inicio =
      new Date(
        timestampEntrada
      ).getTime()

    const fin =
      new Date(
        timestampSalida
      ).getTime()

    if (
      !Number.isFinite(
        inicio
      ) ||
      !Number.isFinite(
        fin
      )
    ) {
      return 0
    }

    return Math.max(
      0,
      Math.round(
        (
          fin -
          inicio
        ) /
        (
          1000 *
          60
        )
      )
    )
  } catch {
    return 0
  }
}

// =========================================================
// CONSULTAR USUARIO
// =========================================================
//
// Se utiliza principalmente para obtener el correo.
//
// El rol operativo NO se toma de esta tabla.
// Se conserva el rol del perfil con el que inició sesión.
//
// =========================================================

async function obtenerDatosUsuario(
  supabase,
  usuario
) {
  const usuarioNormalizado =
    normalizarTexto(
      usuario
    )

  if (
    !usuarioNormalizado
  ) {
    return null
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'usuarios'
      )
      .select(`
        usuario,
        email
      `)
      .eq(
        'usuario',
        usuarioNormalizado
      )
      .limit(
        1
      )

  if (error) {
    console.warn(
      'No fue posible consultar el correo del usuario:',
      error.message
    )

    return null
  }

  return (
    Array.isArray(data) &&
    data.length > 0
      ? data[0]
      : null
  )
}

// =========================================================
// CONSULTAR JORNADA ABIERTA DEL DÍA ACTUAL
// =========================================================
//
// IMPORTANTE:
//
// Solo buscamos jornadas:
//
// usuario = usuario actual
// fecha_entrada = HOY
// estado_registro = Abierto
//
// Una jornada anterior en estado:
//
// No Cerrado
//
// NO impide registrar una nueva jornada hoy.
//
// =========================================================

async function obtenerJornadaAbierta(
  supabase,
  usuario
) {
  const usuarioNormalizado =
    normalizarTexto(
      usuario
    )

  if (
    !usuarioNormalizado
  ) {
    return null
  }

  const {
    fecha,
  } =
    ahoraBogota()

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'horarios'
      )
      .select(`
        id,
        timestamp_entrada,
        fecha_entrada,
        hora_entrada,
        usuario,
        nombre_completo,
        rol,
        estado_registro
      `)
      .eq(
        'usuario',
        usuarioNormalizado
      )
      .eq(
        'fecha_entrada',
        fecha
      )
      .eq(
        'estado_registro',
        ESTADO_ABIERTO
      )
      .order(
        'timestamp_entrada',
        {
          ascending:
            false,
        }
      )
      .limit(
        1
      )

  if (error) {
    throw new Error(
      `No fue posible consultar la jornada abierta: ${error.message}`
    )
  }

  return (
    Array.isArray(data) &&
    data.length > 0
      ? data[0]
      : null
  )
}

// =========================================================
// GET
// =========================================================
//
// CONSULTAR ESTADO DE LA JORNADA
//
// Ejemplo:
//
// /api/horarios/simple
//   ?nit=...
//   &usuario=usuario123
//
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

    const usuario =
      normalizarTexto(
        searchParams.get(
          'usuario'
        )
      )

    if (!usuario) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El usuario es obligatorio.',
        },
        {
          status:
            400,
        }
      )
    }

    const [
      jornada,
      datosUsuario,
    ] =
      await Promise.all([
        obtenerJornadaAbierta(
          supabase,
          usuario
        ),

        obtenerDatosUsuario(
          supabase,
          usuario
        ),
      ])

    return NextResponse.json({
      status:
        'success',

      tiene_jornada_abierta:
        Boolean(
          jornada
        ),

      jornada:
        jornada ||
        null,

      email:
        datosUsuario
          ?.email ||
        '',
    })
  } catch (error) {
    console.error(
      'Error GET /api/horarios/simple:',
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
// REGISTRAR ENTRADA
//
// BODY:
//
// {
//   nit,
//   accion: 'registrar_entrada',
//   usuario,
//   nombre_completo,
//   rol
// }
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

    if (
      accion !==
      'registrar_entrada'
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'Acción no válida.',
        },
        {
          status:
            400,
        }
      )
    }

    const usuario =
      normalizarTexto(
        body?.usuario
      )

    const nombreCompleto =
      normalizarTexto(
        body?.nombre_completo ||
        body?.nombreCompleto
      )

    const rol =
      normalizarRol(
        body?.rol ||
        body?.role
      )

    // =====================================================
    // VALIDACIONES
    // =====================================================

    if (!usuario) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El usuario es obligatorio.',
        },
        {
          status:
            400,
        }
      )
    }

    if (!nombreCompleto) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El nombre del usuario es obligatorio.',
        },
        {
          status:
            400,
        }
      )
    }

    if (
      !rolPermitido(
        rol
      )
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'Este perfil no está autorizado para registrar horario desde este módulo.',
        },
        {
          status:
            403,
        }
      )
    }

    // =====================================================
    // EVITAR JORNADA DUPLICADA DEL MISMO DÍA
    // =====================================================

    const jornadaExistente =
      await obtenerJornadaAbierta(
        supabase,
        usuario
      )

    if (
      jornadaExistente
    ) {
      return NextResponse.json(
        {
          status:
            'warning',

          message:
            'Ya tiene una jornada abierta hoy. Debe registrar la salida antes de crear una nueva entrada.',

          jornada:
            jornadaExistente,
        },
        {
          status:
            409,
        }
      )
    }

    const {
      fecha,
      hora,
      timestamp,
    } =
      ahoraBogota()

    // =====================================================
    // REGISTRAR ENTRADA
    // =====================================================

    const {
      data,
      error,
    } =
      await supabase
        .from(
          'horarios'
        )
        .insert({
          timestamp_entrada:
            timestamp,

          fecha_entrada:
            fecha,

          hora_entrada:
            hora,

          usuario,

          nombre_completo:
            nombreCompleto,

          rol,

          estado_registro:
            ESTADO_ABIERTO,

          // Los campos propios de Instructor Práctica
          // quedan NULL porque no se incluyen aquí.
        })
        .select(`
          id,
          timestamp_entrada,
          fecha_entrada,
          hora_entrada,
          usuario,
          nombre_completo,
          rol,
          estado_registro
        `)
        .single()

    if (error) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            `No fue posible registrar la entrada: ${error.message}`,
        },
        {
          status:
            500,
        }
      )
    }

    // =====================================================
    // CORREO
    // =====================================================

    const datosUsuario =
      await obtenerDatosUsuario(
        supabase,
        usuario
      )

    return NextResponse.json(
      {
        status:
          'success',

        message:
          'Entrada registrada correctamente.',

        jornada:
          data,

        email:
          datosUsuario
            ?.email ||
          '',
      },
      {
        status:
          201,
      }
    )
  } catch (error) {
    console.error(
      'Error POST /api/horarios/simple:',
      error
    )

    return respuestaError(
      error
    )
  }
}

// =========================================================
// PATCH
// =========================================================
//
// REGISTRAR SALIDA
//
// BODY:
//
// {
//   nit,
//   accion: 'registrar_salida',
//   usuario,
//   rol,
//   registro_id
// }
//
// =========================================================

export async function PATCH(request) {
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

    if (
      accion !==
      'registrar_salida'
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'Acción no válida.',
        },
        {
          status:
            400,
        }
      )
    }

    const usuario =
      normalizarTexto(
        body?.usuario
      )

    const rol =
      normalizarRol(
        body?.rol ||
        body?.role
      )

    const registroId =
      Number(
        body?.registro_id ||
        body?.id
      )

    // =====================================================
    // VALIDACIONES
    // =====================================================

    if (!usuario) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El usuario es obligatorio.',
        },
        {
          status:
            400,
        }
      )
    }

    if (
      !rolPermitido(
        rol
      )
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'Este perfil no está autorizado para registrar horario desde este módulo.',
        },
        {
          status:
            403,
        }
      )
    }

    if (
      !Number.isInteger(
        registroId
      ) ||
      registroId <=
        0
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'El registro de entrada no es válido.',
        },
        {
          status:
            400,
        }
      )
    }

    // =====================================================
    // CONSULTAR REGISTRO
    // =====================================================

    const {
      data:
        registro,
      error:
        registroError,
    } =
      await supabase
        .from(
          'horarios'
        )
        .select(`
          id,
          timestamp_entrada,
          fecha_entrada,
          hora_entrada,
          usuario,
          nombre_completo,
          rol,
          estado_registro
        `)
        .eq(
          'id',
          registroId
        )
        .maybeSingle()

    if (
      registroError
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            `No fue posible consultar la jornada: ${registroError.message}`,
        },
        {
          status:
            500,
        }
      )
    }

    if (!registro) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'La jornada no existe.',
        },
        {
          status:
            404,
        }
      )
    }

    // =====================================================
    // VALIDAR QUE PERTENEZCA AL USUARIO
    // =====================================================

    if (
      normalizarTexto(
        registro.usuario
      ) !==
      usuario
    ) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            'La jornada seleccionada no pertenece al usuario en sesión.',
        },
        {
          status:
            403,
        }
      )
    }

    // =====================================================
    // VALIDAR ESTADO ABIERTO
    // =====================================================

    if (
      normalizarTexto(
        registro.estado_registro
      ).toLowerCase() !==
      ESTADO_ABIERTO.toLowerCase()
    ) {
      return NextResponse.json(
        {
          status:
            'warning',

          message:
            registro.estado_registro ===
            ESTADO_NO_CERRADO
              ? 'Esta jornada fue marcada como No Cerrado y ya no puede cerrarse desde este módulo.'
              : 'Esta jornada ya se encuentra cerrada.',
        },
        {
          status:
            409,
        }
      )
    }

    // =====================================================
    // PROTEGER JORNADAS DE DÍAS ANTERIORES
    // =====================================================
    //
    // Solo se permite cerrar desde este módulo una jornada
    // correspondiente al día actual.
    //
    // Una jornada anterior que permanezca Abierto debe ser
    // procesada por el flujo automático:
    //
    // Abierto -> No Cerrado
    //
    // sin registrar:
    //
    // timestamp_salida
    // fecha_salida
    // hora_salida
    // duracion_jornada
    //
    // =====================================================

    const {
      fecha:
        fechaActual,
    } =
      ahoraBogota()

    if (
      String(
        registro.fecha_entrada ||
        ''
      ) !==
      fechaActual
    ) {
      return NextResponse.json(
        {
          status:
            'warning',

          message:
            'Esta jornada corresponde a una fecha anterior y ya no puede cerrarse desde este módulo.',
        },
        {
          status:
            409,
        }
      )
    }

    // =====================================================
    // FECHA / HORA DE SALIDA
    // =====================================================

    const {
      fecha,
      hora,
      timestamp,
    } =
      ahoraBogota()

    const duracionMinutos =
      calcularDuracionMinutos(
        registro
          .timestamp_entrada,
        timestamp
      )

    // =====================================================
    // ACTUALIZAR JORNADA
    // =====================================================

    const {
      data,
      error,
    } =
      await supabase
        .from(
          'horarios'
        )
        .update({
          timestamp_salida:
            timestamp,

          fecha_salida:
            fecha,

          hora_salida:
            hora,

          duracion_jornada:
            duracionMinutos,

          estado_registro:
            ESTADO_CERRADO,
        })
        .eq(
          'id',
          registro.id
        )
        .eq(
          'usuario',
          usuario
        )
        .eq(
          'fecha_entrada',
          fechaActual
        )
        .eq(
          'estado_registro',
          ESTADO_ABIERTO
        )
        .select(`
          id,
          timestamp_entrada,
          fecha_entrada,
          hora_entrada,
          timestamp_salida,
          fecha_salida,
          hora_salida,
          usuario,
          nombre_completo,
          rol,
          duracion_jornada,
          estado_registro
        `)
        .single()

    if (error) {
      return NextResponse.json(
        {
          status:
            'failed',

          message:
            `No fue posible registrar la salida: ${error.message}`,
        },
        {
          status:
            500,
        }
      )
    }

    // =====================================================
    // CORREO
    // =====================================================

    const datosUsuario =
      await obtenerDatosUsuario(
        supabase,
        usuario
      )

    return NextResponse.json({
      status:
        'success',

      message:
        'Salida registrada correctamente.',

      jornada:
        data,

      duracion_minutos:
        duracionMinutos,

      email:
        datosUsuario
          ?.email ||
        '',
    })
  } catch (error) {
    console.error(
      'Error PATCH /api/horarios/simple:',
      error
    )

    return respuestaError(
      error
    )
  }
}