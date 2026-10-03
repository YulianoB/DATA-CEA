// app/api/admin/sinst-vigia/evidencias/route.js
import { NextResponse } from 'next/server'
import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'
import {
  generarSiniestrosExcel,
} from '@/lib/sinst/generarSiniestrosExcel'
import {
  generarEvidenciaContableExcel,
} from '@/lib/sinst/generarEvidenciasContablesA5A7'
// =========================================================
// CONSTANTES
// =========================================================
const TIPOS_ARCHIVO = new Set([
  'PDF',
  'EXCEL',
])
const ORIGENES = new Set([
  'INFORME_GENERADO',
  'EXCEL_AUTOMATICO',
  'CERTIFICACION_GENERADA',
  'ARCHIVO_EXTERNO',
  'JUSTIFICACION',
])
const PERIODICIDADES = new Set([
  'MENSUAL',
  'TRIMESTRAL',
  'ANUAL',
])
const ESTADOS = new Set([
  'BORRADOR',
  'PENDIENTE_APROBACION',
  'APROBADO',
  'GENERADO',
])
const FORMULARIOS = new Set([
  'A',
  'B',
  'C',
  'D',
])
// =========================================================
// RESPUESTAS
// =========================================================
function responderErrorEmpresa(error) {
  const respuesta =
    respuestaErrorEmpresa(error)
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
function texto(valor) {
  return String(
    valor ?? ''
  ).trim()
}
function mayusculas(valor) {
  return texto(
    valor
  ).toUpperCase()
}
function entero(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
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
function idValido(valor) {
  const numero =
    entero(valor)
  return (
    numero !== null &&
    numero > 0
  )
    ? numero
    : null
}
function booleano(valor) {
  if (
    valor === true ||
    valor === false
  ) {
    return valor
  }
  if (
    valor === 'true' ||
    valor === '1'
  ) {
    return true
  }
  if (
    valor === 'false' ||
    valor === '0'
  ) {
    return false
  }
  return null
}
function fechaIsoActual() {
  return new Date().toISOString()
}
function nombreEmpresa(empresa) {
  return (
    empresa?.nombre ||
    empresa?.nombre_empresa ||
    empresa?.razon_social ||
    ''
  )
}
function empresaRespuesta(
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
    razon_social:
       empresa?.razon_social || '',
    nivel_cea:
      empresa?.nivel_cea ||
      '',
    categorias_habilitadas:
      Array.isArray(
        empresa?.categorias_habilitadas
      )
        ? empresa.categorias_habilitadas
        : [],
    representante_legal:
      empresa?.representante_legal ||
      '',
    documento_representante:
      empresa?.documento_representante ||
      '',
  }
}
function usuarioRequest(
  request,
  body = null
) {
  return (
    texto(
      body?.usuario
    ) ||
    texto(
      body?.generado_por
    ) ||
    texto(
      request.headers.get(
        'x-user-name'
      )
    ) ||
    texto(
      request.headers.get(
        'x-usuario'
      )
    ) ||
    null
  )
}
function validarPeriodo({
  periodicidad,
  anio,
  mes,
  trimestre,
}) {
  const periodicidadNormalizada =
    mayusculas(
      periodicidad
    )
  const anioNumero =
    entero(anio)
  const mesNumero =
    entero(mes)
  const trimestreNumero =
    entero(trimestre)
  if (
    !PERIODICIDADES.has(
      periodicidadNormalizada
    )
  ) {
    return {
      error:
        'La periodicidad debe ser MENSUAL, TRIMESTRAL o ANUAL.',
    }
  }
  if (
    anioNumero === null ||
    anioNumero < 2020 ||
    anioNumero > 2100
  ) {
    return {
      error:
        'Debe indicar una vigencia válida.',
    }
  }
  if (
    periodicidadNormalizada ===
    'MENSUAL'
  ) {
    if (
      mesNumero === null ||
      mesNumero < 1 ||
      mesNumero > 12
    ) {
      return {
        error:
          'Para una evidencia mensual debe indicar un mes entre 1 y 12.',
      }
    }
    return {
      periodicidad:
        periodicidadNormalizada,
      anio: anioNumero,
      mes: mesNumero,
      trimestre: null,
    }
  }
  if (
    periodicidadNormalizada ===
    'TRIMESTRAL'
  ) {
    if (
      trimestreNumero === null ||
      trimestreNumero < 1 ||
      trimestreNumero > 4
    ) {
      return {
        error:
          'Para una evidencia trimestral debe indicar un trimestre entre 1 y 4.',
      }
    }
    return {
      periodicidad:
        periodicidadNormalizada,
      anio: anioNumero,
      mes: null,
      trimestre:
        trimestreNumero,
    }
  }
  return {
    periodicidad:
      periodicidadNormalizada,
    anio: anioNumero,
    mes: null,
    trimestre: null,
  }
}
function normalizarVinculos(
  vinculos
) {
  if (
    vinculos === undefined ||
    vinculos === null
  ) {
    return []
  }
  if (
    !Array.isArray(
      vinculos
    )
  ) {
    return {
      error:
        'Los vínculos de la evidencia deben enviarse como una lista.',
    }
  }
  const resultado = []
  const claves = new Set()
  for (
    let i = 0;
    i < vinculos.length;
    i += 1
  ) {
    const item =
      vinculos[i] || {}
    const formulario =
      mayusculas(
        item.formulario
      )
    const codigo_requisito =
      texto(
        item.codigo_requisito
      )
    const numero_evidencia =
      texto(
        item.numero_evidencia
      )
    const descripcion_oficial =
      texto(
        item.descripcion_oficial
      )
    const periodicidad =
      mayusculas(
        item.periodicidad
      )
    if (
      !FORMULARIOS.has(
        formulario
      )
    ) {
      return {
        error:
          `El vínculo ${i + 1} tiene un formulario inválido.`,
      }
    }
    if (!codigo_requisito) {
      return {
        error:
          `El vínculo ${i + 1} no tiene código de requisito.`,
      }
    }
    if (!numero_evidencia) {
      return {
        error:
          `El vínculo ${i + 1} no tiene número de evidencia.`,
      }
    }
    if (!descripcion_oficial) {
      return {
        error:
          `El vínculo ${i + 1} no tiene descripción oficial.`,
      }
    }
    if (
      !PERIODICIDADES.has(
        periodicidad
      )
    ) {
      return {
        error:
          `El vínculo ${i + 1} tiene una periodicidad inválida.`,
      }
    }
    const clave =
      `${formulario}::${codigo_requisito}`
    if (
      claves.has(
        clave
      )
    ) {
      continue
    }
    claves.add(
      clave
    )
    resultado.push({
      formulario,
      codigo_requisito,
      numero_evidencia,
      descripcion_oficial,
      periodicidad,
    })
  }
  return resultado
}
function validarEvidencia(
  body,
  {
    parcial = false,
  } = {}
) {
  const datos = {}
  if (
    !parcial ||
    Object.prototype.hasOwnProperty.call(
      body,
      'codigo_tipo'
    )
  ) {
    const codigo_tipo =
      mayusculas(
        body?.codigo_tipo
      )
    if (!codigo_tipo) {
      return {
        error:
          'Debe indicar el código o tipo interno de la evidencia.',
      }
    }
    datos.codigo_tipo =
      codigo_tipo
  }
  if (
    !parcial ||
    Object.prototype.hasOwnProperty.call(
      body,
      'titulo'
    )
  ) {
    const titulo =
      texto(
        body?.titulo
      )
    if (!titulo) {
      return {
        error:
          'Debe indicar el título de la evidencia.',
      }
    }
    datos.titulo =
      titulo
  }
  if (
    Object.prototype.hasOwnProperty.call(
      body,
      'descripcion'
    )
  ) {
    datos.descripcion =
      texto(
        body?.descripcion
      ) || null
  }
  if (
    !parcial ||
    Object.prototype.hasOwnProperty.call(
      body,
      'tipo_archivo'
    )
  ) {
    const tipo_archivo =
      mayusculas(
        body?.tipo_archivo
      )
    if (
      !TIPOS_ARCHIVO.has(
        tipo_archivo
      )
    ) {
      return {
        error:
          'El tipo de archivo debe ser PDF o EXCEL.',
      }
    }
    datos.tipo_archivo =
      tipo_archivo
  }
  if (
    !parcial ||
    Object.prototype.hasOwnProperty.call(
      body,
      'origen'
    )
  ) {
    const origen =
      mayusculas(
        body?.origen
      )
    if (
      !ORIGENES.has(
        origen
      )
    ) {
      return {
        error:
          'El origen de la evidencia no es válido.',
      }
    }
    datos.origen =
      origen
  }
  const tocaPeriodo =
    !parcial ||
    Object.prototype.hasOwnProperty.call(
      body,
      'periodicidad'
    ) ||
    Object.prototype.hasOwnProperty.call(
      body,
      'anio'
    ) ||
    Object.prototype.hasOwnProperty.call(
      body,
      'mes'
    ) ||
    Object.prototype.hasOwnProperty.call(
      body,
      'trimestre'
    )
  if (tocaPeriodo) {
    const periodo =
      validarPeriodo({
        periodicidad:
          body?.periodicidad,
        anio:
          body?.anio,
        mes:
          body?.mes,
        trimestre:
          body?.trimestre,
      })
    if (periodo.error) {
      return periodo
    }
    Object.assign(
      datos,
      periodo
    )
  }
  if (
    Object.prototype.hasOwnProperty.call(
      body,
      'archivo_path'
    )
  ) {
    datos.archivo_path =
      texto(
        body?.archivo_path
      ) || null
  }
  if (
    Object.prototype.hasOwnProperty.call(
      body,
      'nombre_archivo'
    )
  ) {
    datos.nombre_archivo =
      texto(
        body?.nombre_archivo
      ) || null
  }
  if (
    Object.prototype.hasOwnProperty.call(
      body,
      'justificacion'
    )
  ) {
    datos.justificacion =
      texto(
        body?.justificacion
      ) || null
  }
  if (
    Object.prototype.hasOwnProperty.call(
      body,
      'fundamento_normativo'
    )
  ) {
    datos.fundamento_normativo =
      texto(
        body?.fundamento_normativo
      ) || null
  }
  if (
    Object.prototype.hasOwnProperty.call(
      body,
      'contenido'
    )
  ) {
    if (
      body?.contenido === null ||
      typeof body?.contenido !== 'object' ||
      Array.isArray(body?.contenido)
    ) {
      return {
        error:
          'El contenido estructurado de la evidencia debe ser un objeto válido.',
      }
    }
    datos.contenido =
      body.contenido
  }
  if (
    Object.prototype.hasOwnProperty.call(
      body,
      'informe_id'
    )
  ) {
    if (
      body?.informe_id === null ||
      body?.informe_id === ''
    ) {
      datos.informe_id =
        null
    } else {
      const informe_id =
        idValido(
          body?.informe_id
        )
      if (!informe_id) {
        return {
          error:
            'El identificador del informe relacionado no es válido.',
        }
      }
      datos.informe_id =
        informe_id
    }
  }
  if (
    Object.prototype.hasOwnProperty.call(
      body,
      'estado'
    )
  ) {
    const estado =
      mayusculas(
        body?.estado
      )
    if (
      !ESTADOS.has(
        estado
      )
    ) {
      return {
        error:
          'El estado de la evidencia no es válido.',
      }
    }
    datos.estado =
      estado
  }
  return {
    datos,
  }
}
async function cargarVinculos(
  supabaseAdmin,
  ids
) {
  if (
    !Array.isArray(ids) ||
    ids.length === 0
  ) {
    return new Map()
  }
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        'sinst_evidencia_vinculos'
      )
      .select(
        `
          id,
          evidencia_id,
          formulario,
          codigo_requisito,
          numero_evidencia,
          descripcion_oficial,
          periodicidad,
          created_at
        `
      )
      .in(
        'evidencia_id',
        ids
      )
      .order(
        'formulario',
        {
          ascending: true,
        }
      )
      .order(
        'numero_evidencia',
        {
          ascending: true,
        }
      )
  if (error) {
    throw error
  }
  const mapa =
    new Map()
  for (
    const vinculo of
    data || []
  ) {
    if (
      !mapa.has(
        vinculo.evidencia_id
      )
    ) {
      mapa.set(
        vinculo.evidencia_id,
        []
      )
    }
    mapa
      .get(
        vinculo.evidencia_id
      )
      .push(
        vinculo
      )
  }
  return mapa
}
async function obtenerEvidenciaPorId(
  supabaseAdmin,
  id
) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        'sinst_evidencias'
      )
      .select('*')
      .eq(
        'id',
        id
      )
      .maybeSingle()
  if (error) {
    throw error
  }
  return data || null
}
async function evidenciaConVinculos(
  supabaseAdmin,
  evidencia
) {
  if (!evidencia) {
    return null
  }
  const mapa =
    await cargarVinculos(
      supabaseAdmin,
      [
        evidencia.id,
      ]
    )
  return {
    ...evidencia,
    vinculos:
      mapa.get(
        evidencia.id
      ) || [],
  }
}
async function reemplazarVinculos(
  supabaseAdmin,
  evidenciaId,
  vinculos
) {
  const normalizados =
    normalizarVinculos(
      vinculos
    )
  if (
    normalizados?.error
  ) {
    throw new Error(
      normalizados.error
    )
  }
  const {
    error:
      errorEliminar,
  } =
    await supabaseAdmin
      .from(
        'sinst_evidencia_vinculos'
      )
      .delete()
      .eq(
        'evidencia_id',
        evidenciaId
      )
  if (errorEliminar) {
    throw errorEliminar
  }
  if (
    normalizados.length === 0
  ) {
    return []
  }
  const registros =
    normalizados.map(
      (vinculo) => ({
        evidencia_id:
          evidenciaId,
        ...vinculo,
      })
    )
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        'sinst_evidencia_vinculos'
      )
      .insert(
        registros
      )
      .select('*')
  if (error) {
    throw error
  }
  return data || []
}
async function insertarVinculos(
  supabaseAdmin,
  evidenciaId,
  vinculos
) {
  const normalizados =
    normalizarVinculos(
      vinculos
    )
  if (
    normalizados?.error
  ) {
    return {
      error:
        normalizados.error,
    }
  }
  if (
    normalizados.length === 0
  ) {
    return {
      data: [],
    }
  }
  const registros =
    normalizados.map(
      (vinculo) => ({
        evidencia_id:
          evidenciaId,
        ...vinculo,
      })
    )
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        'sinst_evidencia_vinculos'
      )
      .insert(
        registros
      )
      .select('*')
  if (error) {
    return {
      error,
    }
  }
  return {
    data:
      data || [],
  }
}
// =========================================================
// GET
// =========================================================
// Consulta el expediente de evidencias.
//
// Filtros:
//   nit
//   id
//   anio
//   tipo_archivo = PDF | EXCEL
//   periodicidad = MENSUAL | TRIMESTRAL | ANUAL
//   mes
//   trimestre
//   estado
//   origen
//   codigo_tipo
//   formulario = A | B | C | D
//
// Ejemplo:
// /api/admin/sinst-vigia/evidencias?nit=...&anio=2026
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
    const id =
      idValido(
        url.searchParams.get(
          'id'
        )
      )
    const anio =
      entero(
        url.searchParams.get(
          'anio'
        )
      )
    const mes =
      entero(
        url.searchParams.get(
          'mes'
        )
      )
    const trimestre =
      entero(
        url.searchParams.get(
          'trimestre'
        )
      )
    const tipoArchivo =
      mayusculas(
        url.searchParams.get(
          'tipo_archivo'
        )
      )
    const periodicidad =
      mayusculas(
        url.searchParams.get(
          'periodicidad'
        )
      )
    const estado =
      mayusculas(
        url.searchParams.get(
          'estado'
        )
      )
    const origen =
      mayusculas(
        url.searchParams.get(
          'origen'
        )
      )
    const codigoTipo =
      mayusculas(
        url.searchParams.get(
          'codigo_tipo'
        )
      )
    const formulario =
      mayusculas(
        url.searchParams.get(
          'formulario'
        )
      )
    if (
      tipoArchivo &&
      !TIPOS_ARCHIVO.has(
        tipoArchivo
      )
    ) {
      return responderError(
        'El filtro tipo_archivo debe ser PDF o EXCEL.'
      )
    }
    if (
      periodicidad &&
      !PERIODICIDADES.has(
        periodicidad
      )
    ) {
      return responderError(
        'El filtro periodicidad no es válido.'
      )
    }
    if (
      estado &&
      !ESTADOS.has(
        estado
      )
    ) {
      return responderError(
        'El filtro estado no es válido.'
      )
    }
    if (
      origen &&
      !ORIGENES.has(
        origen
      )
    ) {
      return responderError(
        'El filtro origen no es válido.'
      )
    }
    if (
      formulario &&
      !FORMULARIOS.has(
        formulario
      )
    ) {
      return responderError(
        'El filtro formulario debe ser A, B, C o D.'
      )
    }
    // Si se filtra por formulario, primero se obtienen
    // los IDs de evidencias vinculadas a ese formulario.
    let idsFormulario = null
    if (formulario) {
      const {
        data:
          vinculosFormulario,
        error:
          errorVinculos,
      } =
        await supabaseAdmin
          .from(
            'sinst_evidencia_vinculos'
          )
          .select(
            'evidencia_id'
          )
          .eq(
            'formulario',
            formulario
          )
      if (errorVinculos) {
        throw errorVinculos
      }
      idsFormulario = [
        ...new Set(
          (
            vinculosFormulario ||
            []
          ).map(
            (item) =>
              item.evidencia_id
          )
        ),
      ]
      if (
        idsFormulario.length ===
        0
      ) {
        return NextResponse.json({
          ok: true,
          empresa:
            empresaRespuesta(
              nit,
              empresa
            ),
          evidencias: [],
        })
      }
    }
    let consulta =
      supabaseAdmin
        .from(
          'sinst_evidencias'
        )
        .select(
          `
            id,
            informe_id,
            codigo_tipo,
            titulo,
            descripcion,
            tipo_archivo,
            origen,
            periodicidad,
            anio,
            mes,
            trimestre,
            archivo_path,
            nombre_archivo,
            estado,
            justificacion,
            fundamento_normativo,
            generado_por,
            aprobado_por,
            fecha_generacion,
            fecha_aprobacion,
            created_at,
            updated_at
          `
        )
        .order(
          'anio',
          {
            ascending: false,
          }
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        )
    if (id) {
      consulta =
        consulta.eq(
          'id',
          id
        )
    }
    if (anio !== null) {
      consulta =
        consulta.eq(
          'anio',
          anio
        )
    }
    if (mes !== null) {
      consulta =
        consulta.eq(
          'mes',
          mes
        )
    }
    if (
      trimestre !== null
    ) {
      consulta =
        consulta.eq(
          'trimestre',
          trimestre
        )
    }
    if (tipoArchivo) {
      consulta =
        consulta.eq(
          'tipo_archivo',
          tipoArchivo
        )
    }
    if (periodicidad) {
      consulta =
        consulta.eq(
          'periodicidad',
          periodicidad
        )
    }
    if (estado) {
      consulta =
        consulta.eq(
          'estado',
          estado
        )
    }
    if (origen) {
      consulta =
        consulta.eq(
          'origen',
          origen
        )
    }
    if (codigoTipo) {
      consulta =
        consulta.eq(
          'codigo_tipo',
          codigoTipo
        )
    }
    if (
      Array.isArray(
        idsFormulario
      )
    ) {
      consulta =
        consulta.in(
          'id',
          idsFormulario
        )
    }
    const {
      data,
      error,
    } =
      await consulta
    if (error) {
      throw error
    }
    const evidencias =
      data || []
    const mapaVinculos =
      await cargarVinculos(
        supabaseAdmin,
        evidencias.map(
          (item) => item.id
        )
      )
    const resultado =
      evidencias.map(
        (item) => ({
          ...item,
          vinculos:
            mapaVinculos.get(
              item.id
            ) || [],
        })
      )
    return NextResponse.json({
      ok: true,
      empresa:
        empresaRespuesta(
          nit,
          empresa
        ),
      evidencias:
        resultado,
    })
  } catch (error) {
    console.error(
      'GET /api/admin/sinst-vigia/evidencias:',
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
// Crea un registro documental.
//
// IMPORTANTE:
// Esta ruta registra la evidencia y sus vínculos.
// La generación física del PDF/XLSX y la carga a Storage
// se conectarán posteriormente mediante los generadores.
//
// Body principal:
// {
//   codigo_tipo,
//   titulo,
//   descripcion,
//   tipo_archivo,
//   origen,
//   periodicidad,
//   anio,
//   mes,
//   trimestre,
//   informe_id,
//   archivo_path,
//   nombre_archivo,
//   estado,
//   justificacion,
//   fundamento_normativo,
//   vinculos: [
//     {
//       formulario,
//       codigo_requisito,
//       numero_evidencia,
//       descripcion_oficial,
//       periodicidad
//     }
//   ]
// }
// =========================================================
async function generarEvidenciaA1({
  supabaseAdmin,
  empresa,
  nit,
  body,
}) {
  const anio = entero(body?.anio)
  const trimestre = entero(body?.trimestre)
  if (!anio || anio < 2020 || anio > 2100) {
    return responderError('La vigencia para generar la evidencia A-1 no es válida.')
  }
  if (![1, 2, 3, 4].includes(trimestre)) {
    return responderError('Debe indicar un trimestre válido para generar la evidencia A-1.')
  }
  const resultado = await generarSiniestrosExcel({
    supabaseAdmin,
    empresa,
    nit,
    anio,
    trimestre,
  })
  const nombreArchivo =
    `A1_registro_vehiculos_siniestrados_${anio}_T${trimestre}.xlsx`
  // El Excel se genera en memoria y se devuelve directamente al navegador.
  // No se almacena en Supabase Storage ni como binario en PostgreSQL.
  return new NextResponse(resultado.buffer, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        `attachment; filename="${nombreArchivo}"`,
      'Cache-Control': 'no-store',
      'X-DATA-CEA-Registros': String(resultado.totalRegistros),
    },
  })
}
async function generarEvidenciaContableA5A7({ empresa, nit, body, evidencia }) {
  const anio = entero(body?.anio)
  const trimestre = entero(body?.trimestre)
  if (!anio || anio < 2020 || anio > 2100) {
    return responderError(`La vigencia para generar la evidencia ${evidencia} no es válida.`)
  }
  if (![1, 2, 3, 4].includes(trimestre)) {
    return responderError(`Debe indicar un trimestre válido para generar la evidencia ${evidencia}.`)
  }
  const resultado = await generarEvidenciaContableExcel({
    empresa,
    nit,
    anio,
    trimestre,
    evidencia,
  })
  const nombreArchivo =
    `${evidencia}_${evidencia === 'A5' ? 'detalle_cuentas_terceros' : 'provisiones_demandas'}_${anio}_T${trimestre}.xlsx`
  return new NextResponse(resultado.buffer, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        `attachment; filename="${nombreArchivo}"`,
      'Cache-Control': 'no-store',
    },
  })
}
// =========================================================
// EVIDENCIA A-2
// Consolida las actas FINALIZADAS de los siniestros
// correspondientes al trimestre solicitado.
//
// IMPORTANTE:
// - No almacena PDF.
// - No inventa Comité PESV.
// - Si existen siniestros sin acta FINALIZADA, se informa
//   que la evidencia todavía no está completa.
// - Si no hubo siniestros, permite generar el soporte del
//   período sin fabricar actas.
// =========================================================
function rangoTrimestre(anio, trimestre) {
  const mesInicio = (trimestre - 1) * 3 + 1
  const mesFin = mesInicio + 2
  const ultimoDia = new Date(
    Date.UTC(anio, mesFin, 0)
  ).getUTCDate()
  const dos = (valor) =>
    String(valor).padStart(2, '0')
  return {
    desde: `${anio}-${dos(mesInicio)}-01`,
    hasta: `${anio}-${dos(mesFin)}-${dos(ultimoDia)}`,
  }
}
async function prepararEvidenciaA2({
  supabaseAdmin,
  empresa,
  nit,
  body,
}) {
  const anio = entero(body?.anio)
  const trimestre = entero(body?.trimestre)
  if (!anio || anio < 2020 || anio > 2100) {
    return responderError(
      'La vigencia para generar la evidencia A-2 no es válida.'
    )
  }
  if (![1, 2, 3, 4].includes(trimestre)) {
    return responderError(
      'Debe indicar un trimestre válido para generar la evidencia A-2.'
    )
  }
  // REGLA A-2:
  // El año/trimestre se determina EXCLUSIVAMENTE con siniestros.fecha_siniestro.
  // La fecha del acta NO define el período de la evidencia.
  // Una vez identificados los siniestros del período, el acta se relaciona
  // mediante siniestros_actas.siniestro_id = siniestros.id.
  const { desde, hasta } =
    rangoTrimestre(anio, trimestre)
  const {
    data: siniestros,
    error: errorSiniestros,
  } = await supabaseAdmin
    .from('siniestros')
    .select(`
      id,
      consecutivo,
      timestamp_registro,
      fecha_siniestro,
      tipo_siniestro,
      num_personas_involucradas,
      heridos_leves,
      heridos_graves,
      fatalidades,
      placa,
      nombre_conductor_implicado,
      documento,
      resumen,
      estado_analisis,
      numero_ipat,
      autoridad,
      costo_dir_choque_simple,
      costo_indi_choque_simple,
      costo_dir_heridos_l,
      costo_indi_heridos_l,
      costo_dir_heridos_g,
      costo_indi_heridos_g,
      costo_dir_fatalidad,
      costo_indi_fatalidad,
      fecha_estado_en_analisis,
      nombre_usuario_en_analisis,
      fecha_estado_cerrado,
      nombre_usuario_cerrado,
      resumen_analisis
    `)
    .gte('fecha_siniestro', desde)
    .lte('fecha_siniestro', hasta)
    .order('fecha_siniestro', { ascending: true })
    .order('id', { ascending: true })
  if (errorSiniestros) {
    throw errorSiniestros
  }
  const listaSiniestros =
    Array.isArray(siniestros)
      ? siniestros
      : []
  if (listaSiniestros.length === 0) {
    return NextResponse.json({
      ok: true,
      empresa: empresaRespuesta(nit, empresa),
      periodo: {
        anio,
        trimestre,
        desde,
        hasta,
      },
      total_siniestros: 0,
      total_actas: 0,
      completo: true,
      siniestros_sin_acta: [],
      registros: [],
    })
  }
  const ids =
    listaSiniestros.map(item => item.id)
  const {
    data: actas,
    error: errorActas,
  } = await supabaseAdmin
    .from('siniestros_actas')
    .select(`
      id,
      siniestro_id,
      numero_acta,
      fecha_acta,
      tratamiento_realizado,
      acciones_preventivas,
      acuerdos_compromisos,
      responsables_compromisos,
      fecha_seguimiento,
      participantes,
      observaciones,
      estado,
      elaborado_por,
      finalizado_por,
      fecha_finalizacion,
      created_at,
      updated_at
    `)
    .in('siniestro_id', ids)
    .eq('estado', 'FINALIZADA')
    .order('fecha_acta', { ascending: true })
    .order('id', { ascending: true })
  if (errorActas) {
    throw errorActas
  }
  const mapaActas =
    new Map(
      (actas || []).map(acta => [
        Number(acta.siniestro_id),
        acta,
      ])
    )
  const registros = []
  const siniestrosSinActa = []
  for (const siniestro of listaSiniestros) {
    const acta =
      mapaActas.get(
        Number(siniestro.id)
      ) || null
    if (!acta) {
      siniestrosSinActa.push({
        id: siniestro.id,
        consecutivo:
          siniestro.consecutivo || '',
        fecha_siniestro:
          siniestro.fecha_siniestro || null,
        estado_analisis:
          siniestro.estado_analisis || '',
      })
      continue
    }
    registros.push({
      siniestro,
      acta,
    })
  }
  return NextResponse.json({
    ok: true,
    empresa: empresaRespuesta(nit, empresa),
    periodo: {
      anio,
      trimestre,
      desde,
      hasta,
    },
    total_siniestros:
      listaSiniestros.length,
    total_actas:
      registros.length,
    // Las actas pendientes no impiden generar A-2.
    // La evidencia consolida únicamente las actas FINALIZADAS disponibles
    // para el trimestre y reporta las pendientes solo como información.
    completo: true,
    siniestros_sin_acta:
      siniestrosSinActa,
    registros,
  })
}
async function prepararEvidenciaA3({ supabaseAdmin, empresa, nit, body }) {
  const anio = entero(body?.anio)
  const trimestre = entero(body?.trimestre)
  if (!anio || anio < 2020 || anio > 2100) {
    return responderError('La vigencia para preparar la evidencia A-3 no es válida.')
  }
  if (![1, 2, 3, 4].includes(trimestre)) {
    return responderError('Debe indicar un trimestre válido para preparar la evidencia A-3.')
  }
  const { count: totalVehiculos, error: errorVehiculos } = await supabaseAdmin
    .from('vehiculos')
    .select('id', { count: 'exact', head: true })
    .or('estado.is.null,estado.ilike.activo')
  if (errorVehiculos) throw errorVehiculos
  const { count: totalConductores, error: errorConductores } = await supabaseAdmin
    .from('personal')
    .select('id', { count: 'exact', head: true })
    .eq('estado', 'activo')
    .eq('rol_conductor_instructor', true)
  if (errorConductores) throw errorConductores
  return NextResponse.json({
    ok: true,
    empresa: empresaRespuesta(nit, empresa),
    evidencia: {
      codigo: 'A-3',
      formulario: 'A',
      anio,
      trimestre,
      nivel_pesv: 'Básico',
      actividad_economica: 'Otros tipos de educación',
      numero_vehiculos: totalVehiculos || 0,
      numero_conductores: totalConductores || 0,
      descripcion_oficial:
        'Evidencia   de la divulgación de las lecciones aprendidas diferentes a capacitaciones y   certificación del área de RRHH, donde conste la retroalimentación de los   implicados',
      formato: 'PDF',
      titulo:
        'CERTIFICACIÓN Y JUSTIFICACIÓN DE EVIDENCIA A-3 – SINST - VIGIA 2',
      representante_legal: texto(empresa?.representante_legal),
      documento_representante: texto(empresa?.documento_representante),
    },
  })
}
async function prepararEvidenciaA6({ empresa, nit, body }) {
  const anio = entero(body?.anio)
  const trimestre = entero(body?.trimestre)
  if (!anio || anio < 2020 || anio > 2100) {
    return responderError('La vigencia para preparar la evidencia A-6 no es válida.')
  }
  if (![1, 2, 3, 4].includes(trimestre)) {
    return responderError('Debe indicar un trimestre válido para preparar la evidencia A-6.')
  }
  return NextResponse.json({
    ok: true,
    empresa: empresaRespuesta(nit, empresa),
    evidencia: {
      codigo: 'A-6',
      formulario: 'A',
      anio,
      trimestre,
      nivel_pesv: 'Básico',
      actividad_economica: 'Otros tipos de educación',
      descripcion_oficial:
        'Copia del informe jurídico de los procesos en contra de la empresa por todo tipo de siniestros viales, incluyendo accidentes derivados de desplazamientos laborales y monto del fondo para accidentes (si existe)',
      formato: 'PDF',
      titulo: 'JUSTIFICACIÓN DE EVIDENCIA A-6 – SINST - VIGIA 2',
    },
  })
}
async function prepararEvidenciaA4({ supabaseAdmin, empresa, nit, body }) {
  const anio = entero(body?.anio)
  const trimestre = entero(body?.trimestre)
  if (!anio || anio < 2020 || anio > 2100) {
    return responderError('La vigencia para preparar la evidencia A-4 no es válida.')
  }
  if (![1, 2, 3, 4].includes(trimestre)) {
    return responderError('Debe indicar un trimestre válido para preparar la evidencia A-4.')
  }
  const { desde, hasta } = rangoTrimestre(anio, trimestre)
  const etiquetasCategoria = {
    MANTENIMIENTO_SEGURIDAD: 'Mantenimiento y seguridad vehicular',
    CAPACITACION: 'Capacitación y formación en seguridad vial',
    SENALIZACION: 'Señalización y adecuaciones de seguridad vial',
    TECNOLOGIA_MONITOREO: 'Tecnología y monitoreo',
    EMERGENCIAS: 'Atención de emergencias y elementos de prevención',
    GESTION_PESV: 'Gestión, seguimiento y documentación PESV',
    OTROS: 'Otros recursos destinados al PESV',
  }
  const categoriasValidas = new Set(Object.keys(etiquetasCategoria))
  const medidasSugeridas = [
    { id: 'INSPECCIONES_PREOPERACIONALES', texto: 'Inspecciones preoperacionales de vehículos.' },
    { id: 'MANTENIMIENTO_PREVENTIVO', texto: 'Seguimiento y control del mantenimiento preventivo de los vehículos.' },
    { id: 'REPORTE_FALLAS', texto: 'Reporte y seguimiento de fallas de los vehículos.' },
    { id: 'VERIFICACION_DOCUMENTOS_VEHICULOS', texto: 'Verificación de documentación y condiciones de seguridad de los vehículos.' },
    { id: 'SENSIBILIZACION_SEGURIDAD_VIAL', texto: 'Sensibilización o capacitación en seguridad vial.' },
    { id: 'PRACTICAS_CONDUCCION_SEGURA', texto: 'Seguimiento al comportamiento y a las prácticas seguras de conducción.' },
    { id: 'CONTROL_VELOCIDAD', texto: 'Control y seguimiento de velocidades.' },
    { id: 'RIESGOS_VIALES', texto: 'Identificación y seguimiento de riesgos viales.' },
    { id: 'RUTAS_DESPLAZAMIENTOS', texto: 'Inspección o verificación de rutas y desplazamientos.' },
    { id: 'SENALIZACION_PREVENTIVA', texto: 'Señalización preventiva y demarcación de áreas.' },
    { id: 'ELEMENTOS_EMERGENCIA', texto: 'Verificación de elementos de prevención y atención de emergencias.' },
    { id: 'SIMULACROS_EMERGENCIA', texto: 'Simulacros o actividades de preparación para emergencias.' },
    { id: 'SEGUIMIENTO_SINIESTROS', texto: 'Seguimiento de siniestros, incidentes o eventos viales.' },
    { id: 'SEGUIMIENTO_PESV', texto: 'Reuniones o actividades de seguimiento del PESV.' },
    { id: 'PUESTOS_CONTROL', texto: 'Puestos o actividades de control preventivo.' },
    { id: 'GPS_MONITOREO', texto: 'Monitoreo mediante GPS u otras herramientas tecnológicas.' },
  ]
  const { data, error } = await supabaseAdmin
    .from('egresos_caja')
    .select(`
      id,
      concepto_id,
      fecha,
      modalidad,
      estado_legalizacion,
      fecha_legalizacion,
      valor,
      valor_legalizado,
      valor_reintegrado,
      valor_reembolsado,
      beneficiario,
      tipo_documento_beneficiario,
      documento_beneficiario,
      descripcion,
      numero_factura,
      soporte_url,
      vehiculo_id,
      placa,
      es_gasto_pesv,
      categoria_pesv,
      estado,
      concepto:conceptos_caja (
        id,
        nombre,
        descripcion
      )
    `)
    .eq('estado', 'ACTIVO')
    .eq('es_gasto_pesv', true)
    .not('categoria_pesv', 'is', null)
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw error
  const movimientos = []
  const pendientesLegalizacion = []
  const resumenMapa = new Map()
  for (const egreso of data || []) {
    const modalidad = mayusculas(egreso?.modalidad) || 'PAGO_DIRECTO'
    const estadoLegalizacion = mayusculas(egreso?.estado_legalizacion)
    const categoria = mayusculas(egreso?.categoria_pesv)
    if (!categoriasValidas.has(categoria)) continue
    let valorEjecutado = 0
    if (modalidad === 'ENTREGA_PARA_LEGALIZAR') {
      if (estadoLegalizacion !== 'LEGALIZADO') {
        pendientesLegalizacion.push({
          id: egreso.id,
          fecha: egreso.fecha,
          descripcion: texto(egreso.descripcion),
          categoria_pesv: categoria,
          valor_entregado: Number(egreso.valor || 0),
          estado_legalizacion: estadoLegalizacion || 'PENDIENTE',
        })
        continue
      }
      valorEjecutado = Number(egreso.valor_legalizado || 0)
    } else {
      valorEjecutado = Number(egreso.valor || 0)
    }
    if (!Number.isFinite(valorEjecutado) || valorEjecutado <= 0) continue
    const conceptoNombre = texto(egreso?.concepto?.nombre)
    const etiquetaCategoria = etiquetasCategoria[categoria]
    movimientos.push({
      id: egreso.id,
      fecha: egreso.fecha,
      modalidad,
      categoria_pesv: categoria,
      categoria: etiquetaCategoria,
      concepto: conceptoNombre,
      descripcion: texto(egreso.descripcion),
      beneficiario: texto(egreso.beneficiario),
      documento_beneficiario: texto(egreso.documento_beneficiario),
      numero_factura: texto(egreso.numero_factura),
      soporte_url: texto(egreso.soporte_url),
      vehiculo_id: egreso.vehiculo_id || null,
      placa: texto(egreso.placa),
      valor_ejecutado: valorEjecutado,
    })
    const actual = resumenMapa.get(categoria) || {
      categoria_pesv: categoria,
      categoria: etiquetaCategoria,
      valor: 0,
      cantidad_movimientos: 0,
      conceptos: new Set(),
    }
    actual.valor += valorEjecutado
    actual.cantidad_movimientos += 1
    if (conceptoNombre) actual.conceptos.add(conceptoNombre)
    resumenMapa.set(categoria, actual)
  }
  const resumenCaja = Array.from(resumenMapa.values()).map((item) => ({
    categoria_pesv: item.categoria_pesv,
    categoria: item.categoria,
    valor: Number(item.valor.toFixed(2)),
    cantidad_movimientos: item.cantidad_movimientos,
    conceptos: Array.from(item.conceptos).sort((a, b) => a.localeCompare(b, 'es')),
  }))
  const totalCaja = Number(
    resumenCaja.reduce((total, item) => total + item.valor, 0).toFixed(2)
  )
  // Los valores declarados solo se aceptan cuando no existe ejecución PESV en Caja.
  // Esto permite certificar periodos históricos de un CEA que empezó a usar DATA-CEA posteriormente,
  // sin crear egresos ficticios ni reconstruir retrospectivamente el flujo de Caja.
  let resumen = resumenCaja
  let origenValores = totalCaja > 0 ? 'CAJA' : 'SIN_REGISTROS'
  if (totalCaja <= 0 && Array.isArray(body?.recursos_declarados)) {
    const declarados = []
    for (const item of body.recursos_declarados) {
      const categoria = mayusculas(item?.categoria_pesv)
      const valor = Number(item?.valor || 0)
      if (!categoriasValidas.has(categoria)) continue
      if (!Number.isFinite(valor) || valor < 0) {
        return responderError('Uno de los valores declarados para la evidencia A-4 no es válido.')
      }
      if (valor <= 0) continue
      declarados.push({
        categoria_pesv: categoria,
        categoria: etiquetasCategoria[categoria],
        valor: Number(valor.toFixed(2)),
        cantidad_movimientos: 0,
        conceptos: [],
      })
    }
    if (declarados.length > 0) {
      resumen = declarados
      origenValores = 'DECLARADO'
    }
  }
  const medidasPermitidas = new Map(medidasSugeridas.map((item) => [item.id, item.texto]))
  const medidasSeleccionadas = []
  const idsRecibidos = Array.isArray(body?.medidas_seleccionadas) ? body.medidas_seleccionadas : []
  for (const valor of idsRecibidos) {
    const id = mayusculas(valor)
    if (medidasPermitidas.has(id) && !medidasSeleccionadas.some((item) => item.id === id)) {
      medidasSeleccionadas.push({ id, texto: medidasPermitidas.get(id), tipo: 'SUGERIDA' })
    }
  }
  const actividadesPersonalizadas = []
  const personalizadasRecibidas = Array.isArray(body?.actividades_personalizadas)
    ? body.actividades_personalizadas
    : []
  for (const valor of personalizadasRecibidas) {
    const actividad = texto(typeof valor === 'string' ? valor : valor?.texto)
    if (!actividad) continue
    if (actividad.length > 500) {
      return responderError('Cada actividad adicional de la evidencia A-4 debe tener máximo 500 caracteres.')
    }
    if (!actividadesPersonalizadas.includes(actividad)) actividadesPersonalizadas.push(actividad)
  }
  const totalRecursosEjecutados = Number(
    resumen.reduce((total, item) => total + Number(item.valor || 0), 0).toFixed(2)
  )
  const confirmada = body?.confirmada === true
  return NextResponse.json({
    ok: true,
    empresa: empresaRespuesta(nit, empresa),
    periodo: { anio, trimestre, desde, hasta },
    evidencia: {
      codigo: 'A-4',
      formulario: 'A',
      anio,
      trimestre,
      nivel_pesv: 'Básico',
      descripcion_oficial:
        'Certificación suscrita por el Representante Legal de la señalización, puestos de control, gastos de GPS, etc, implementados para reducir la accidentalidad',
      formato: 'PDF',
      titulo:
        'CERTIFICACIÓN DE RECURSOS Y MEDIDAS IMPLEMENTADAS PARA LA PREVENCIÓN DE LA SINIESTRALIDAD VIAL',
      razon_social: texto(empresa?.razon_social),
      nit: texto(nit),
      representante_legal: texto(empresa?.representante_legal),
      documento_representante: texto(empresa?.documento_representante),
      origen_valores: origenValores,
      permite_valores_declarados: totalCaja <= 0,
      resumen,
      resumen_caja: resumenCaja,
      movimientos,
      total_recursos_ejecutados: totalRecursosEjecutados,
      total_recursos_caja: totalCaja,
      cantidad_movimientos: movimientos.length,
      pendientes_legalizacion: pendientesLegalizacion,
      cantidad_pendientes_legalizacion: pendientesLegalizacion.length,
      categorias_disponibles: Object.entries(etiquetasCategoria).map(([categoria_pesv, categoria]) => ({
        categoria_pesv,
        categoria,
      })),
      medidas_sugeridas: medidasSugeridas,
      medidas_seleccionadas: medidasSeleccionadas,
      actividades_personalizadas: actividadesPersonalizadas,
      medidas_certificadas: [
        ...medidasSeleccionadas.map((item) => item.texto),
        ...actividadesPersonalizadas,
      ],
      confirmada,
    },
  })
}
async function prepararEvidenciaB4({ supabaseAdmin, empresa, nit, body }) {
  const anio = entero(body?.anio)
  const trimestre = entero(body?.trimestre)
  if (!anio || anio < 2020 || anio > 2100) return responderError('La vigencia para preparar la evidencia B-4 no es válida.')
  if (![1, 2, 3, 4].includes(trimestre)) return responderError('Debe indicar un trimestre válido para preparar la evidencia B-4.')
  const contadorNombre = mayusculas(body?.contador_nombre)
  const contadorDocumento = texto(body?.contador_documento).replace(/\s+/g, '')
  const contadorTarjeta = mayusculas(body?.contador_tarjeta).replace(/\s+/g, '')
  const textoVerificacion = mayusculas(body?.texto_verificacion)
  if (!contadorNombre) return responderError('Debe indicar el nombre completo del Contador Público.')
  if (!/^\d+$/.test(contadorDocumento)) return responderError('La identificación del Contador Público debe contener únicamente números enteros.')
  if (!contadorTarjeta || !/^[A-Z0-9-]+$/.test(contadorTarjeta)) {
    return responderError('La tarjeta profesional debe ser alfanumérica y solo puede incluir guiones, por ejemplo 123456-T.')
  }
  if (!textoVerificacion) return responderError('Debe indicar el texto de verificación de la información.')
  if (textoVerificacion.length > 1500) return responderError('El texto de verificación debe tener máximo 1500 caracteres.')
  const { desde, hasta } = rangoTrimestre(anio, trimestre)
  const etiquetasCategoria = {
    MANTENIMIENTO_SEGURIDAD: 'Mantenimiento y seguridad vehicular',
    CAPACITACION: 'Capacitación y formación en seguridad vial',
    SENALIZACION: 'Señalización y adecuaciones de seguridad vial',
    TECNOLOGIA_MONITOREO: 'Tecnología y monitoreo',
    EMERGENCIAS: 'Atención de emergencias y elementos de prevención',
    GESTION_PESV: 'Gestión, seguimiento y documentación PESV',
    OTROS: 'Otros recursos destinados al PESV',
  }
  const categoriasValidas = new Set(Object.keys(etiquetasCategoria))
  const { data, error } = await supabaseAdmin
    .from('egresos_caja')
    .select(`
      id,
      concepto_id,
      fecha,
      modalidad,
      estado_legalizacion,
      valor,
      valor_legalizado,
      descripcion,
      es_gasto_pesv,
      categoria_pesv,
      estado,
      concepto:conceptos_caja (id,nombre,descripcion)
    `)
    .eq('estado', 'ACTIVO')
    .eq('es_gasto_pesv', true)
    .not('categoria_pesv', 'is', null)
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw error
  const detalleMapa = new Map()
  const pendientesLegalizacion = []
  for (const egreso of data || []) {
    const modalidad = mayusculas(egreso?.modalidad) || 'PAGO_DIRECTO'
    const estadoLegalizacion = mayusculas(egreso?.estado_legalizacion)
    const categoriaPesv = mayusculas(egreso?.categoria_pesv)
    if (!categoriasValidas.has(categoriaPesv)) continue
    let valorEjecutado = 0
    if (modalidad === 'ENTREGA_PARA_LEGALIZAR') {
      if (estadoLegalizacion !== 'LEGALIZADO') {
        pendientesLegalizacion.push({
          id: egreso.id,
          fecha: egreso.fecha,
          concepto: texto(egreso?.concepto?.nombre),
          categoria_pesv: categoriaPesv,
          valor_entregado: Number(egreso.valor || 0),
          estado_legalizacion: estadoLegalizacion || 'PENDIENTE',
        })
        continue
      }
      valorEjecutado = Number(egreso.valor_legalizado || 0)
    } else {
      valorEjecutado = Number(egreso.valor || 0)
    }
    if (!Number.isFinite(valorEjecutado) || valorEjecutado <= 0) continue
    const conceptoId = egreso?.concepto_id || egreso?.concepto?.id || null
    const concepto = texto(egreso?.concepto?.nombre) || 'SIN CONCEPTO'
    const clave = `${categoriaPesv}::${conceptoId || concepto}`
    const actual = detalleMapa.get(clave) || {
      categoria_pesv: categoriaPesv,
      destinacion: etiquetasCategoria[categoriaPesv],
      concepto_id: conceptoId,
      concepto,
      valor: 0,
      cantidad_movimientos: 0,
    }
    actual.valor += valorEjecutado
    actual.cantidad_movimientos += 1
    detalleMapa.set(clave, actual)
  }
  const detalle = Array.from(detalleMapa.values())
    .map((item) => ({ ...item, valor: Number(item.valor.toFixed(2)) }))
    .sort((a, b) => a.destinacion.localeCompare(b.destinacion, 'es') || a.concepto.localeCompare(b.concepto, 'es'))
  const resumenMapa = new Map()
  for (const item of detalle) {
    const actual = resumenMapa.get(item.categoria_pesv) || {
      categoria_pesv: item.categoria_pesv,
      destinacion: item.destinacion,
      valor: 0,
    }
    actual.valor += item.valor
    resumenMapa.set(item.categoria_pesv, actual)
  }
  const resumen = Array.from(resumenMapa.values()).map((item) => ({
    ...item,
    valor: Number(item.valor.toFixed(2)),
  }))
  const totalRecursosEjecutados = Number(detalle.reduce((total, item) => total + item.valor, 0).toFixed(2))
  return NextResponse.json({
    ok: true,
    empresa: empresaRespuesta(nit, empresa),
    periodo: { anio, trimestre, desde, hasta },
    evidencia: {
      codigo: 'B-4',
      formulario: 'B',
      anio,
      trimestre,
      descripcion_oficial: 'Certificación suscrita por el Contador de los recursos empleados trimestralmente para el desarrollo del plan anual de trabajo PESV, con el detalle de la destinación de los mismos',
      formato: 'PDF',
      titulo: 'CERTIFICACIÓN DE RECURSOS EMPLEADOS PARA EL DESARROLLO DEL PLAN ANUAL DE TRABAJO PESV',
      razon_social: texto(empresa?.razon_social),
      nit: texto(nit),
      contador: {
        nombre: contadorNombre,
        documento: contadorDocumento,
        tarjeta_profesional: contadorTarjeta,
        titulo: 'CONTADOR PÚBLICO',
      },
      texto_verificacion: textoVerificacion,
      detalle,
      resumen,
      total_recursos_ejecutados: totalRecursosEjecutados,
      cantidad_conceptos: detalle.length,
      pendientes_legalizacion: pendientesLegalizacion,
      cantidad_pendientes_legalizacion: pendientesLegalizacion.length,
      origen_valores: 'CAJA',
    },
  })
}
async function obtenerBorradorCertificacion({ supabaseAdmin, empresa, nit, body }) {
  const anio = entero(body?.anio)
  const trimestre = entero(body?.trimestre)
  if (!anio || anio < 2020 || anio > 2100) {
    return responderError('La vigencia para preparar la certificación no es válida.')
  }
  if (![1, 2, 3, 4].includes(trimestre)) {
    return responderError('Debe indicar un trimestre válido para preparar la certificación.')
  }
  const { count: totalVehiculos, error: errorVehiculos } = await supabaseAdmin
    .from('vehiculos')
    .select('id', { count: 'exact', head: true })
    .or('estado.is.null,estado.ilike.activo')
  if (errorVehiculos) throw errorVehiculos
  const { count: totalConductores, error: errorConductores } = await supabaseAdmin
    .from('personal')
    .select('id', { count: 'exact', head: true })
    .eq('estado', 'activo')
    .eq('rol_conductor_instructor', true)
  if (errorConductores) throw errorConductores
  const representanteLegal = texto(empresa?.representante_legal)
  const documentoRepresentante = texto(empresa?.documento_representante)
  return NextResponse.json({
    ok: true,
    empresa: empresaRespuesta(nit, empresa),
    borrador: {
      anio,
      trimestre,
      representante_legal: representanteLegal,
      documento_representante: documentoRepresentante,
      actividad_economica: 'Otros tipos de educación',
      nivel_pesv: 'Básico',
      numero_vehiculos: totalVehiculos || 0,
      numero_conductores: totalConductores || 0,
      titulo: 'CERTIFICACIÓN DE CLASIFICACIÓN DEL NIVEL DE DISEÑO E IMPLEMENTACIÓN DEL PESV Y JUSTIFICACIÓN DE APLICABILIDAD',
      texto_clasificacion: `El Centro de Enseñanza Automovilística desarrolla una actividad diferente a la prestación del servicio de transporte y, para efectos del Plan Estratégico de Seguridad Vial, se clasifica en nivel Básico. Para la vigencia ${anio}, DATA-CEA registra ${totalVehiculos || 0} vehículo(s) activo(s) y ${totalConductores || 0} instructor(es)/conductor(es) activo(s).`,
      texto_aplicabilidad: 'La presente certificación documenta la clasificación del CEA y sirve como soporte de la justificación asociada a las evidencias A-5, A-6 y A-7 del Formulario A de SINST - VIGIA 2. La aprobación del documento corresponde al responsable de la organización; DATA-CEA únicamente prepara el borrador con la información registrada.',
    },
  })
}
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
    const accion = mayusculas(body?.accion)
    if (accion === 'OBTENER_BORRADOR_CERTIFICACION') {
      return obtenerBorradorCertificacion({ supabaseAdmin, empresa, nit, body })
    }
    if (accion === 'GENERAR_A1') {
      return generarEvidenciaA1({
        supabaseAdmin,
        empresa,
        nit,
        body,
      })
    }
    if (accion === 'PREPARAR_A2') {
      return prepararEvidenciaA2({
        supabaseAdmin,
        empresa,
        nit,
        body,
      })
    }
    if (accion === 'PREPARAR_A3') {
      return prepararEvidenciaA3({
        supabaseAdmin,
        empresa,
        nit,
        body,
      })
    }
    if (accion === 'PREPARAR_A4') {
      return prepararEvidenciaA4({
        supabaseAdmin,
        empresa,
        nit,
        body,
      })
    }
    if (accion === 'PREPARAR_A6') {
      return prepararEvidenciaA6({ empresa, nit, body })
    }
    if (accion === 'PREPARAR_B4') {
      return prepararEvidenciaB4({
        supabaseAdmin,
        empresa,
        nit,
        body,
      })
    }
    if (accion === 'GENERAR_A5') {
      return generarEvidenciaContableA5A7({ empresa, nit, body, evidencia: 'A5' })
    }
    if (accion === 'GENERAR_A7') {
      return generarEvidenciaContableA5A7({ empresa, nit, body, evidencia: 'A7' })
    }
    const validacion =
      validarEvidencia(
        body
      )
    if (validacion.error) {
      return responderError(
        validacion.error
      )
    }
    const vinculos =
      normalizarVinculos(
        body?.vinculos
      )
    if (
      vinculos?.error
    ) {
      return responderError(
        vinculos.error
      )
    }
    const usuario =
      usuarioRequest(
        request,
        body
      )
    const ahora =
      fechaIsoActual()
    const registro = {
      ...validacion.datos,
      estado:
        validacion.datos.estado ||
        'BORRADOR',
      generado_por:
        texto(
          body?.generado_por
        ) ||
        usuario,
      updated_at:
        ahora,
    }
    if (
      registro.origen ===
      'JUSTIFICACION'
    ) {
      if (
        !texto(
          registro.justificacion
        )
      ) {
        return responderError(
          'La justificación es obligatoria cuando el origen es JUSTIFICACION.'
        )
      }
      // Una justificación se crea como borrador o pendiente,
      // nunca se autoaprueba desde POST.
      if (
        registro.estado ===
        'APROBADO' ||
        registro.estado ===
        'GENERADO'
      ) {
        registro.estado =
          'PENDIENTE_APROBACION'
      }
    }
    if (
      registro.estado ===
      'APROBADO'
    ) {
      return responderError(
        'La aprobación debe realizarse mediante la acción APROBAR.'
      )
    }
    const {
      data:
        evidencia,
      error:
        errorInsertar,
    } =
      await supabaseAdmin
        .from(
          'sinst_evidencias'
        )
        .insert(
          registro
        )
        .select('*')
        .single()
    if (errorInsertar) {
      throw errorInsertar
    }
    const resultadoVinculos =
      await insertarVinculos(
        supabaseAdmin,
        evidencia.id,
        vinculos
      )
    if (
      resultadoVinculos.error
    ) {
      // Evita dejar una evidencia huérfana si falla
      // la creación inicial de sus vínculos.
      await supabaseAdmin
        .from(
          'sinst_evidencias'
        )
        .delete()
        .eq(
          'id',
          evidencia.id
        )
      if (
        resultadoVinculos.error
          instanceof Error
      ) {
        throw resultadoVinculos.error
      }
      throw new Error(
        String(
          resultadoVinculos.error
        )
      )
    }
    const completa =
      await evidenciaConVinculos(
        supabaseAdmin,
        evidencia
      )
    return NextResponse.json(
      {
        ok: true,
        mensaje:
          'Evidencia registrada correctamente.',
        empresa:
          empresaRespuesta(
            nit,
            empresa
          ),
        evidencia:
          completa,
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(
      'POST /api/admin/sinst-vigia/evidencias:',
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
// Edita los metadatos de una evidencia.
//
// Por seguridad documental:
// - APROBADO no se modifica.
// - GENERADO no se modifica.
// - La aprobación se hace con PATCH acción APROBAR.
//
// Si se envía "vinculos", reemplaza la lista completa.
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
      idValido(
        body?.id
      )
    if (!id) {
      return responderError(
        'No se recibió un identificador de evidencia válido.'
      )
    }
    const actual =
      await obtenerEvidenciaPorId(
        supabaseAdmin,
        id
      )
    if (!actual) {
      return responderError(
        'La evidencia que intenta editar no existe.',
        404
      )
    }
    if (
      actual.estado ===
        'APROBADO' ||
      actual.estado ===
        'GENERADO'
    ) {
      return responderError(
        'Una evidencia aprobada o generada no puede modificarse.',
        409
      )
    }
    // Para validar correctamente un cambio de período,
    // se completa el body con los valores actuales.
    const bodyCompleto = {
      ...actual,
      ...body,
    }
    const validacion =
      validarEvidencia(
        bodyCompleto
      )
    if (validacion.error) {
      return responderError(
        validacion.error
      )
    }
    if (
      validacion.datos.estado ===
      'APROBADO'
    ) {
      return responderError(
        'La aprobación debe realizarse mediante la acción APROBAR.'
      )
    }
    const cambios = {
      ...validacion.datos,
      // Estos datos se administran exclusivamente
      // mediante la acción APROBAR.
      aprobado_por:
        actual.aprobado_por,
      fecha_aprobacion:
        actual.fecha_aprobacion,
      updated_at:
        fechaIsoActual(),
    }
    delete cambios.id
    delete cambios.created_at
    delete cambios.vinculos
    const {
      data:
        actualizada,
      error:
        errorActualizar,
    } =
      await supabaseAdmin
        .from(
          'sinst_evidencias'
        )
        .update(
          cambios
        )
        .eq(
          'id',
          id
        )
        .select('*')
        .maybeSingle()
    if (errorActualizar) {
      throw errorActualizar
    }
    if (!actualizada) {
      return responderError(
        'No fue posible actualizar la evidencia.',
        404
      )
    }
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'vinculos'
      )
    ) {
      const normalizados =
        normalizarVinculos(
          body.vinculos
        )
      if (
        normalizados?.error
      ) {
        return responderError(
          normalizados.error
        )
      }
      await reemplazarVinculos(
        supabaseAdmin,
        id,
        normalizados
      )
    }
    const completa =
      await evidenciaConVinculos(
        supabaseAdmin,
        actualizada
      )
    return NextResponse.json({
      ok: true,
      mensaje:
        'Evidencia actualizada correctamente.',
      empresa:
        empresaRespuesta(
          nit,
          empresa
        ),
      evidencia:
        completa,
    })
  } catch (error) {
    console.error(
      'PUT /api/admin/sinst-vigia/evidencias:',
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
// Acciones controladas sobre una evidencia.
//
// ACCIONES:
//   ENVIAR_APROBACION
//   APROBAR
//   MARCAR_GENERADO
//
// Ejemplo:
// {
//   id: 15,
//   accion: "APROBAR",
//   aprobado_por: "Nombre responsable"
// }
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
      idValido(
        body?.id
      )
    if (!id) {
      return responderError(
        'No se recibió un identificador de evidencia válido.'
      )
    }
    const accion =
      mayusculas(
        body?.accion
      )
    const actual =
      await obtenerEvidenciaPorId(
        supabaseAdmin,
        id
      )
    if (!actual) {
      return responderError(
        'La evidencia no existe.',
        404
      )
    }
    const usuario =
      usuarioRequest(
        request,
        body
      )
    const ahora =
      fechaIsoActual()
    let cambios = {}
    let mensaje = ''
    if (
      accion ===
      'ENVIAR_APROBACION'
    ) {
      if (
        actual.estado !==
        'BORRADOR'
      ) {
        return responderError(
          'Solo una evidencia en borrador puede enviarse a aprobación.',
          409
        )
      }
      cambios = {
        estado:
          'PENDIENTE_APROBACION',
        updated_at:
          ahora,
      }
      mensaje =
        'Evidencia enviada a aprobación.'
    } else if (
      accion ===
      'APROBAR'
    ) {
      if (
        actual.estado !==
          'PENDIENTE_APROBACION' &&
        actual.estado !==
          'BORRADOR'
      ) {
        return responderError(
          'La evidencia no se encuentra disponible para aprobación.',
          409
        )
      }
      const aprobadoPor =
        texto(
          body?.aprobado_por
        ) ||
        usuario
      if (!aprobadoPor) {
        return responderError(
          'Debe identificarse la persona responsable de la aprobación.'
        )
      }
      if (
        actual.origen ===
        'JUSTIFICACION' &&
        !texto(
          actual.fundamento_normativo
        )
      ) {
        return responderError(
          'Para aprobar una justificación debe registrar su fundamento normativo.'
        )
      }
      cambios = {
        estado:
          'APROBADO',
        aprobado_por:
          aprobadoPor,
        fecha_aprobacion:
          ahora,
        updated_at:
          ahora,
      }
      mensaje =
        'Evidencia aprobada correctamente.'
    } else if (
      accion ===
      'MARCAR_GENERADO'
    ) {
      const archivoPath =
        texto(
          body?.archivo_path
        ) ||
        texto(
          actual.archivo_path
        )
      const nombreArchivo =
        texto(
          body?.nombre_archivo
        ) ||
        texto(
          actual.nombre_archivo
        )
      if (
        actual.origen !==
          'JUSTIFICACION' &&
        (
          !archivoPath ||
          !nombreArchivo
        )
      ) {
        return responderError(
          'Para marcar una evidencia como generada debe existir el archivo definitivo.'
        )
      }
      cambios = {
        estado:
          'GENERADO',
        archivo_path:
          archivoPath || null,
        nombre_archivo:
          nombreArchivo || null,
        fecha_generacion:
          actual.fecha_generacion ||
          ahora,
        generado_por:
          actual.generado_por ||
          usuario,
        updated_at:
          ahora,
      }
      mensaje =
        'Evidencia marcada como generada correctamente.'
    } else {
      return responderError(
        'La acción solicitada no es válida.'
      )
    }
    const {
      data:
        actualizada,
      error:
        errorActualizar,
    } =
      await supabaseAdmin
        .from(
          'sinst_evidencias'
        )
        .update(
          cambios
        )
        .eq(
          'id',
          id
        )
        .select('*')
        .maybeSingle()
    if (errorActualizar) {
      throw errorActualizar
    }
    const completa =
      await evidenciaConVinculos(
        supabaseAdmin,
        actualizada
      )
    return NextResponse.json({
      ok: true,
      mensaje,
      empresa:
        empresaRespuesta(
          nit,
          empresa
        ),
      evidencia:
        completa,
    })
  } catch (error) {
    console.error(
      'PATCH /api/admin/sinst-vigia/evidencias:',
      error
    )
    return responderErrorEmpresa(
      error
    )
  }
}
// =========================================================
// DELETE
// =========================================================
// Elimina únicamente registros que todavía sean BORRADOR.
//
// No permite borrar:
//   PENDIENTE_APROBACION
//   APROBADO
//   GENERADO
//
// Los vínculos se eliminan por ON DELETE CASCADE.
//
// NOTA:
// Cuando conectemos Supabase Storage, la eliminación del
// archivo físico se realizará antes de eliminar el registro.
// =========================================================
export async function DELETE(request) {
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
      idValido(
        body?.id
      )
    if (!id) {
      return responderError(
        'No se recibió un identificador de evidencia válido.'
      )
    }
    const actual =
      await obtenerEvidenciaPorId(
        supabaseAdmin,
        id
      )
    if (!actual) {
      return responderError(
        'La evidencia no existe.',
        404
      )
    }
    if (
      actual.estado !==
      'BORRADOR'
    ) {
      return responderError(
        'Solo se pueden eliminar evidencias que permanezcan en estado BORRADOR.',
        409
      )
    }
    if (
      texto(
        actual.archivo_path
      )
    ) {
      return responderError(
        'La evidencia ya tiene un archivo asociado y no puede eliminarse desde esta operación.',
        409
      )
    }
    const {
      error,
    } =
      await supabaseAdmin
        .from(
          'sinst_evidencias'
        )
        .delete()
        .eq(
          'id',
          id
        )
    if (error) {
      throw error
    }
    return NextResponse.json({
      ok: true,
      mensaje:
        'Borrador de evidencia eliminado correctamente.',
      empresa:
        empresaRespuesta(
          nit,
          empresa
        ),
    })
  } catch (error) {
    console.error(
      'DELETE /api/admin/sinst-vigia/evidencias:',
      error
    )
    return responderErrorEmpresa(
      error
    )
  }
}
