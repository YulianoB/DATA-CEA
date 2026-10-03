// app/api/admin/inscripciones/aprendices/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// =========================================================
// CONSTANTES
// =========================================================

const CATS_VALIDAS_GENERALES = new Set([
  'A2',
  'B1',
  'C1',
  'RC1',
  'C2',
  'C3',
])

const ORIGENES_MATRICULA = new Set([
  'DIRECTO',
  'CONVENIO',
])

const LIMITE_CONSULTA = 100

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
// HELPERS GENERALES
// =========================================================

function normalizarTexto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}

function normalizarMayusculas(
  valor
) {
  return normalizarTexto(
    valor
  ).toUpperCase()
}

function normalizarCorreo(
  valor
) {
  return normalizarTexto(
    valor
  ).toLowerCase()
}

function limpiarBusqueda(
  valor
) {
  return normalizarTexto(
    valor
  ).replace(
    /[%_]/g,
    ''
  )
}

function fechaValida(
  valor
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    normalizarTexto(
      valor
    )
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

function toIntOrNull(
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
    )
  ) {
    return null
  }

  return Math.trunc(
    numero
  )
}

function toNumeroPositivoOrNull(
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
// EMPRESA / NIVEL CEA
// =========================================================

function construirEmpresaRespuesta(
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
        empresa
          ?.categorias_habilitadas
      )
        ? empresa
            .categorias_habilitadas
        : [],
  }
}

function obtenerCategoriasHabilitadasEmpresa(
  empresa
) {
  return (
    Array.isArray(
      empresa
        ?.categorias_habilitadas
    )
      ? empresa
          .categorias_habilitadas
      : []
  )
    .map(
      categoria =>
        normalizarMayusculas(
          categoria
        )
    )
    .filter(
      categoria =>
        CATS_VALIDAS_GENERALES.has(
          categoria
        )
    )
}

function validarCategoriasPorNivel(
  categorias,
  empresa
) {
  const habilitadas =
    obtenerCategoriasHabilitadasEmpresa(
      empresa
    )

  if (
    habilitadas.length ===
    0
  ) {
    return {
      ok:
        false,

      message:
        'El CEA no tiene categorías habilitadas configuradas en la base MASTER.',
    }
  }

  const noPermitidas =
    categorias.filter(
      categoria =>
        !habilitadas.includes(
          categoria
        )
    )

  if (
    noPermitidas.length >
    0
  ) {
    return {
      ok:
        false,

      message:
        noPermitidas.length ===
        1
          ? `La categoría ${noPermitidas[0]} no está autorizada para ${empresa?.nivel_cea || 'el nivel actual del CEA'}.`
          : `Las categorías ${noPermitidas.join(', ')} no están autorizadas para ${empresa?.nivel_cea || 'el nivel actual del CEA'}.`,
    }
  }

  return {
    ok:
      true,

    habilitadas,
  }
}

// =========================================================
// CATEGORÍAS
// =========================================================

function limpiarCategorias(
  valor
) {
  if (
    !Array.isArray(
      valor
    )
  ) {
    return []
  }

  const salida = []

  for (
    const item of
      valor
  ) {
    const categoria =
      normalizarMayusculas(
        item
      )

    if (
      CATS_VALIDAS_GENERALES.has(
        categoria
      ) &&
      !salida.includes(
        categoria
      )
    ) {
      salida.push(
        categoria
      )
    }
  }

  return salida
}

function obtenerCategoriaRegistro(
  registro
) {
  if (
    Array.isArray(
      registro?.categorias
    ) &&
    registro.categorias.length >
      0
  ) {
    return normalizarMayusculas(
      registro.categorias[0]
    )
  }

  if (
    registro?.categoria
  ) {
    return normalizarMayusculas(
      registro.categoria
    )
  }

  return ''
}

// =========================================================
// ESTADO MATRÍCULA
// =========================================================

function esMatriculaFinalizada(
  estado
) {
  const valor =
    normalizarMayusculas(
      estado
    )

  return [
    'CERTIFICADO',
    'FINALIZADO',
    'CERRADO',
    'RETIRADO',
    'CANCELADO',
  ].includes(
    valor
  )
}

// =========================================================
// ORIGEN MATRÍCULA
// =========================================================

function normalizarOrigenMatricula(
  valor
) {
  const origen =
    normalizarMayusculas(
      valor
    ) ||
    'DIRECTO'

  if (
    !ORIGENES_MATRICULA.has(
      origen
    )
  ) {
    return ''
  }

  return origen
}

// =========================================================
// CONVENIOS
// =========================================================

async function obtenerConvenios(
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
// RESOLVER CONVENIO
// =========================================================

async function resolverConvenioSeleccionado(
  supabase,
  body,
  origenMatricula
) {
  if (
    origenMatricula ===
    'DIRECTO'
  ) {
    return {
      id:
        null,

      nombre:
        '',

      documento:
        '',

      celular:
        '',

      direccion:
        '',

      correo:
        '',
    }
  }

  const convenioId =
    toIntOrNull(
      body?.convenio_id
    )

  if (
    !convenioId
  ) {
    throw new Error(
      'Debe seleccionar un convenio para una matrícula de origen CONVENIO.'
    )
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
        convenioId
      )
      .maybeSingle()

  if (
    error
  ) {
    throw new Error(
      `No fue posible validar el convenio: ${error.message}`
    )
  }

  if (
    !data
  ) {
    throw new Error(
      'El convenio seleccionado no existe.'
    )
  }

  if (
    data.activo !==
    true
  ) {
    throw new Error(
      'El convenio seleccionado se encuentra inactivo.'
    )
  }

  return {
    id:
      data.id,

    nombre:
      normalizarMayusculas(
        data.nombre
      ),

    documento:
      data.documento ||
      '',

    celular:
      data.celular ||
      '',

    direccion:
      data.direccion ||
      '',

    correo:
      data.correo ||
      '',
  }
}

// =========================================================
// CREAR CONVENIO RÁPIDO
// =========================================================

async function crearConvenioRapido(
  supabase,
  body
) {
  const nombre =
    normalizarMayusculas(
      body?.nombre
    )

  if (
    !nombre
  ) {
    const error =
      new Error(
        'El nombre del convenio es obligatorio.'
      )

    error.status =
      400

    throw error
  }

  const {
    data:
      existentes,

    error:
      errorExistentes,
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
      .ilike(
        'nombre',
        nombre
      )
      .limit(
        1
      )

  if (
    errorExistentes
  ) {
    throw new Error(
      `No fue posible validar el convenio: ${errorExistentes.message}`
    )
  }

  if (
    Array.isArray(
      existentes
    ) &&
    existentes.length >
      0
  ) {
    const existente =
      existentes[0]

    if (
      existente.activo ===
      true
    ) {
      const error =
        new Error(
          `Ya existe el convenio ${normalizarMayusculas(
            existente.nombre
          )}.`
        )

      error.status =
        409

      error.data =
        existente

      throw error
    }

    const {
      data,
      error,
    } =
      await supabase
        .from(
          'convenios'
        )
        .update({
          documento:
            normalizarTexto(
              body?.documento
            ) ||
            existente.documento ||
            null,

          celular:
            normalizarTexto(
              body?.celular
            ) ||
            existente.celular ||
            null,

          direccion:
            normalizarMayusculas(
              body?.direccion
            ) ||
            existente.direccion ||
            null,

          correo:
            normalizarCorreo(
              body?.correo
            ) ||
            existente.correo ||
            null,

          activo:
            true,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          'id',
          existente.id
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
        .single()

    if (
      error
    ) {
      throw new Error(
        `No fue posible reactivar el convenio: ${error.message}`
      )
    }

    return data
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'convenios'
      )
      .insert({
        nombre,

        documento:
          normalizarTexto(
            body?.documento
          ) ||
          null,

        celular:
          normalizarTexto(
            body?.celular
          ) ||
          null,

        direccion:
          normalizarMayusculas(
            body?.direccion
          ) ||
          null,

        correo:
          normalizarCorreo(
            body?.correo
          ) ||
          null,

        activo:
          true,
      })
      .select(`
        id,
        nombre,
        documento,
        celular,
        direccion,
        correo,
        activo
      `)
      .single()

  if (
    error
  ) {
    throw new Error(
      `No fue posible crear el convenio: ${error.message}`
    )
  }

  return data
}

// =========================================================
// HISTORIAL
// =========================================================

async function obtenerHistorial(
  supabase,
  documento
) {
  const documentoNormalizado =
    normalizarTexto(
      documento
    )

  if (
    !documentoNormalizado
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
      .select('*')
      .eq(
        'documento',
        documentoNormalizado
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar el historial del aprendiz: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// CONSULTA GENERAL
// =========================================================

async function consultarAprendices({
  supabase,
  busqueda = '',
  fechaInicio = '',
  fechaFin = '',
}) {
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

  const termino =
    limpiarBusqueda(
      busqueda
    )

  if (
    termino
  ) {
    const categoria =
      termino.toUpperCase()

    if (
      CATS_VALIDAS_GENERALES.has(
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
      `No fue posible consultar las matrículas: ${error.message}`
    )
  }

  const registros =
    Array.isArray(
      data
    )
      ? data
      : []

  return registros.map(
    registro => ({
      ...registro,

      nombre_completo:
        [
          registro.nombres,
          registro.apellidos,
        ]
          .filter(
            Boolean
          )
          .join(
            ' '
          )
          .trim(),

      categoria:
        obtenerCategoriaRegistro(
          registro
        ),
    })
  )
}

// =========================================================
// RESUMEN DE MATRÍCULAS POR CATEGORÍA
// =========================================================

async function obtenerResumenMatriculas({
  supabase,
  fechaInicio,
  fechaFin,
}) {
  let consulta =
    supabase
      .from(
        'aprendices'
      )
      .select(
        'categorias'
      )

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

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar el resumen de matrículas: ${error.message}`
    )
  }

  const conteos = {}

  for (
    const registro of
      (
        Array.isArray(
          data
        )
          ? data
          : []
      )
  ) {
    const categorias =
      limpiarCategorias(
        registro?.categorias
      )

    for (
      const categoria of
        categorias
    ) {
      conteos[categoria] =
        (
          conteos[categoria] ||
          0
        ) + 1
    }
  }

  return conteos
}

// =========================================================
// CONTROLES EXTERNOS PARA EXPEDIENTE
// =========================================================

async function obtenerControlesRuntExpediente(
  supabase,
  matriculaIds
) {
  if (
    !Array.isArray(
      matriculaIds
    ) ||
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
        'control_runt'
      )
      .select(`
        id,
        matricula_id,
        numero_proceso,
        estado_verificacion,
        resultado_verificacion,
        fecha_verificacion,
        usuario_verificacion,
        estado_registro,
        fecha_registro,
        estado_certificacion,
        fecha_certificacion,
        categoria,
        created_at
      `)
      .in(
        'matricula_id',
        matriculaIds
      )
      .order(
        'numero_proceso',
        {
          ascending:
            false,
        }
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      )

  if (
    error
  ) {
    console.error(
      'Error consultando Control RUNT para expediente:',
      error
    )

    return []
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

async function obtenerControlesSicovExpediente(
  supabase,
  matriculaIds
) {
  if (
    !Array.isArray(
      matriculaIds
    ) ||
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
        'control_sicov'
      )
      .select(`
        id,
        matricula_id,
        categoria,
        estado_registro,
        fecha_registro,
        usuario_registro,
        estado_certificacion,
        fecha_certificacion,
        usuario_certificacion,
        observaciones,
        created_at
      `)
      .in(
        'matricula_id',
        matriculaIds
      )

  if (
    error
  ) {
    console.error(
      'Error consultando Control SICOV para expediente:',
      error
    )

    return []
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

async function obtenerControlesSietExpediente(
  supabase,
  matriculaIds
) {
  if (
    !Array.isArray(
      matriculaIds
    ) ||
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
        'control_siet'
      )
      .select(`
        id,
        matricula_id,
        consecutivo,
        documento,
        categoria,
        estado,
        fecha_registro,
        usuario_registro,
        fecha_certificacion,
        usuario_certificacion,
        observaciones,
        created_at
      `)
      .in(
        'matricula_id',
        matriculaIds
      )

  if (
    error
  ) {
    console.error(
      'Error consultando Control SIET para expediente:',
      error
    )

    return []
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// MAPAS
// =========================================================

function construirMapaRuntActual(
  controles
) {
  const mapa =
    new Map()

  for (
    const control of
      (
        Array.isArray(
          controles
        )
          ? controles
          : []
      )
  ) {
    const key =
      String(
        control.matricula_id
      )

    const existente =
      mapa.get(
        key
      )

    if (
      !existente
    ) {
      mapa.set(
        key,
        control
      )

      continue
    }

    const proceso =
      Number(
        control.numero_proceso ||
        1
      )

    const procesoExistente =
      Number(
        existente.numero_proceso ||
        1
      )

    if (
      proceso >
      procesoExistente
    ) {
      mapa.set(
        key,
        control
      )
    }
  }

  return mapa
}

function construirMapaSicov(
  controles
) {
  return new Map(
    (
      Array.isArray(
        controles
      )
        ? controles
        : []
    ).map(
      control => [
        String(
          control.matricula_id
        ),
        control,
      ]
    )
  )
}

function construirMapaSiet(
  controles
) {
  return new Map(
    (
      Array.isArray(
        controles
      )
        ? controles
        : []
    ).map(
      control => [
        String(
          control.matricula_id
        ),
        control,
      ]
    )
  )
}

// =========================================================
// CONSTRUIR EXPEDIENTE
// =========================================================

async function construirExpediente(
  supabase,
  historial
) {
  const registros =
    Array.isArray(
      historial
    )
      ? historial
      : []

  if (
    registros.length ===
    0
  ) {
    return {
      aprendiz:
        null,

      procesos_activos:
        [],

      historial_finalizado:
        [],

      matriculas:
        [],

      total_matriculas:
        0,
    }
  }

  const ultimo =
    registros[0]

  const aprendiz = {
    tipo_doc:
      ultimo?.tipo_doc ||
      '',

    documento:
      ultimo?.documento ||
      '',

    lugar_expedicion:
      ultimo?.lugar_expedicion ||
      '',

    genero:
      ultimo?.genero ||
      '',

    nombres:
      ultimo?.nombres ||
      '',

    apellidos:
      ultimo?.apellidos ||
      '',

    nombre_completo:
      [
        ultimo?.nombres,
        ultimo?.apellidos,
      ]
        .filter(
          Boolean
        )
        .join(
          ' '
        )
        .trim(),

    fecha_nacimiento:
      ultimo?.fecha_nacimiento ||
      '',

    celular:
      ultimo?.celular ||
      '',

    correo:
      ultimo?.correo ||
      '',

    direccion:
      ultimo?.direccion ||
      '',

    barrio:
      ultimo?.barrio ||
      '',

    ciudad:
      ultimo?.ciudad ||
      '',

    estado_civil:
      ultimo?.estado_civil ||
      '',

    ocupacion:
      ultimo?.ocupacion ||
      '',

    eps:
      ultimo?.eps ||
      '',

    estrato:
      ultimo?.estrato ??
      '',

    nivel_educativo:
      ultimo?.nivel_educativo ||
      '',

    acudi_nombres:
      ultimo?.acudi_nombres ||
      '',

    acudi_apellidos:
      ultimo?.acudi_apellidos ||
      '',

    acudi_tipo_doc:
      ultimo?.acudi_tipo_doc ||
      '',

    acudi_documento:
      ultimo?.acudi_documento ||
      '',

    acudi_celular:
      ultimo?.acudi_celular ||
      '',

    acudi_direccion:
      ultimo?.acudi_direccion ||
      '',

    acudi_correo:
      ultimo?.acudi_correo ||
      '',

    emergencia_nombre:
      ultimo?.emergencia_nombre ||
      '',

    emergencia_celular:
      ultimo?.emergencia_celular ||
      '',
  }

  const matriculaIds =
    registros
      .map(
        registro =>
          registro.id
      )
      .filter(
        Boolean
      )

  const [
    controlesRunt,
    controlesSicov,
    controlesSiet,
  ] =
    await Promise.all([
      obtenerControlesRuntExpediente(
        supabase,
        matriculaIds
      ),

      obtenerControlesSicovExpediente(
        supabase,
        matriculaIds
      ),

      obtenerControlesSietExpediente(
        supabase,
        matriculaIds
      ),
    ])

  const mapaRunt =
    construirMapaRuntActual(
      controlesRunt
    )

  const mapaSicov =
    construirMapaSicov(
      controlesSicov
    )

  const mapaSiet =
    construirMapaSiet(
      controlesSiet
    )

  const matriculas =
    registros.map(
      registro => {
        const runt =
          mapaRunt.get(
            String(
              registro.id
            )
          ) ||
          null

        const sicov =
          mapaSicov.get(
            String(
              registro.id
            )
          ) ||
          null

        const siet =
          mapaSiet.get(
            String(
              registro.id
            )
          ) ||
          null

        return {
          id:
            registro.id,

          consecutivo:
            registro.consecutivo ||
            '',

          fecha_matricula:
            registro.fecha_matricula ||
            '',

          categoria:
            obtenerCategoriaRegistro(
              registro
            ),

          categorias:
            Array.isArray(
              registro?.categorias
            )
              ? registro.categorias
              : [],

          origen_matricula:
            normalizarMayusculas(
              registro.origen_matricula
            ) ||
            'DIRECTO',

          convenio_id:
            registro.convenio_id ??
            null,

          convenio:
            registro.convenio ||
            '',

          estado:
            registro.estado ||
            '',

          created_at:
            registro.created_at ||
            '',

          finalizada:
            esMatriculaFinalizada(
              registro.estado
            ),

          control_runt:
            runt
              ? {
                  id:
                    runt.id,

                  numero_proceso:
                    runt.numero_proceso ||
                    1,

                  estado_verificacion:
                    runt.estado_verificacion ||
                    'PENDIENTE',

                  resultado_verificacion:
                    runt.resultado_verificacion ||
                    'PENDIENTE',

                  fecha_verificacion:
                    runt.fecha_verificacion ||
                    null,

                  usuario_verificacion:
                    runt.usuario_verificacion ||
                    null,

                  estado_registro:
                    runt.estado_registro ||
                    'PENDIENTE',

                  fecha_registro:
                    runt.fecha_registro ||
                    null,

                  estado_certificacion:
                    runt.estado_certificacion ||
                    'PENDIENTE',

                  fecha_certificacion:
                    runt.fecha_certificacion ||
                    null,
                }
              : null,

          control_sicov:
            sicov
              ? {
                  id:
                    sicov.id,

                  estado_registro:
                    sicov.estado_registro ||
                    'PENDIENTE',

                  fecha_registro:
                    sicov.fecha_registro ||
                    null,

                  usuario_registro:
                    sicov.usuario_registro ||
                    null,

                  estado_certificacion:
                    sicov.estado_certificacion ||
                    'PENDIENTE',

                  fecha_certificacion:
                    sicov.fecha_certificacion ||
                    null,

                  usuario_certificacion:
                    sicov.usuario_certificacion ||
                    null,
                }
              : null,

          control_siet:
            siet
              ? {
                  id:
                    siet.id,

                  estado:
                    siet.estado ||
                    'PENDIENTE',

                  fecha_registro:
                    siet.fecha_registro ||
                    null,

                  usuario_registro:
                    siet.usuario_registro ||
                    null,

                  fecha_certificacion:
                    siet.fecha_certificacion ||
                    null,

                  usuario_certificacion:
                    siet.usuario_certificacion ||
                    null,

                  observaciones:
                    siet.observaciones ||
                    null,
                }
              : null,
        }
      }
    )

  return {
    aprendiz,

    procesos_activos:
      matriculas.filter(
        matricula =>
          !matricula.finalizada
      ),

    historial_finalizado:
      matriculas.filter(
        matricula =>
          matricula.finalizada
      ),

    matriculas,

    total_matriculas:
      matriculas.length,
  }
}

// =========================================================
// VALIDAR OBLIGATORIOS
// =========================================================

function validarObligatorios(
  body
) {
  const obligatorios = [
    'tipo_doc',
    'documento',
    'nombres',
    'apellidos',
    'fecha_nacimiento',
    'genero',
  ]

  return obligatorios.filter(
    campo =>
      !normalizarTexto(
        body?.[campo]
      )
  )
}

// =========================================================
// PAYLOAD BASE APRENDIZ
// =========================================================

function construirPayloadBase(
  body,
  {
    origenMatricula,
    convenioSeleccionado,
  }
) {
  return {
    tipo_doc:
      normalizarMayusculas(
        body.tipo_doc
      ),

    documento:
      normalizarTexto(
        body.documento
      ),

    lugar_expedicion:
      normalizarMayusculas(
        body.lugar_expedicion
      ),

    genero:
      normalizarMayusculas(
        body.genero
      ),

    nombres:
      normalizarMayusculas(
        body.nombres
      ),

    apellidos:
      normalizarMayusculas(
        body.apellidos
      ),

    fecha_nacimiento:
      body.fecha_nacimiento ||
      null,

    celular:
      normalizarTexto(
        body.celular
      ),

    correo:
      normalizarCorreo(
        body.correo
      ),

    direccion:
      normalizarMayusculas(
        body.direccion
      ),

    barrio:
      normalizarMayusculas(
        body.barrio
      ),

    ciudad:
      normalizarMayusculas(
        body.ciudad
      ),

    estado_civil:
      normalizarMayusculas(
        body.estado_civil
      ),

    ocupacion:
      normalizarMayusculas(
        body.ocupacion
      ),

    eps:
      normalizarMayusculas(
        body.eps
      ),

    estrato:
      toIntOrNull(
        body.estrato
      ),

    nivel_educativo:
      normalizarMayusculas(
        body.nivel_educativo
      ),

    origen_matricula:
      origenMatricula,

    convenio_id:
      origenMatricula ===
      'CONVENIO'
        ? convenioSeleccionado
            ?.id ||
          null
        : null,

    // =====================================================
    // TEMPORAL
    // Se conserva mientras otras pantallas usan esta columna.
    // =====================================================

    convenio:
      origenMatricula ===
      'CONVENIO'
        ? convenioSeleccionado
            ?.nombre ||
          ''
        : '',

    acudi_nombres:
      normalizarMayusculas(
        body.acudi_nombres
      ),

    acudi_apellidos:
      normalizarMayusculas(
        body.acudi_apellidos
      ),

    acudi_tipo_doc:
      normalizarMayusculas(
        body.acudi_tipo_doc
      ),

    acudi_documento:
      normalizarTexto(
        body.acudi_documento
      ),

    acudi_celular:
      normalizarTexto(
        body.acudi_celular
      ),

    acudi_direccion:
      normalizarMayusculas(
        body.acudi_direccion
      ),

    acudi_correo:
      normalizarCorreo(
        body.acudi_correo
      ),

    emergencia_nombre:
      normalizarMayusculas(
        body.emergencia_nombre
      ),

    emergencia_celular:
      normalizarTexto(
        body.emergencia_celular
      ),

    estado:
      'ACTIVO',
  }
}

// =========================================================
// INFORMACIÓN FINANCIERA
// =========================================================
//
// IMPORTANTE:
//
// Ya NO existe categoria_examen_medico.
//
// 1 categoría:
//
// CURSO A2
// EXAMEN MEDICO A2
//
// 2 categorías:
//
// CURSO A2
// CURSO C1
// EXAMEN MEDICO A2 + C1
//
// El examen tiene UN ÚNICO valor.
// =========================================================

function validarInformacionFinanciera(
  body,
  categorias
) {
  const valoresCurso =
    Array.isArray(
      body?.valores_curso
    )
      ? body.valores_curso
      : []

  const mapaValores =
    new Map()

  for (
    const item of
      valoresCurso
  ) {
    const categoria =
      normalizarMayusculas(
        item?.categoria
      )

    const valor =
      toNumeroPositivoOrNull(
        item?.valor
      )

    if (
      CATS_VALIDAS_GENERALES.has(
        categoria
      ) &&
      valor !== null
    ) {
      mapaValores.set(
        categoria,
        valor
      )
    }
  }

  for (
    const categoria of
      categorias
  ) {
    if (
      !mapaValores.has(
        categoria
      )
    ) {
      return {
        ok:
          false,

        message:
          `Debe indicar un valor válido para el curso categoría ${categoria}.`,
      }
    }
  }

  const incluyeExamenMedico =
    body?.incluye_examen_medico ===
    true

  let valorExamenMedico =
    null

  if (
    incluyeExamenMedico
  ) {
    valorExamenMedico =
      toNumeroPositivoOrNull(
        body?.valor_examen_medico
      )

    if (
      valorExamenMedico ===
      null
    ) {
      return {
        ok:
          false,

        message:
          'Debe indicar un valor válido para el examen médico.',
      }
    }
  }

  let totalCursos =
    0

  for (
    const categoria of
      categorias
  ) {
    totalCursos +=
      Number(
        mapaValores.get(
          categoria
        ) ||
        0
      )
  }

  const valorTotal =
    totalCursos +
    (
      incluyeExamenMedico
        ? Number(
            valorExamenMedico ||
            0
          )
        : 0
    )

  return {
    ok:
      true,

    mapaValores,

    incluyeExamenMedico,

    valorExamenMedico,

    totalCursos,

    valorTotal,
  }
}

// =========================================================
// CREAR RUNT
// =========================================================

async function crearControlesRunt(
  supabase,
  matriculas,
  body
) {
  if (
    !Array.isArray(
      matriculas
    ) ||
    matriculas.length ===
      0
  ) {
    return []
  }

  const runtVerificado =
    body?.runt_verificado ===
      true ||
    normalizarMayusculas(
      body?.runt_estado_verificacion
    ) ===
      'VERIFICADO'

  const estadoVerificacion =
    runtVerificado
      ? 'VERIFICADO'
      : 'PENDIENTE'

  const resultadoVerificacion =
    runtVerificado
      ? normalizarMayusculas(
          body?.runt_resultado_verificacion
        ) ||
        null
      : null

  const usuarioVerificacion =
    runtVerificado
      ? normalizarTexto(
          body?.runt_usuario_verificacion
        ) ||
        null
      : null

  const fechaVerificacion =
    runtVerificado
      ? new Date()
          .toISOString()
      : null

  const controles =
    matriculas.map(
      matricula => ({
        matricula_id:
          matricula.id,

        consecutivo:
          normalizarTexto(
            matricula.consecutivo
          ),

        documento:
          normalizarTexto(
            matricula.documento
          ),

        categoria:
          obtenerCategoriaRegistro(
            matricula
          ),

        numero_proceso:
          1,

        control_runt_anterior_id:
          null,

        motivo_reproceso:
          null,

        fecha_reinicio:
          null,

        estado_verificacion:
          estadoVerificacion,

        resultado_verificacion:
          resultadoVerificacion,

        fecha_verificacion:
          fechaVerificacion,

        usuario_verificacion:
          usuarioVerificacion,

        estado_registro:
          'PENDIENTE',

        fecha_registro:
          null,

        usuario_registro:
          null,

        estado_certificacion:
          'PENDIENTE',

        fecha_certificacion:
          null,

        usuario_certificacion:
          null,

        observaciones:
          null,
      })
    )

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'control_runt'
      )
      .insert(
        controles
      )
      .select(`
        id,
        matricula_id,
        consecutivo,
        documento,
        categoria,
        numero_proceso,
        estado_verificacion,
        resultado_verificacion,
        fecha_verificacion,
        usuario_verificacion,
        estado_registro,
        estado_certificacion
      `)

  if (
    error
  ) {
    throw new Error(
      `No fue posible crear el Control RUNT: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// CREAR SICOV
// =========================================================

async function crearControlesSicov(
  supabase,
  matriculas
) {
  if (
    !Array.isArray(
      matriculas
    ) ||
    matriculas.length ===
      0
  ) {
    return []
  }

  const controles =
    matriculas.map(
      matricula => ({
        matricula_id:
          matricula.id,

        consecutivo:
          normalizarTexto(
            matricula.consecutivo
          ),

        documento:
          normalizarTexto(
            matricula.documento
          ),

        categoria:
          obtenerCategoriaRegistro(
            matricula
          ),

        estado_registro:
          'PENDIENTE',

        fecha_registro:
          null,

        usuario_registro:
          null,

        estado_certificacion:
          'PENDIENTE',

        fecha_certificacion:
          null,

        usuario_certificacion:
          null,

        observaciones:
          null,
      })
    )

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'control_sicov'
      )
      .insert(
        controles
      )
      .select(`
        id,
        matricula_id,
        consecutivo,
        documento,
        categoria,
        estado_registro,
        estado_certificacion
      `)

  if (
    error
  ) {
    throw new Error(
      `No fue posible crear el Control SICOV: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// CREAR SIET
// =========================================================

async function crearControlesSiet(
  supabase,
  matriculas
) {
  if (
    !Array.isArray(
      matriculas
    ) ||
    matriculas.length ===
      0
  ) {
    return []
  }

  const controles =
    matriculas.map(
      matricula => ({
        matricula_id:
          matricula.id,

        consecutivo:
          normalizarTexto(
            matricula.consecutivo
          ),

        documento:
          normalizarTexto(
            matricula.documento
          ),

        categoria:
          obtenerCategoriaRegistro(
            matricula
          ),

        estado:
          'PENDIENTE',

        fecha_registro:
          null,

        usuario_registro:
          null,

        fecha_certificacion:
          null,

        usuario_certificacion:
          null,

        observaciones:
          null,
      })
    )

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'control_siet'
      )
      .insert(
        controles
      )
      .select(`
        id,
        matricula_id,
        consecutivo,
        documento,
        categoria,
        estado,
        fecha_registro,
        usuario_registro,
        fecha_certificacion,
        usuario_certificacion
      `)

  if (
    error
  ) {
    throw new Error(
      `No fue posible crear el Control SIET: ${error.message}`
    )
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}

// =========================================================
// OBTENER CONCEPTO CAJA
// =========================================================

async function obtenerConceptoCaja(
  supabase,
  nombre
) {
  const nombreNormalizado =
    normalizarMayusculas(
      nombre
    )

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
        naturaleza,
        activo
      `)
      .ilike(
        'nombre',
        nombreNormalizado
      )
      .eq(
        'activo',
        true
      )
      .limit(
        1
      )

  if (
    error
  ) {
    throw new Error(
      `No fue posible consultar el concepto ${nombreNormalizado}: ${error.message}`
    )
  }

  const concepto =
    Array.isArray(
      data
    ) &&
    data.length >
      0
      ? data[0]
      : null

  if (
    !concepto
  ) {
    throw new Error(
      `No existe un concepto de Caja activo llamado ${nombreNormalizado}.`
    )
  }

  if (
    ![
      'INGRESO',
      'AMBOS',
    ].includes(
      normalizarMayusculas(
        concepto.naturaleza
      )
    )
  ) {
    throw new Error(
      `El concepto ${nombreNormalizado} no está configurado como ingreso.`
    )
  }

  return concepto
}

// =========================================================
// CREAR OBLIGACIÓN ÚNICA + DETALLES
// =========================================================

async function crearObligacionInicialCaja({
  supabase,
  matriculas,
  body,
  origenMatricula,
  convenioSeleccionado,
}) {
  if (
    !Array.isArray(
      matriculas
    ) ||
    matriculas.length ===
      0
  ) {
    throw new Error(
      'No existen matrículas para crear la obligación financiera.'
    )
  }

  const categorias =
    matriculas
      .map(
        matricula =>
          obtenerCategoriaRegistro(
            matricula
          )
      )
      .filter(
        Boolean
      )

  const validacion =
    validarInformacionFinanciera(
      body,
      categorias
    )

  if (
    !validacion.ok
  ) {
    throw new Error(
      validacion.message
    )
  }

  const conceptoCurso =
    await obtenerConceptoCaja(
      supabase,
      'CURSO'
    )

  let conceptoExamen =
    null

  if (
    validacion
      .incluyeExamenMedico
  ) {
    conceptoExamen =
      await obtenerConceptoCaja(
        supabase,
        'EXAMEN MEDICO'
      )
  }

  const documento =
    normalizarTexto(
      matriculas[0]
        ?.documento
    )

  const usuario =
    normalizarTexto(
      body?.usuario
    ) ||
    normalizarTexto(
      body?.runt_usuario_verificacion
    ) ||
    null

  const observaciones =
    normalizarTexto(
      body?.observaciones_financieras
    ) ||
    null

  const categoriasTexto =
    categorias.join(
      ' + '
    )

  const descripcionCuenta =
    categorias.length >
    0
      ? `OBLIGACIÓN MATRÍCULA ${categoriasTexto}`
      : 'OBLIGACIÓN DE MATRÍCULA'

  // =======================================================
  // CABECERA ÚNICA
  // =======================================================

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
        documento,

        convenio_id:
          origenMatricula ===
          'CONVENIO'
            ? convenioSeleccionado
                ?.id ||
              null
            : null,

        descripcion:
          descripcionCuenta,

        valor_total:
          validacion
            .valorTotal,

        estado:
          'PENDIENTE',

        origen_pago:
          origenMatricula ===
          'CONVENIO'
            ? 'CONVENIO'
            : 'DIRECTO',

        origen_matricula:
          origenMatricula,

        observaciones,

        creado_por:
          usuario,
      })
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
        created_at
      `)
      .single()

  if (
    errorCuenta
  ) {
    throw new Error(
      `No fue posible crear la obligación de Caja: ${errorCuenta.message}`
    )
  }

  if (
    !cuenta?.id
  ) {
    throw new Error(
      'No se obtuvo el identificador de la obligación creada.'
    )
  }

  // =======================================================
  // DETALLES
  // =======================================================

  const detalles = []

  // =======================================================
  // CURSO POR CATEGORÍA
  // =======================================================

  for (
    const matricula of
      matriculas
  ) {
    const categoria =
      obtenerCategoriaRegistro(
        matricula
      )

    const valor =
      validacion
        .mapaValores
        .get(
          categoria
        )

    if (
      !valor
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
        `No se encontró el valor financiero correspondiente a ${categoria}.`
      )
    }

    detalles.push({
      cuenta_id:
        cuenta.id,

      matricula_id:
        matricula.id,

      concepto_id:
        conceptoCurso.id,

      categorias: [
        categoria,
      ],

      descripcion:
        `CURSO CATEGORÍA ${categoria}`,

      valor,

      estado:
        'ACTIVO',

      creado_por:
        usuario,
    })
  }

  // =======================================================
  // EXAMEN MÉDICO
  // =======================================================
  //
  // Una categoría:
  // categorias = ['A2']
  // descripcion = EXAMEN MEDICO A2
  //
  // Dos categorías:
  // categorias = ['A2','C1']
  // descripcion = EXAMEN MEDICO A2 + C1
  //
  // UN SOLO VALOR.
  // =======================================================

  if (
    validacion
      .incluyeExamenMedico
  ) {
    detalles.push({
      cuenta_id:
        cuenta.id,

      // ===================================================
      // Se conserva la primera matrícula como referencia
      // técnica. Las categorías reales están en el arreglo.
      // ===================================================

      matricula_id:
        matriculas[0]
          ?.id ||
        null,

      concepto_id:
        conceptoExamen.id,

      categorias:
        categorias,

      descripcion:
        categorias.length >
        0
          ? `EXAMEN MEDICO ${categoriasTexto}`
          : 'EXAMEN MEDICO',

      valor:
        validacion
          .valorExamenMedico,

      estado:
        'ACTIVO',

      creado_por:
        usuario,
    })
  }

  const {
    data:
      detallesCreados,

    error:
      errorDetalles,
  } =
    await supabase
      .from(
        'cuentas_aprendiz_detalle'
      )
      .insert(
        detalles
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
        creado_por,
        created_at
      `)

  if (
    errorDetalles
  ) {
    const {
      error:
        errorEliminarCuenta,
    } =
      await supabase
        .from(
          'cuentas_aprendiz'
        )
        .delete()
        .eq(
          'id',
          cuenta.id
        )

    if (
      errorEliminarCuenta
    ) {
      console.error(
        'ERROR CRÍTICO eliminando obligación incompleta:',
        errorEliminarCuenta
      )
    }

    throw new Error(
      `No fue posible crear el detalle de la obligación: ${errorDetalles.message}`
    )
  }

  const listaDetalles =
    Array.isArray(
      detallesCreados
    )
      ? detallesCreados
      : []

  if (
    listaDetalles.length !==
    detalles.length
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
      'No se crearon correctamente todos los detalles de la obligación.'
    )
  }

  // =======================================================
  // VALIDAR SUMA
  // =======================================================

  const totalDetalles =
    listaDetalles.reduce(
      (
        total,
        detalle
      ) =>
        total +
        Number(
          detalle.valor ||
          0
        ),
      0
    )

  const diferencia =
    Math.abs(
      Number(
        cuenta.valor_total
      ) -
      totalDetalles
    )

  if (
    diferencia >
    0.01
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
      'El total de la obligación no coincide con la suma de sus detalles.'
    )
  }

  return {
    cuenta,

    detalles:
      listaDetalles,
  }
}

// =========================================================
// IDS MATRÍCULAS
// =========================================================

function obtenerIdsMatriculas(
  matriculas
) {
  return (
    Array.isArray(
      matriculas
    )
      ? matriculas
      : []
  )
    .map(
      matricula =>
        matricula?.id
    )
    .filter(
      id =>
        id !==
          null &&
        id !==
          undefined
    )
}

// =========================================================
// ROLLBACK OBLIGACIÓN CAJA
// =========================================================

async function rollbackObligacionesCaja(
  supabase,
  matriculas
) {
  const matriculaIds =
    obtenerIdsMatriculas(
      matriculas
    )

  if (
    matriculaIds.length ===
    0
  ) {
    return
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
        cuenta_id,
        matricula_id
      `)
      .in(
        'matricula_id',
        matriculaIds
      )

  if (
    error
  ) {
    console.error(
      'ERROR BUSCANDO OBLIGACIONES PARA ROLLBACK:',
      error
    )

    return
  }

  const cuentaIds =
    [
      ...new Set(
        (
          Array.isArray(
            data
          )
            ? data
            : []
        )
          .map(
            detalle =>
              detalle?.cuenta_id
          )
          .filter(
            id =>
              id !==
                null &&
              id !==
                undefined
          )
      ),
    ]

  if (
    cuentaIds.length ===
    0
  ) {
    return
  }

  const {
    error:
      errorDelete,
  } =
    await supabase
      .from(
        'cuentas_aprendiz'
      )
      .delete()
      .in(
        'id',
        cuentaIds
      )

  if (
    errorDelete
  ) {
    console.error(
      'ERROR ROLLBACK CUENTAS APRENDIZ:',
      errorDelete
    )
  }
}

async function rollbackControlesSiet(
  supabase,
  matriculas
) {
  const ids =
    obtenerIdsMatriculas(
      matriculas
    )

  if (
    ids.length ===
    0
  ) {
    return
  }

  const {
    error,
  } =
    await supabase
      .from(
        'control_siet'
      )
      .delete()
      .in(
        'matricula_id',
        ids
      )

  if (
    error
  ) {
    console.error(
      'ERROR ROLLBACK CONTROL SIET:',
      error
    )
  }
}

async function rollbackControlesSicov(
  supabase,
  matriculas
) {
  const ids =
    obtenerIdsMatriculas(
      matriculas
    )

  if (
    ids.length ===
    0
  ) {
    return
  }

  const {
    error,
  } =
    await supabase
      .from(
        'control_sicov'
      )
      .delete()
      .in(
        'matricula_id',
        ids
      )

  if (
    error
  ) {
    console.error(
      'ERROR ROLLBACK CONTROL SICOV:',
      error
    )
  }
}

async function rollbackControlesRunt(
  supabase,
  matriculas
) {
  const ids =
    obtenerIdsMatriculas(
      matriculas
    )

  if (
    ids.length ===
    0
  ) {
    return
  }

  const {
    error,
  } =
    await supabase
      .from(
        'control_runt'
      )
      .delete()
      .in(
        'matricula_id',
        ids
      )

  if (
    error
  ) {
    console.error(
      'ERROR ROLLBACK CONTROL RUNT:',
      error
    )
  }
}

async function rollbackMatriculas(
  supabase,
  matriculas
) {
  const ids =
    obtenerIdsMatriculas(
      matriculas
    )

  if (
    ids.length ===
    0
  ) {
    return
  }

  const {
    error,
  } =
    await supabase
      .from(
        'aprendices'
      )
      .delete()
      .in(
        'id',
        ids
      )

  if (
    error
  ) {
    console.error(
      'ERROR CRÍTICO: No se pudo realizar rollback de matrículas:',
      error
    )
  }
}

// =========================================================
// ROLLBACK COMPLETO
// =========================================================

async function rollbackProcesoMatricula(
  supabase,
  matriculas
) {
  if (
    !supabase ||
    !Array.isArray(
      matriculas
    ) ||
    matriculas.length ===
      0
  ) {
    return
  }

  await rollbackObligacionesCaja(
    supabase,
    matriculas
  )

  await rollbackControlesSiet(
    supabase,
    matriculas
  )

  await rollbackControlesSicov(
    supabase,
    matriculas
  )

  await rollbackControlesRunt(
    supabase,
    matriculas
  )

  await rollbackMatriculas(
    supabase,
    matriculas
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
      normalizarTexto(
        searchParams.get(
          'recurso'
        )
      ).toLowerCase()

    // =====================================================
    // CONVENIOS
    // =====================================================

    if (
      recurso ===
      'convenios'
    ) {
      const convenios =
        await obtenerConvenios(
          supabase
        )

      return NextResponse.json({
        status:
          'success',

        data:
          convenios,

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
      const documento =
        normalizarTexto(
          searchParams.get(
            'documento'
          )
        )

      if (
        !documento
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El documento es obligatorio.',
          },
          {
            status:
              400,
          }
        )
      }

      const historial =
        await obtenerHistorial(
          supabase,
          documento
        )

      return NextResponse.json({
        status:
          'success',

        data:
          historial,

        latest:
          historial.length >
          0
            ? historial[0]
            : null,

        total:
          historial.length,

        empresa:
          construirEmpresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // EXPEDIENTE
    // =====================================================

    if (
      recurso ===
      'expediente'
    ) {
      const documento =
        normalizarTexto(
          searchParams.get(
            'documento'
          )
        )

      if (
        !documento
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El documento es obligatorio para consultar el expediente.',
          },
          {
            status:
              400,
          }
        )
      }

      const historial =
        await obtenerHistorial(
          supabase,
          documento
        )

      if (
        historial.length ===
        0
      ) {
        return NextResponse.json(
          {
            status:
              'success',

            aprendiz:
              null,

            procesos_activos:
              [],

            historial_finalizado:
              [],

            matriculas:
              [],

            total_matriculas:
              0,

            message:
              'No se encontraron matrículas para este documento.',

            empresa:
              construirEmpresaRespuesta(
                empresa
              ),
          },
          {
            status:
              200,
          }
        )
      }

      const expediente =
        await construirExpediente(
          supabase,
          historial
        )

      return NextResponse.json({
        status:
          'success',

        ...expediente,

        empresa:
          construirEmpresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // RESUMEN POR CATEGORÍA
    // =====================================================

    if (
      recurso ===
      'resumen'
    ) {
      const fechaInicio =
        normalizarTexto(
          searchParams.get(
            'fecha_inicio'
          )
        )

      const fechaFin =
        normalizarTexto(
          searchParams.get(
            'fecha_fin'
          )
        )

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
              'El rango de fechas del resumen no es válido.',
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
        await obtenerResumenMatriculas({
          supabase,
          fechaInicio,
          fechaFin,
        })

      return NextResponse.json({
        status:
          'success',

        data:
          resumen,

        total:
          Object.values(
            resumen
          ).reduce(
            (
              acumulado,
              cantidad
            ) =>
              acumulado +
              cantidad,
            0
          ),

        filtros: {
          fecha_inicio:
            fechaInicio,

          fecha_fin:
            fechaFin,
        },

        empresa:
          construirEmpresaRespuesta(
            empresa
          ),
      })
    }

    // =====================================================
    // CONSULTAR
    // =====================================================

    if (
      recurso ===
      'consultar'
    ) {
      const q =
        normalizarTexto(
          searchParams.get(
            'q'
          )
        )

      const fechaInicio =
        normalizarTexto(
          searchParams.get(
            'fecha_inicio'
          )
        )

      const fechaFin =
        normalizarTexto(
          searchParams.get(
            'fecha_fin'
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
        !q &&
        !fechaInicio &&
        !fechaFin
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'Ingrese un criterio de búsqueda o seleccione un rango de fechas.',
          },
          {
            status:
              400,
          }
        )
      }

      const registros =
        await consultarAprendices({
          supabase,

          busqueda:
            q,

          fechaInicio,

          fechaFin,
        })

      return NextResponse.json({
        status:
          'success',

        data:
          registros,

        total:
          registros.length,

        limite:
          LIMITE_CONSULTA,

        filtros: {
          q,

          fecha_inicio:
            fechaInicio,

          fecha_fin:
            fechaFin,
        },

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
      'Error GET /api/admin/inscripciones/aprendices:',
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
  let supabase =
    null

  let matriculasCreadas =
    []

  try {
    const body =
      await request.json()

    // =====================================================
    // EMPRESA
    // =====================================================

    const resultadoEmpresa =
      await obtenerSupabaseAdminEmpresaDesdeRequest(
        request,
        body
      )

    supabase =
      resultadoEmpresa
        .supabaseAdmin

    const empresa =
      resultadoEmpresa
        .empresa

    // =====================================================
    // ACCIÓN
    // =====================================================

    const accion =
      normalizarTexto(
        body?.accion
      ).toLowerCase()

    // =====================================================
    // CREAR CONVENIO
    // =====================================================

    if (
      accion ===
      'crear_convenio'
    ) {
      try {
        const convenio =
          await crearConvenioRapido(
            supabase,
            body
          )

        return NextResponse.json(
          {
            status:
              'success',

            message:
              'Convenio creado correctamente.',

            data:
              convenio,

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
      } catch (
        errorConvenio
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              errorConvenio
                ?.message ||
              'No fue posible crear el convenio.',

            data:
              errorConvenio
                ?.data ||
              null,
          },
          {
            status:
              Number(
                errorConvenio
                  ?.status
              ) ||
              400,
          }
        )
      }
    }

    // =====================================================
    // OBLIGATORIOS
    // =====================================================

    const faltantes =
      validarObligatorios(
        body
      )

    if (
      faltantes.length >
      0
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            `Campos obligatorios faltantes: ${faltantes.join(', ')}`,
        },
        {
          status:
            400,
        }
      )
    }

    // =====================================================
    // DOCUMENTO
    // =====================================================

    const documento =
      normalizarTexto(
        body.documento
      )

    if (
      !/^\d+$/.test(
        documento
      )
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'El documento debe contener únicamente dígitos.',
        },
        {
          status:
            400,
        }
      )
    }

    // =====================================================
    // CATEGORÍAS SOLICITADAS
    // =====================================================

    const categorias =
      limpiarCategorias(
        body.categorias
      )

    if (
      categorias.length ===
      0
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'Debe seleccionar al menos una categoría.',
        },
        {
          status:
            400,
        }
      )
    }

    if (
      categorias.length >
      2
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'Solo se permiten máximo dos categorías por proceso de matrícula.',
        },
        {
          status:
            400,
        }
      )
    }

    // =====================================================
    // VALIDACIÓN REAL CONTRA NIVEL DEL CEA
    // =====================================================

    const validacionNivel =
      validarCategoriasPorNivel(
        categorias,
        empresa
      )

    if (
      !validacionNivel.ok
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            validacionNivel.message,

          nivel_cea:
            empresa?.nivel_cea ||
            '',

          categorias_habilitadas:
            obtenerCategoriasHabilitadasEmpresa(
              empresa
            ),
        },
        {
          status:
            400,
        }
      )
    }

    // =====================================================
    // ORIGEN
    // =====================================================

    const origenMatricula =
      normalizarOrigenMatricula(
        body?.origen_matricula
      )

    if (
      !origenMatricula
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            'El origen de matrícula no es válido. Use DIRECTO o CONVENIO.',
        },
        {
          status:
            400,
        }
      )
    }

    // =====================================================
    // INFORMACIÓN FINANCIERA
    // =====================================================

    const validacionFinanciera =
      validarInformacionFinanciera(
        body,
        categorias
      )

    if (
      !validacionFinanciera.ok
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            validacionFinanciera.message,
        },
        {
          status:
            400,
        }
      )
    }

    // =====================================================
    // RUNT
    // =====================================================

    const runtVerificado =
      body?.runt_verificado ===
        true ||
      normalizarMayusculas(
        body?.runt_estado_verificacion
      ) ===
        'VERIFICADO'

    if (
      runtVerificado
    ) {
      const resultadoRunt =
        normalizarMayusculas(
          body?.runt_resultado_verificacion
        )

      if (
        ![
          'INSCRITO',
          'NO INSCRITO',
        ].includes(
          resultadoRunt
        )
      ) {
        return NextResponse.json(
          {
            status:
              'error',

            message:
              'El resultado de la verificación RUNT no es válido.',
          },
          {
            status:
              400,
          }
        )
      }
    }

    // =====================================================
    // CONVENIO
    // =====================================================

    let convenioSeleccionado

    try {
      convenioSeleccionado =
        await resolverConvenioSeleccionado(
          supabase,
          body,
          origenMatricula
        )
    } catch (
      errorConvenio
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            errorConvenio
              ?.message ||
            'No fue posible validar el convenio.',
        },
        {
          status:
            400,
        }
      )
    }

    // =====================================================
    // HISTORIAL
    // =====================================================

    const historial =
      await obtenerHistorial(
        supabase,
        documento
      )

    // =====================================================
    // CATEGORÍAS YA EXISTENTES
    // =====================================================

    const categoriasExistentes =
      new Set()

    for (
      const registro of
        historial
    ) {
      const existentes =
        limpiarCategorias(
          registro
            ?.categorias
        )

      for (
        const categoria of
          existentes
      ) {
        categoriasExistentes.add(
          categoria
        )
      }
    }

    const repetidas =
      categorias.filter(
        categoria =>
          categoriasExistentes.has(
            categoria
          )
      )

    if (
      repetidas.length >
      0
    ) {
      return NextResponse.json(
        {
          status:
            'error',

          message:
            repetidas.length ===
            1
              ? `El aprendiz ya tiene registrada la categoría ${repetidas[0]}.`
              : `El aprendiz ya tiene registradas las categorías ${repetidas.join(', ')}.`,
        },
        {
          status:
            409,
        }
      )
    }

    // =====================================================
    // PAYLOAD
    // =====================================================

    const payloadBase =
      construirPayloadBase(
        body,
        {
          origenMatricula,

          convenioSeleccionado,
        }
      )

    const registros =
      categorias.map(
        categoria => ({
          ...payloadBase,

          categorias: [
            categoria,
          ],
        })
      )

    // =====================================================
    // CREAR MATRÍCULAS
    // =====================================================

    const {
      data:
        dataMatriculas,

      error:
        errorMatriculas,
    } =
      await supabase
        .from(
          'aprendices'
        )
        .insert(
          registros
        )
        .select(`
          id,
          consecutivo,
          fecha_matricula,
          documento,
          nombres,
          apellidos,
          categorias,
          estado,
          origen_matricula,
          convenio_id,
          convenio
        `)

    if (
      errorMatriculas
    ) {
      console.error(
        'Error insertando matrícula(s):',
        errorMatriculas
      )

      return NextResponse.json(
        {
          status:
            'error',

          message:
            `No fue posible crear la matrícula: ${errorMatriculas.message}`,
        },
        {
          status:
            400,
        }
      )
    }

    matriculasCreadas =
      Array.isArray(
        dataMatriculas
      )
        ? dataMatriculas
        : []

    if (
      matriculasCreadas.length !==
      registros.length
    ) {
      await rollbackProcesoMatricula(
        supabase,
        matriculasCreadas
      )

      return NextResponse.json(
        {
          status:
            'error',

          message:
            'No se crearon correctamente todas las matrículas solicitadas.',
        },
        {
          status:
            500,
        }
      )
    }

    // =====================================================
    // RUNT
    // =====================================================

    let controlesRunt =
      []

    try {
      controlesRunt =
        await crearControlesRunt(
          supabase,
          matriculasCreadas,
          body
        )
    } catch (
      errorRunt
    ) {
      console.error(
        'Error creando controles RUNT:',
        errorRunt
      )

      await rollbackProcesoMatricula(
        supabase,
        matriculasCreadas
      )

      return NextResponse.json(
        {
          status:
            'error',

          message:
            `La matrícula no pudo completarse porque falló la creación del Control RUNT: ${errorRunt.message}`,
        },
        {
          status:
            500,
        }
      )
    }

    if (
      controlesRunt.length !==
      matriculasCreadas.length
    ) {
      await rollbackProcesoMatricula(
        supabase,
        matriculasCreadas
      )

      return NextResponse.json(
        {
          status:
            'error',

          message:
            'No se pudieron crear correctamente todos los controles RUNT.',
        },
        {
          status:
            500,
        }
      )
    }

    // =====================================================
    // SICOV
    // =====================================================

    let controlesSicov =
      []

    try {
      controlesSicov =
        await crearControlesSicov(
          supabase,
          matriculasCreadas
        )
    } catch (
      errorSicov
    ) {
      console.error(
        'Error creando controles SICOV:',
        errorSicov
      )

      await rollbackProcesoMatricula(
        supabase,
        matriculasCreadas
      )

      return NextResponse.json(
        {
          status:
            'error',

          message:
            `La matrícula no pudo completarse porque falló la creación del Control SICOV: ${errorSicov.message}`,
        },
        {
          status:
            500,
        }
      )
    }

    if (
      controlesSicov.length !==
      matriculasCreadas.length
    ) {
      await rollbackProcesoMatricula(
        supabase,
        matriculasCreadas
      )

      return NextResponse.json(
        {
          status:
            'error',

          message:
            'No se pudieron crear correctamente todos los controles SICOV.',
        },
        {
          status:
            500,
        }
      )
    }

    // =====================================================
    // SIET
    // =====================================================

    let controlesSiet =
      []

    try {
      controlesSiet =
        await crearControlesSiet(
          supabase,
          matriculasCreadas
        )
    } catch (
      errorSiet
    ) {
      console.error(
        'Error creando controles SIET:',
        errorSiet
      )

      await rollbackProcesoMatricula(
        supabase,
        matriculasCreadas
      )

      return NextResponse.json(
        {
          status:
            'error',

          message:
            `La matrícula no pudo completarse porque falló la creación del Control SIET: ${errorSiet.message}`,
        },
        {
          status:
            500,
        }
      )
    }

    if (
      controlesSiet.length !==
      matriculasCreadas.length
    ) {
      await rollbackProcesoMatricula(
        supabase,
        matriculasCreadas
      )

      return NextResponse.json(
        {
          status:
            'error',

          message:
            'No se pudieron crear correctamente todos los controles SIET.',
        },
        {
          status:
            500,
        }
      )
    }

    // =====================================================
    // OBLIGACIÓN ÚNICA DE CAJA
    // =====================================================

    let obligacionCaja =
      null

    try {
      obligacionCaja =
        await crearObligacionInicialCaja({
          supabase,

          matriculas:
            matriculasCreadas,

          body,

          origenMatricula,

          convenioSeleccionado,
        })
    } catch (
      errorCaja
    ) {
      console.error(
        'Error creando obligación de Caja:',
        errorCaja
      )

      await rollbackProcesoMatricula(
        supabase,
        matriculasCreadas
      )

      return NextResponse.json(
        {
          status:
            'error',

          message:
            `La matrícula no pudo completarse porque falló la creación de la obligación de Caja: ${errorCaja.message}`,
        },
        {
          status:
            500,
        }
      )
    }

    if (
      !obligacionCaja
        ?.cuenta
        ?.id
    ) {
      await rollbackProcesoMatricula(
        supabase,
        matriculasCreadas
      )

      return NextResponse.json(
        {
          status:
            'error',

          message:
            'No se creó correctamente la obligación financiera.',
        },
        {
          status:
            500,
        }
      )
    }

    const cantidadDetallesEsperados =
      matriculasCreadas.length +
      (
        validacionFinanciera
          .incluyeExamenMedico
          ? 1
          : 0
      )

    if (
      obligacionCaja
        .detalles
        .length !==
      cantidadDetallesEsperados
    ) {
      await rollbackProcesoMatricula(
        supabase,
        matriculasCreadas
      )

      return NextResponse.json(
        {
          status:
            'error',

          message:
            'No se crearon correctamente todos los componentes de la obligación financiera.',
        },
        {
          status:
            500,
        }
      )
    }

    // =====================================================
    // CONSECUTIVOS
    // =====================================================

    const consecutivos =
      matriculasCreadas
        .map(
          matricula =>
            matricula
              ?.consecutivo
        )
        .filter(
          valor =>
            valor !==
              null &&
            valor !==
              undefined
        )

    // =====================================================
    // RESPUESTA
    // =====================================================

    return NextResponse.json(
      {
        status:
          'success',

        message:
          matriculasCreadas.length >
          1
            ? `${matriculasCreadas.length} matrículas creadas correctamente.`
            : 'Matrícula creada correctamente.',

        data: {
          matriculas:
            matriculasCreadas,

          consecutivos,

          total:
            matriculasCreadas.length,

          controles_runt:
            controlesRunt,

          controles_sicov:
            controlesSicov,

          controles_siet:
            controlesSiet,

          cuenta_aprendiz:
            obligacionCaja
              .cuenta,

          cuenta_aprendiz_detalle:
            obligacionCaja
              .detalles,

          cuentas_aprendiz: [
            obligacionCaja
              .cuenta,
          ],

          origen_matricula:
            origenMatricula,

          convenio:
            convenioSeleccionado,

          nivel_cea:
            empresa?.nivel_cea ||
            '',

          categorias_habilitadas:
            obtenerCategoriasHabilitadasEmpresa(
              empresa
            ),
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
  } catch (
    error
  ) {
    console.error(
      'Error POST /api/admin/inscripciones/aprendices:',
      error
    )

    if (
      supabase &&
      matriculasCreadas.length >
        0
    ) {
      await rollbackProcesoMatricula(
        supabase,
        matriculasCreadas
      )
    }

    return respuestaError(
      error
    )
  }
}