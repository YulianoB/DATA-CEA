// app/api/admin/sinst-vigia/rutas/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// =========================================================
// RESPUESTAS / ERRORES
// =========================================================

function responderErrorEmpresa(error) {
  const respuesta = respuestaErrorEmpresa(error)

  return NextResponse.json(
    respuesta.body,
    {
      status: respuesta.status,
    }
  )
}

function responderError(
  mensaje,
  status = 400,
  extra = {}
) {
  return NextResponse.json(
    {
      ok: false,
      error: mensaje,
      ...extra,
    },
    { status }
  )
}

// =========================================================
// HELPERS
// =========================================================

function normalizarTexto(valor) {
  return String(
    valor ?? ''
  ).trim()
}

function normalizarMayusculas(valor) {
  return normalizarTexto(
    valor
  ).toUpperCase()
}

function normalizarNumeroRuta(valor) {
  const texto =
    normalizarMayusculas(
      valor
    )

  if (!texto) {
    return ''
  }

  // Si es completamente numérico, conserva el formato
  // operativo de tres dígitos: 1 -> 001, 12 -> 012.
  if (/^\d+$/.test(texto)) {
    return texto.padStart(
      3,
      '0'
    )
  }

  return texto
}

function construirCodigo(
  categoria,
  numeroRuta
) {
  const categoriaNormalizada =
    normalizarMayusculas(
      categoria
    )

  const numeroNormalizado =
    normalizarNumeroRuta(
      numeroRuta
    )

  if (
    !categoriaNormalizada ||
    !numeroNormalizado
  ) {
    return ''
  }

  return `${categoriaNormalizada}-${numeroNormalizado}`
}

function numeroDecimal(valor) {
  if (
    valor === '' ||
    valor === null ||
    valor === undefined
  ) {
    return null
  }

  const numero =
    Number(
      String(valor)
        .trim()
        .replace(',', '.')
    )

  return Number.isFinite(numero)
    ? numero
    : null
}

function numeroEntero(valor) {
  if (
    valor === '' ||
    valor === null ||
    valor === undefined
  ) {
    return null
  }

  const numero =
    Number(valor)

  if (
    !Number.isFinite(numero) ||
    !Number.isInteger(numero)
  ) {
    return null
  }

  return numero
}

function nombreEmpresa(empresa) {
  return (
    empresa?.nombre ||
    empresa?.nombre_empresa ||
    empresa?.razon_social ||
    ''
  )
}

function construirEmpresaRespuesta(
  nit,
  empresa
) {
  return {
    nit:
      empresa?.nit ||
      nit ||
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

function obtenerUsuarioRequest(
  request,
  body = null
) {
  return (
    normalizarTexto(
      body?.usuario
    ) ||
    normalizarTexto(
      body?.creado_por
    ) ||
    normalizarTexto(
      request.headers.get(
        'x-user-name'
      )
    ) ||
    normalizarTexto(
      request.headers.get(
        'x-usuario'
      )
    ) ||
    null
  )
}

function validarDatosRuta(body) {
  const categoria =
    normalizarMayusculas(
      body?.categoria
    )

  const numero_ruta =
    normalizarNumeroRuta(
      body?.numero_ruta
    )

  const descripcion =
    normalizarTexto(
      body?.descripcion
    )

  const kilometros =
    numeroDecimal(
      body?.kilometros
    )

  const frecuencia_uso_semanal =
    numeroEntero(
      body?.frecuencia_uso_semanal
    )

  const observaciones =
    normalizarTexto(
      body?.observaciones
    ) || null

  if (!categoria) {
    return {
      error:
        'Debe seleccionar o indicar la categoría de la ruta.',
    }
  }

  if (!numero_ruta) {
    return {
      error:
        'Debe indicar el número de la ruta.',
    }
  }

  if (!descripcion) {
    return {
      error:
        'Debe indicar la descripción de la ruta.',
    }
  }

  if (
    kilometros === null ||
    kilometros < 0
  ) {
    return {
      error:
        'Los kilómetros deben ser un número válido mayor o igual a cero.',
    }
  }

  if (
    frecuencia_uso_semanal === null ||
    frecuencia_uso_semanal < 0
  ) {
    return {
      error:
        'La frecuencia de uso semanal debe ser un número entero mayor o igual a cero.',
    }
  }

  const codigo =
    construirCodigo(
      categoria,
      numero_ruta
    )

  return {
    datos: {
      categoria,
      numero_ruta,
      codigo,
      descripcion,
      kilometros,
      frecuencia_uso_semanal,
      observaciones,
    },
  }
}

function esErrorDuplicado(error) {
  return (
    error?.code === '23505' ||
    String(
      error?.message || ''
    )
      .toLowerCase()
      .includes('duplicate')
  )
}

// =========================================================
// GET
// =========================================================
// Lista las rutas del CEA.
//
// Query opcional:
//   ?nit=...
//   &estado=TODAS | ACTIVAS | INACTIVAS
//   &categoria=A2
// =========================================================

export async function GET(request) {
  try {
    const {
      nit,
      empresa,
      supabaseAdmin,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request
      )

    const url =
      new URL(
        request.url
      )

    const estado =
      normalizarMayusculas(
        url.searchParams.get(
          'estado'
        ) || 'TODAS'
      )

    const categoria =
      normalizarMayusculas(
        url.searchParams.get(
          'categoria'
        )
      )

    let consulta =
      supabaseAdmin
        .from('sinst_rutas')
        .select(
          `
            id,
            categoria,
            numero_ruta,
            codigo,
            descripcion,
            kilometros,
            frecuencia_uso_semanal,
            activo,
            observaciones,
            creado_por,
            created_at,
            updated_at
          `
        )
        .order(
          'categoria',
          {
            ascending: true,
          }
        )
        .order(
          'codigo',
          {
            ascending: true,
          }
        )

    if (estado === 'ACTIVAS') {
      consulta =
        consulta.eq(
          'activo',
          true
        )
    }

    if (estado === 'INACTIVAS') {
      consulta =
        consulta.eq(
          'activo',
          false
        )
    }

    if (categoria) {
      consulta =
        consulta.eq(
          'categoria',
          categoria
        )
    }

    const {
      data,
      error,
    } = await consulta

    if (error) {
      throw error
    }

    return NextResponse.json({
      ok: true,

      empresa:
        construirEmpresaRespuesta(
          nit,
          empresa
        ),

      rutas:
        Array.isArray(data)
          ? data
          : [],
    })
  } catch (error) {
    console.error(
      'GET /api/admin/sinst-vigia/rutas:',
      error
    )

    return responderErrorEmpresa(
      error
    )
  }
}

// =========================================================
// POST
// =========================================================
// Crea una nueva ruta.
//
// El código NO se recibe como dato libre.
// Se construye en servidor:
//   categoria + "-" + numero_ruta
//
// Ejemplo:
//   A2 + 001 = A2-001
// =========================================================

export async function POST(request) {
  let body = null

  try {
    body =
      await request.json()

    const {
      nit,
      empresa,
      supabaseAdmin,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    const validacion =
      validarDatosRuta(
        body
      )

    if (validacion.error) {
      return responderError(
        validacion.error
      )
    }

    const usuario =
      obtenerUsuarioRequest(
        request,
        body
      )

    const registro = {
      ...validacion.datos,
      activo: true,
      creado_por: usuario,
      updated_at:
        new Date().toISOString(),
    }

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from('sinst_rutas')
        .insert(registro)
        .select(
          `
            id,
            categoria,
            numero_ruta,
            codigo,
            descripcion,
            kilometros,
            frecuencia_uso_semanal,
            activo,
            observaciones,
            creado_por,
            created_at,
            updated_at
          `
        )
        .single()

    if (error) {
      if (
        esErrorDuplicado(
          error
        )
      ) {
        return responderError(
          `Ya existe una ruta con el código ${registro.codigo}.`,
          409
        )
      }

      throw error
    }

    return NextResponse.json(
      {
        ok: true,
        mensaje:
          'Ruta creada correctamente.',

        empresa:
          construirEmpresaRespuesta(
            nit,
            empresa
          ),

        ruta: data,
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(
      'POST /api/admin/sinst-vigia/rutas:',
      error
    )

    return responderErrorEmpresa(
      error
    )
  }
}

// =========================================================
// PUT
// =========================================================
// Edita los datos de una ruta existente.
//
// Body:
//   id
//   categoria
//   numero_ruta
//   descripcion
//   kilometros
//   frecuencia_uso_semanal
//   observaciones
//
// El estado activo/inactivo se administra con PATCH.
// =========================================================

export async function PUT(request) {
  let body = null

  try {
    body =
      await request.json()

    const {
      nit,
      empresa,
      supabaseAdmin,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    const id =
      numeroEntero(
        body?.id
      )

    if (
      id === null ||
      id <= 0
    ) {
      return responderError(
        'No se recibió un identificador de ruta válido.'
      )
    }

    const validacion =
      validarDatosRuta(
        body
      )

    if (validacion.error) {
      return responderError(
        validacion.error
      )
    }

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from('sinst_rutas')
        .update({
          ...validacion.datos,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          id
        )
        .select(
          `
            id,
            categoria,
            numero_ruta,
            codigo,
            descripcion,
            kilometros,
            frecuencia_uso_semanal,
            activo,
            observaciones,
            creado_por,
            created_at,
            updated_at
          `
        )
        .maybeSingle()

    if (error) {
      if (
        esErrorDuplicado(
          error
        )
      ) {
        return responderError(
          `Ya existe una ruta con el código ${validacion.datos.codigo}.`,
          409
        )
      }

      throw error
    }

    if (!data) {
      return responderError(
        'La ruta que intenta editar no existe.',
        404
      )
    }

    return NextResponse.json({
      ok: true,
      mensaje:
        'Ruta actualizada correctamente.',

      empresa:
        construirEmpresaRespuesta(
          nit,
          empresa
        ),

      ruta: data,
    })
  } catch (error) {
    console.error(
      'PUT /api/admin/sinst-vigia/rutas:',
      error
    )

    return responderErrorEmpresa(
      error
    )
  }
}

// =========================================================
// PATCH
// =========================================================
// Activa o inactiva una ruta.
//
// Body:
//   id
//   activo
//
// No se elimina físicamente la ruta para conservar
// trazabilidad de los recorridos utilizados.
// =========================================================

export async function PATCH(request) {
  let body = null

  try {
    body =
      await request.json()

    const {
      nit,
      empresa,
      supabaseAdmin,
    } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    const id =
      numeroEntero(
        body?.id
      )

    if (
      id === null ||
      id <= 0
    ) {
      return responderError(
        'No se recibió un identificador de ruta válido.'
      )
    }

    if (
      typeof body?.activo !==
      'boolean'
    ) {
      return responderError(
        'Debe indicar el estado activo de la ruta.'
      )
    }

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from('sinst_rutas')
        .update({
          activo:
            body.activo,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          id
        )
        .select(
          `
            id,
            categoria,
            numero_ruta,
            codigo,
            descripcion,
            kilometros,
            frecuencia_uso_semanal,
            activo,
            observaciones,
            creado_por,
            created_at,
            updated_at
          `
        )
        .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return responderError(
        'La ruta que intenta actualizar no existe.',
        404
      )
    }

    return NextResponse.json({
      ok: true,

      mensaje:
        body.activo
          ? 'Ruta activada correctamente.'
          : 'Ruta inactivada correctamente.',

      empresa:
        construirEmpresaRespuesta(
          nit,
          empresa
        ),

      ruta: data,
    })
  } catch (error) {
    console.error(
      'PATCH /api/admin/sinst-vigia/rutas:',
      error
    )

    return responderErrorEmpresa(
      error
    )
  }
}
