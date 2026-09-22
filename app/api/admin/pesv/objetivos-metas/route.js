// app/api/admin/pesv/objetivos-metas/route.js

import {
  NextResponse,
} from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

// ============================================================
// CONSTANTES
// ============================================================

const BUCKET_EMPRESA =
  'empresa'

const DURACION_URL_LOGO =
  60 * 60
// ============================================================
// HELPERS
// ============================================================

function texto(
  valor
) {
  return String(
    valor ?? ''
  ).trim()
}


function numeroEntero(
  valor
) {
  const numero =
    Number(
      valor
    )

  return Number.isFinite(
    numero
  )
    ? Math.trunc(
        numero
      )
    : 0
}


function numeroOpcional(
  valor
) {
  if (
    valor === null ||
    valor === undefined ||
    texto(
      valor
    ) === ''
  ) {
    return null
  }

  const numero =
    Number(
      valor
    )

  return Number.isFinite(
    numero
  )
    ? numero
    : null
}


function idOpcional(
  valor
) {
  const numero =
    numeroEntero(
      valor
    )

  return numero >
    0
    ? numero
    : null
}


function usuarioActualizacion(
  body
) {
  return texto(
    body
      ?.usuario_actualizacion ||
    body?.usuario ||
    body?.usuarioActual ||
    ''
  ) || null
}


function anioActual() {
  return new Date()
    .getFullYear()
}


// ============================================================
// RESPUESTAS
// ============================================================

function respuestaOk(
  body = {},
  status = 200
) {
  return NextResponse.json(
    {
      ok: true,
      ...body,
    },
    {
      status,
    }
  )
}


function respuestaError(
  mensaje,
  status = 400
) {
  return NextResponse.json(
    {
      ok: false,
      error:
        mensaje,
    },
    {
      status,
    }
  )
}


// ============================================================
// MANEJO DE ERRORES DE EMPRESA
// ============================================================

function respuestaDesdeError(
  error,
  mensajePredeterminado
) {
  console.error(
    mensajePredeterminado,
    error
  )

  if (
    error?.status ||
    error?.code
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

  return respuestaError(
    error?.message ||
    mensajePredeterminado,
    500
  )
}


// ============================================================
// VALIDAR AÑO
// ============================================================

function validarAnio(
  valor
) {
  const anio =
    numeroEntero(
      valor
    )

  if (
    anio <
    2022
  ) {
    return null
  }

  return anio
}


// ============================================================
// VALIDAR OPERADOR DE META
// ============================================================

function validarOperador(
  valor
) {
  const operador =
    texto(
      valor
    )

  if (
    !operador
  ) {
    return null
  }

  const permitidos =
    [
      '>=',
      '<=',
      '=',
      '>',
      '<',
    ]

  return permitidos.includes(
    operador
  )
    ? operador
    : null
}

// ============================================================
// VALIDAR INDICADOR ASOCIADO A META
// CM_PESV es un indicador global y no puede asociarse a una meta.
// ============================================================

async function validarIndicadorPermitidoParaMeta(
  supabase,
  indicadorId
) {
  if (
    !indicadorId
  ) {
    return {
      valido: true,
      indicador: null,
    }
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_indicadores_catalogo'
      )
      .select(
        `
          id,
          codigo,
          nombre,
          activo
        `
      )
      .eq(
        'id',
        indicadorId
      )
      .maybeSingle()

  if (
    error
  ) {
    throw error
  }

  if (
    !data
  ) {
    return {
      valido: false,
      mensaje:
        'El indicador seleccionado no existe.',
    }
  }

  if (
    texto(
      data?.codigo
    )
      .toUpperCase() ===
      'CM_PESV'
  ) {
    return {
      valido: false,
      mensaje:
        'El indicador CM_PESV no puede asociarse a una meta porque calcula el cumplimiento global de las metas definidas en el PESV.',
    }
  }

  return {
    valido: true,
    indicador: data,
  }
}


// ============================================================
// LOGO INSTITUCIONAL
// ============================================================

async function obtenerLogo(
  supabase
) {
  const {
    data: configuracion,
    error,
  } =
    await supabase
      .from(
        'configuracion_empresa'
      )
      .select(
        `
          logo_actual_path
        `
      )
      .eq(
        'clave',
        'GENERAL'
      )
      .maybeSingle()

  if (
    error
  ) {
    throw error
  }

  const path =
    texto(
      configuracion?.logo_actual_path
    )

  if (
    !path
  ) {
    return {
      path: '',
      url: '',
    }
  }

  const {
    data: urlFirmada,
    error: errorUrl,
  } =
    await supabase
      .storage
      .from(
        BUCKET_EMPRESA
      )
      .createSignedUrl(
        path,
        DURACION_URL_LOGO
      )

  if (
    errorUrl
  ) {
    console.error(
      'No fue posible generar URL del logo:',
      errorUrl
    )

    return {
      path,
      url: '',
    }
  }

  return {
    path,

    url:
      texto(
        urlFirmada?.signedUrl
      ),
  }
}

// ============================================================
// CONSULTAR OBJETIVOS
// ============================================================

async function obtenerObjetivos(
  supabase,
  anio = null
) {
  let consulta =
    supabase
      .from(
        'pesv_objetivos'
      )
      .select(
        `
          id,
          anio,
          codigo,
          nombre,
          descripcion,
          responsable_personal_id,
          responsable_nombre,
          estado,
          observaciones,
          usuario_creacion,
          usuario_actualizacion,
          created_at,
          updated_at
        `
      )

  if (
    anio
  ) {
    consulta =
      consulta.eq(
        'anio',
        anio
      )
  }

  const {
    data,
    error,
  } =
    await consulta
      .order(
        'anio',
        {
          ascending:
            false,
        }
      )
      .order(
        'codigo',
        {
          ascending:
            true,
        }
      )

  if (
    error
  ) {
    throw error
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}


// ============================================================
// CONSULTAR METAS
// ============================================================

async function obtenerMetas(
  supabase,
  anio = null
) {
  let consulta =
    supabase
      .from(
        'pesv_metas'
      )
      .select(
        `
          id,
          objetivo_id,
          indicador_id,
          codigo,
          descripcion,
          linea_base,
          valor_meta,
          operador_meta,
          unidad_medida,
          fecha_limite,
          responsable_personal_id,
          responsable_nombre,
          estado,
          observaciones,
          usuario_creacion,
          usuario_actualizacion,
          created_at,
          updated_at,
          pesv_objetivos!inner (
            id,
            anio,
            codigo,
            nombre
          ),
          pesv_indicadores_catalogo (
            id,
            codigo,
            numero_normativo,
            nombre,
            periodicidad,
            unidad,
            sentido_mejora,
            activo
          )
        `
      )

  if (
    anio
  ) {
    consulta =
      consulta.eq(
        'pesv_objetivos.anio',
        anio
      )
  }

  const {
    data,
    error,
  } =
    await consulta
      .order(
        'codigo',
        {
          ascending:
            true,
        }
      )

  if (
    error
  ) {
    throw error
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}


// ============================================================
// CONSULTAR INDICADORES
// ============================================================

async function obtenerIndicadores(
  supabase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_indicadores_catalogo'
      )
      .select(
        `
          id,
          codigo,
          numero_normativo,
          nombre,
          descripcion,
          formula,
          periodicidad,
          unidad,
          sentido_mejora,
          fuente_datos,
          orden,
          activo
        `
      )
      .eq(
        'activo',
        true
      )
      .order(
        'orden',
        {
          ascending:
            true,
        }
      )

  if (
    error
  ) {
    throw error
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}


// ============================================================
// CONSULTAR PERSONAL
// ============================================================

async function obtenerPersonal(
  supabase
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'personal'
      )
      .select(
        `
          id,
          documento,
          nombres,
          apellidos,
          cargo,
          grupo_personal,
          tipo_personal,
          estado
        `
      )
      .order(
        'nombres',
        {
          ascending:
            true,
        }
      )
      .order(
        'apellidos',
        {
          ascending:
            true,
        }
      )

  if (
    error
  ) {
    throw error
  }

  return Array.isArray(
    data
  )
    ? data
    : []
}


// ============================================================
// VERIFICAR OBJETIVO
// ============================================================

async function obtenerObjetivoPorId(
  supabase,
  id
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_objetivos'
      )
      .select(
        `
          id,
          anio,
          codigo,
          nombre,
          descripcion,
          responsable_personal_id,
          responsable_nombre,
          estado,
          observaciones,
          usuario_creacion,
          usuario_actualizacion,
          created_at,
          updated_at
        `
      )
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (
    error
  ) {
    throw error
  }

  return data ||
    null
}


// ============================================================
// VERIFICAR META
// ============================================================

async function obtenerMetaPorId(
  supabase,
  id
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'pesv_metas'
      )
      .select(
        `
          id,
          objetivo_id,
          indicador_id,
          codigo,
          descripcion,
          linea_base,
          valor_meta,
          operador_meta,
          unidad_medida,
          fecha_limite,
          responsable_personal_id,
          responsable_nombre,
          estado,
          observaciones,
          usuario_creacion,
          usuario_actualizacion,
          created_at,
          updated_at
        `
      )
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (
    error
  ) {
    throw error
  }

  return data ||
    null
}


// ============================================================
// GET
// CONSULTAR OBJETIVOS, METAS, INDICADORES Y PERSONAL
// ============================================================

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

    const url =
      new URL(
        request.url
      )

    const anioParametro =
      texto(
        url.searchParams.get(
          'anio'
        )
      )

    let anio =
      anioActual()

    if (
      anioParametro
    ) {
      const anioValidado =
        validarAnio(
          anioParametro
        )

      if (
        !anioValidado
      ) {
        return respuestaError(
          'El año consultado no es válido.'
        )
      }

      anio =
        anioValidado
    }

    const [
      objetivos,
      metas,
      indicadores,
      personal,
      logo,
    ] =
      await Promise.all([
        obtenerObjetivos(
          supabase,
          anio
        ),

        obtenerMetas(
          supabase,
          anio
        ),

        obtenerIndicadores(
          supabase
        ),

        obtenerPersonal(
          supabase
        ),

        obtenerLogo(
          supabase
        ),
      ])

    return respuestaOk({
      empresa: {
        nit:
          texto(
            empresa?.nit
          ),

        nombre:
          texto(
            empresa
              ?.nombre ||
            empresa
              ?.nombre_empresa ||
            empresa
              ?.razon_social
          ),
      },

      logo,

      anio,

      objetivos,

      metas,

      indicadores,

      personal,
    })
  } catch (
    error
  ) {
    return respuestaDesdeError(
      error,
      'No fue posible consultar los objetivos y metas del PESV.'
    )
  }
}


// ============================================================
// POST
//
// ACCIONES:
// - crear_objetivo
// - crear_meta
// ============================================================

export async function POST(
  request
) {
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
      texto(
        body?.accion
      )
        .toLowerCase()

    const usuario =
      usuarioActualizacion(
        body
      )

    const fecha =
      new Date()
        .toISOString()


    // ========================================================
    // CREAR OBJETIVO
    // ========================================================

    if (
      accion ===
      'crear_objetivo'
    ) {
      const anio =
        validarAnio(
          body?.anio
        )

      const codigo =
        texto(
          body?.codigo
        )
          .toUpperCase()

      const nombre =
        texto(
          body?.nombre
        )

      if (
        !anio
      ) {
        return respuestaError(
          'El año del objetivo no es válido.'
        )
      }

      if (
        !codigo
      ) {
        return respuestaError(
          'El código del objetivo es obligatorio.'
        )
      }

      if (
        !nombre
      ) {
        return respuestaError(
          'El nombre del objetivo es obligatorio.'
        )
      }

      const payload = {
        anio,

        codigo,

        nombre,

        descripcion:
          texto(
            body?.descripcion
          ) ||
          null,

        responsable_personal_id:
          idOpcional(
            body
              ?.responsable_personal_id
          ),

        responsable_nombre:
          texto(
            body
              ?.responsable_nombre
          ) ||
          null,

        estado:
          texto(
            body?.estado
          )
            .toUpperCase() ||
          'ACTIVO',

        observaciones:
          texto(
            body?.observaciones
          ) ||
          null,

        usuario_creacion:
          usuario,

        usuario_actualizacion:
          usuario,

        created_at:
          fecha,

        updated_at:
          fecha,
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'pesv_objetivos'
          )
          .insert(
            payload
          )
          .select(
            `
              id,
              anio,
              codigo,
              nombre,
              descripcion,
              responsable_personal_id,
              responsable_nombre,
              estado,
              observaciones,
              usuario_creacion,
              usuario_actualizacion,
              created_at,
              updated_at
            `
          )
          .single()

      if (
        error
      ) {
        if (
          error?.code ===
          '23505'
        ) {
          return respuestaError(
            'Ya existe un objetivo con ese código para el año seleccionado.'
          )
        }

        throw error
      }

      return respuestaOk(
        {
          message:
            'Objetivo PESV creado correctamente.',

          objetivo:
            data,
        },
        201
      )
    }


    // ========================================================
    // CREAR META
    // ========================================================

    if (
      accion ===
      'crear_meta'
    ) {
      const objetivoId =
        numeroEntero(
          body?.objetivo_id
        )

      const codigo =
        texto(
          body?.codigo
        )
          .toUpperCase()

      const descripcion =
        texto(
          body?.descripcion
        )

      if (
        objetivoId <=
        0
      ) {
        return respuestaError(
          'Debe seleccionar un objetivo válido.'
        )
      }

      if (
        !codigo
      ) {
        return respuestaError(
          'El código de la meta es obligatorio.'
        )
      }

      if (
        !descripcion
      ) {
        return respuestaError(
          'La descripción de la meta es obligatoria.'
        )
      }

      const objetivo =
        await obtenerObjetivoPorId(
          supabase,
          objetivoId
        )

      if (
        !objetivo
      ) {
        return respuestaError(
          'El objetivo seleccionado no existe.',
          404
        )
      }

      const operadorTexto =
        texto(
          body?.operador_meta
        )

      const operador =
        validarOperador(
          operadorTexto
        )

      if (
        operadorTexto &&
        !operador
      ) {
        return respuestaError(
          'El operador de la meta no es válido.'
        )
      }

      const indicadorId =
        idOpcional(
          body?.indicador_id
        )

      const validacionIndicador =
        await validarIndicadorPermitidoParaMeta(
          supabase,
          indicadorId
        )

      if (
        !validacionIndicador.valido
      ) {
        return respuestaError(
          validacionIndicador.mensaje
        )
      }

      const payload = {
        objetivo_id:
          objetivoId,

        indicador_id:
          indicadorId,

        codigo,

        descripcion,

        linea_base:
          numeroOpcional(
            body?.linea_base
          ),

        valor_meta:
          numeroOpcional(
            body?.valor_meta
          ),

        operador_meta:
          operador,

        unidad_medida:
          texto(
            body?.unidad_medida
          ) ||
          null,

        fecha_limite:
          texto(
            body?.fecha_limite
          ) ||
          null,

        responsable_personal_id:
          idOpcional(
            body
              ?.responsable_personal_id
          ),

        responsable_nombre:
          texto(
            body
              ?.responsable_nombre
          ) ||
          null,

        estado:
          texto(
            body?.estado
          )
            .toUpperCase() ||
          'ACTIVA',

        observaciones:
          texto(
            body?.observaciones
          ) ||
          null,

        usuario_creacion:
          usuario,

        usuario_actualizacion:
          usuario,

        created_at:
          fecha,

        updated_at:
          fecha,
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'pesv_metas'
          )
          .insert(
            payload
          )
          .select(
            `
              id,
              objetivo_id,
              indicador_id,
              codigo,
              descripcion,
              linea_base,
              valor_meta,
              operador_meta,
              unidad_medida,
              fecha_limite,
              responsable_personal_id,
              responsable_nombre,
              estado,
              observaciones,
              usuario_creacion,
              usuario_actualizacion,
              created_at,
              updated_at
            `
          )
          .single()

      if (
        error
      ) {
        if (
          error?.code ===
          '23505'
        ) {
          return respuestaError(
            'Ya existe una meta con ese código dentro del objetivo seleccionado.'
          )
        }

        throw error
      }

      return respuestaOk(
        {
          message:
            'Meta PESV creada correctamente.',

          meta:
            data,
        },
        201
      )
    }


    return respuestaError(
      'La acción solicitada no es válida.'
    )
  } catch (
    error
  ) {
    return respuestaDesdeError(
      error,
      'No fue posible crear el registro de objetivos y metas del PESV.'
    )
  }
}


// ============================================================
// PATCH
//
// ACCIONES:
// - actualizar_objetivo
// - actualizar_meta
// ============================================================

export async function PATCH(
  request
) {
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
      texto(
        body?.accion
      )
        .toLowerCase()

    const usuario =
      usuarioActualizacion(
        body
      )

    const fecha =
      new Date()
        .toISOString()


    // ========================================================
    // ACTUALIZAR OBJETIVO
    // ========================================================

    if (
      accion ===
      'actualizar_objetivo'
    ) {
      const id =
        numeroEntero(
          body?.id
        )

      if (
        id <=
        0
      ) {
        return respuestaError(
          'El objetivo que desea actualizar no es válido.'
        )
      }

      const existente =
        await obtenerObjetivoPorId(
          supabase,
          id
        )

      if (
        !existente
      ) {
        return respuestaError(
          'El objetivo no existe.',
          404
        )
      }

      const anio =
        validarAnio(
          body?.anio
        )

      const codigo =
        texto(
          body?.codigo
        )
          .toUpperCase()

      const nombre =
        texto(
          body?.nombre
        )

      if (
        !anio
      ) {
        return respuestaError(
          'El año del objetivo no es válido.'
        )
      }

      if (
        !codigo
      ) {
        return respuestaError(
          'El código del objetivo es obligatorio.'
        )
      }

      if (
        !nombre
      ) {
        return respuestaError(
          'El nombre del objetivo es obligatorio.'
        )
      }

      const payload = {
        anio,

        codigo,

        nombre,

        descripcion:
          texto(
            body?.descripcion
          ) ||
          null,

        responsable_personal_id:
          idOpcional(
            body
              ?.responsable_personal_id
          ),

        responsable_nombre:
          texto(
            body
              ?.responsable_nombre
          ) ||
          null,

        estado:
          texto(
            body?.estado
          )
            .toUpperCase() ||
          'ACTIVO',

        observaciones:
          texto(
            body?.observaciones
          ) ||
          null,

        usuario_actualizacion:
          usuario,

        updated_at:
          fecha,
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'pesv_objetivos'
          )
          .update(
            payload
          )
          .eq(
            'id',
            id
          )
          .select(
            `
              id,
              anio,
              codigo,
              nombre,
              descripcion,
              responsable_personal_id,
              responsable_nombre,
              estado,
              observaciones,
              usuario_creacion,
              usuario_actualizacion,
              created_at,
              updated_at
            `
          )
          .single()

      if (
        error
      ) {
        if (
          error?.code ===
          '23505'
        ) {
          return respuestaError(
            'Ya existe otro objetivo con ese código para el año seleccionado.'
          )
        }

        throw error
      }

      return respuestaOk({
        message:
          'Objetivo PESV actualizado correctamente.',

        objetivo:
          data,
      })
    }


    // ========================================================
    // ACTUALIZAR META
    // ========================================================

    if (
      accion ===
      'actualizar_meta'
    ) {
      const id =
        numeroEntero(
          body?.id
        )

      if (
        id <=
        0
      ) {
        return respuestaError(
          'La meta que desea actualizar no es válida.'
        )
      }

      const existente =
        await obtenerMetaPorId(
          supabase,
          id
        )

      if (
        !existente
      ) {
        return respuestaError(
          'La meta no existe.',
          404
        )
      }

      const objetivoId =
        numeroEntero(
          body?.objetivo_id
        )

      const codigo =
        texto(
          body?.codigo
        )
          .toUpperCase()

      const descripcion =
        texto(
          body?.descripcion
        )

      if (
        objetivoId <=
        0
      ) {
        return respuestaError(
          'Debe seleccionar un objetivo válido.'
        )
      }

      if (
        !codigo
      ) {
        return respuestaError(
          'El código de la meta es obligatorio.'
        )
      }

      if (
        !descripcion
      ) {
        return respuestaError(
          'La descripción de la meta es obligatoria.'
        )
      }

      const objetivo =
        await obtenerObjetivoPorId(
          supabase,
          objetivoId
        )

      if (
        !objetivo
      ) {
        return respuestaError(
          'El objetivo seleccionado no existe.',
          404
        )
      }

      const operadorTexto =
        texto(
          body?.operador_meta
        )

      const operador =
        validarOperador(
          operadorTexto
        )

      if (
        operadorTexto &&
        !operador
      ) {
        return respuestaError(
          'El operador de la meta no es válido.'
        )
      }

      const indicadorId =
        idOpcional(
          body?.indicador_id
        )

      const validacionIndicador =
        await validarIndicadorPermitidoParaMeta(
          supabase,
          indicadorId
        )

      if (
        !validacionIndicador.valido
      ) {
        return respuestaError(
          validacionIndicador.mensaje
        )
      }

      const payload = {
        objetivo_id:
          objetivoId,

        indicador_id:
          indicadorId,

        codigo,

        descripcion,

        linea_base:
          numeroOpcional(
            body?.linea_base
          ),

        valor_meta:
          numeroOpcional(
            body?.valor_meta
          ),

        operador_meta:
          operador,

        unidad_medida:
          texto(
            body?.unidad_medida
          ) ||
          null,

        fecha_limite:
          texto(
            body?.fecha_limite
          ) ||
          null,

        responsable_personal_id:
          idOpcional(
            body
              ?.responsable_personal_id
          ),

        responsable_nombre:
          texto(
            body
              ?.responsable_nombre
          ) ||
          null,

        estado:
          texto(
            body?.estado
          )
            .toUpperCase() ||
          'ACTIVA',

        observaciones:
          texto(
            body?.observaciones
          ) ||
          null,

        usuario_actualizacion:
          usuario,

        updated_at:
          fecha,
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'pesv_metas'
          )
          .update(
            payload
          )
          .eq(
            'id',
            id
          )
          .select(
            `
              id,
              objetivo_id,
              indicador_id,
              codigo,
              descripcion,
              linea_base,
              valor_meta,
              operador_meta,
              unidad_medida,
              fecha_limite,
              responsable_personal_id,
              responsable_nombre,
              estado,
              observaciones,
              usuario_creacion,
              usuario_actualizacion,
              created_at,
              updated_at
            `
          )
          .single()

      if (
        error
      ) {
        if (
          error?.code ===
          '23505'
        ) {
          return respuestaError(
            'Ya existe otra meta con ese código dentro del objetivo seleccionado.'
          )
        }

        throw error
      }

      return respuestaOk({
        message:
          'Meta PESV actualizada correctamente.',

        meta:
          data,
      })
    }


    return respuestaError(
      'La acción solicitada no es válida.'
    )
  } catch (
    error
  ) {
    return respuestaDesdeError(
      error,
      'No fue posible actualizar los objetivos y metas del PESV.'
    )
  }
}


// ============================================================
// DELETE
//
// ACCIONES:
// - eliminar_objetivo
// - eliminar_meta
// ============================================================

export async function DELETE(
  request
) {
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
      texto(
        body?.accion
      )
        .toLowerCase()


    // ========================================================
    // ELIMINAR META
    // ========================================================

    if (
      accion ===
      'eliminar_meta'
    ) {
      const id =
        numeroEntero(
          body?.id
        )

      if (
        id <=
        0
      ) {
        return respuestaError(
          'La meta que desea eliminar no es válida.'
        )
      }

      const existente =
        await obtenerMetaPorId(
          supabase,
          id
        )

      if (
        !existente
      ) {
        return respuestaError(
          'La meta no existe.',
          404
        )
      }

      // ======================================================
      // NO ELIMINAR META SI ESTÁ USADA EN EL PLAN DE TRABAJO
      // ======================================================

      const {
        data:
          actividadesAsociadas,
        error:
          errorActividades,
      } =
        await supabase
          .from(
            'pesv_plan_trabajo_actividades'
          )
          .select(
            `
              id,
              codigo,
              actividad
            `
          )
          .eq(
            'meta_id',
            id
          )
          .limit(
            5
          )

      if (
        errorActividades
      ) {
        throw errorActividades
      }

      if (
        Array.isArray(
          actividadesAsociadas
        ) &&
        actividadesAsociadas.length >
          0
      ) {
        const codigos =
          actividadesAsociadas
            .map(
              item =>
                texto(
                  item?.codigo
                )
            )
            .filter(
              Boolean
            )
            .join(
              ', '
            )

        return respuestaError(
          `No puede eliminar la meta porque está asociada a una o más actividades del Plan Anual de Trabajo${codigos ? ` (${codigos})` : ''}. Primero retire la asociación desde el Plan de Trabajo.`,
          409
        )
      }

      const {
        data: eliminada,
        error,
      } =
        await supabase
          .from(
            'pesv_metas'
          )
          .delete()
          .eq(
            'id',
            id
          )
          .select(
            'id'
          )
          .maybeSingle()

      if (
        error
      ) {
        if (
          error?.code ===
          '23503'
        ) {
          return respuestaError(
            'No puede eliminar la meta porque tiene registros asociados en otro módulo. Retire primero las asociaciones existentes.',
            409
          )
        }

        throw error
      }

      if (
        !eliminada
      ) {
        return respuestaError(
          'La meta no fue eliminada. Verifique si tiene registros asociados que impidan su eliminación.',
          409
        )
      }

      return respuestaOk({
        message:
          'Meta PESV eliminada correctamente.',
      })
    }


    // ========================================================
    // ELIMINAR OBJETIVO
    // ========================================================

    if (
      accion ===
      'eliminar_objetivo'
    ) {
      const id =
        numeroEntero(
          body?.id
        )

      if (
        id <=
        0
      ) {
        return respuestaError(
          'El objetivo que desea eliminar no es válido.'
        )
      }

      const existente =
        await obtenerObjetivoPorId(
          supabase,
          id
        )

      if (
        !existente
      ) {
        return respuestaError(
          'El objetivo no existe.',
          404
        )
      }

      // ======================================================
      // NO ELIMINAR OBJETIVO SI TIENE METAS
      // ======================================================

      const {
        count,
        error:
          errorMetas,
      } =
        await supabase
          .from(
            'pesv_metas'
          )
          .select(
            'id',
            {
              count:
                'exact',

              head:
                true,
            }
          )
          .eq(
            'objetivo_id',
            id
          )

      if (
        errorMetas
      ) {
        throw errorMetas
      }

      if (
        Number(
          count ||
          0
        ) >
        0
      ) {
        return respuestaError(
          'No puede eliminar el objetivo porque tiene metas asociadas. Elimine primero las metas o cambie el estado del objetivo.'
        )
      }

      const {
        error,
      } =
        await supabase
          .from(
            'pesv_objetivos'
          )
          .delete()
          .eq(
            'id',
            id
          )

      if (
        error
      ) {
        throw error
      }

      return respuestaOk({
        message:
          'Objetivo PESV eliminado correctamente.',
      })
    }


    return respuestaError(
      'La acción solicitada no es válida.'
    )
  } catch (
    error
  ) {
    return respuestaDesdeError(
      error,
      'No fue posible eliminar el registro de objetivos y metas del PESV.'
    )
  }
}