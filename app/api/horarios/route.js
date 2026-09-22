// app/api/horarios/route.js

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

function normalizarPlaca(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
}

// =========================================================
// DOCUMENTACIÓN INSTRUCTOR
// =========================================================

function normalizarDocumento(valor) {
  return String(valor || '')
    .trim()
    .replace(/\s+/g, '')
}

function normalizarTextoComparacion(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .replace(/\s+/g, ' ')
}

function normalizarTipoLicencia(valor) {
  const tipo =
    String(valor || '')
      .trim()
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .toUpperCase()
      .replace(/\s+/g, ' ')

  if (
    tipo ===
      'CONDUCCION' ||
    tipo ===
      'LICENCIA DE CONDUCCION'
  ) {
    return 'CONDUCCION'
  }

  if (
    tipo ===
      'INSTRUCTOR' ||
    tipo ===
      'CERTIFICADO DE INSTRUCTOR' ||
    tipo ===
      'CERTIFICADO INSTRUCTOR'
  ) {
    return 'INSTRUCTOR'
  }

  return tipo
}

function fechaValida(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    normalizarTexto(valor)
  )
}

function registroVigenteEnFecha(
  registro,
  fechaReferencia
) {
  const vigencia =
    normalizarTexto(
      registro?.vigencia
    ).slice(
      0,
      10
    )

  if (
    !vigencia ||
    !fechaValida(vigencia)
  ) {
    return false
  }

  return (
    vigencia >=
    fechaReferencia
  )
}

function ultimoRegistroLicencia(
  registros
) {
  const lista =
    Array.isArray(registros)
      ? [...registros]
      : []

  lista.sort(
    (a, b) => {
      const fechaA =
        String(
          a?.fecha_actualizacion ||
          ''
        )

      const fechaB =
        String(
          b?.fecha_actualizacion ||
          ''
        )

      if (
        fechaA !== fechaB
      ) {
        return fechaB.localeCompare(
          fechaA
        )
      }

      return (
        Number(
          b?.id || 0
        ) -
        Number(
          a?.id || 0
        )
      )
    }
  )

  return (
    lista[0] ||
    null
  )
}

function evaluarDocumentacionInstructorHorario({
  licencias,
  fechaReferencia,
}) {
  const registros =
    Array.isArray(
      licencias
    )
      ? licencias
      : []

  // =======================================================
  // NORMALIZAR Y ORDENAR HISTORIAL
  // =======================================================
  //
  // licencias_personal conserva registros históricos.
  //
  // Para validar la operación NO debemos buscar cualquier
  // registro antiguo que todavía tenga una vigencia futura.
  //
  // Se toma el registro MÁS RECIENTE de cada grupo:
  //
  // CONDUCCION A2
  // CONDUCCION B/C
  // INSTRUCTOR A2
  // INSTRUCTOR B/C
  //
  // Igual que en Actualizar Documentos.
  // =======================================================

  const normalizados =
    registros
      .map(
        registro => ({
          ...registro,

          tipo_normalizado:
            normalizarTipoLicencia(
              registro
                ?.tipo_licencia
            ),

          categoria_normalizada:
            String(
              registro
                ?.categoria ||
              ''
            )
              .trim()
              .toUpperCase()
              .replace(
                /\s+/g,
                ''
              ),
        })
      )
      .sort(
        (a, b) => {
          const fechaA =
            String(
              a
                ?.fecha_actualizacion ||
              ''
            )

          const fechaB =
            String(
              b
                ?.fecha_actualizacion ||
              ''
            )

          if (
            fechaA !==
            fechaB
          ) {
            return fechaB.localeCompare(
              fechaA
            )
          }

          return (
            Number(
              b?.id ||
              0
            ) -
            Number(
              a?.id ||
              0
            )
          )
        }
      )

  const esA2 =
    categoria =>
      String(
        categoria ||
        ''
      )
        .trim()
        .toUpperCase()
        .replace(
          /\s+/g,
          ''
        ) ===
      'A2'

  const esBC =
    categoria => {
      const cat =
        String(
          categoria ||
          ''
        )
          .trim()
          .toUpperCase()
          .replace(
            /\s+/g,
            ''
          )

      return [
        'B1',
        'B1-C1',
        'B1C1',
        'B2-C2',
        'B2C2',
        'B3-C3',
        'B3C3',
      ].includes(
        cat
      )
    }

  // =======================================================
  // ÚLTIMO REGISTRO DE CADA GRUPO
  // =======================================================

  const ultimoConduccionA2 =
    normalizados.find(
      item =>
        item
          .tipo_normalizado ===
          'CONDUCCION' &&
        esA2(
          item
            .categoria_normalizada
        )
    ) ||
    null

  const ultimoConduccionBC =
    normalizados.find(
      item =>
        item
          .tipo_normalizado ===
          'CONDUCCION' &&
        esBC(
          item
            .categoria_normalizada
        )
    ) ||
    null

  const ultimoInstructorA2 =
    normalizados.find(
      item =>
        item
          .tipo_normalizado ===
          'INSTRUCTOR' &&
        esA2(
          item
            .categoria_normalizada
        )
    ) ||
    null

  const ultimoInstructorBC =
    normalizados.find(
      item =>
        item
          .tipo_normalizado ===
          'INSTRUCTOR' &&
        esBC(
          item
            .categoria_normalizada
        )
    ) ||
    null

  // =======================================================
  // EVALUAR VIGENCIA DE LOS REGISTROS ACTUALES
  // =======================================================

  const instructorA2Vigente =
    ultimoInstructorA2 &&
    registroVigenteEnFecha(
      ultimoInstructorA2,
      fechaReferencia
    )

  const instructorBCVigente =
    ultimoInstructorBC &&
    registroVigenteEnFecha(
      ultimoInstructorBC,
      fechaReferencia
    )

  const conduccionA2Vigente =
    ultimoConduccionA2 &&
    registroVigenteEnFecha(
      ultimoConduccionA2,
      fechaReferencia
    )

  const conduccionBCVigente =
    ultimoConduccionBC &&
    registroVigenteEnFecha(
      ultimoConduccionBC,
      fechaReferencia
    )

  // =======================================================
  // REGLA GENERAL DE HABILITACIÓN
  // =======================================================
  //
  // Para entrar a Horarios debe existir:
  //
  // - al menos un Certificado de INSTRUCTOR vigente
  // - al menos una Licencia de CONDUCCION vigente
  //
  // La categoría específica se valida después en
  // Programación de Clases.
  // =======================================================

  const tieneInstructor =
  Boolean(
    ultimoInstructorA2 ||
    ultimoInstructorBC
  )

const tieneConduccion =
  Boolean(
    ultimoConduccionA2 ||
    ultimoConduccionBC
  )

const instructorVigente =
  Boolean(
    tieneInstructor &&
    (
      !ultimoInstructorA2 ||
      instructorA2Vigente
    ) &&
    (
      !ultimoInstructorBC ||
      instructorBCVigente
    )
  )

const conduccionVigente =
  Boolean(
    tieneConduccion &&
    (
      !ultimoConduccionA2 ||
      conduccionA2Vigente
    ) &&
    (
      !ultimoConduccionBC ||
      conduccionBCVigente
    )
  )
  
  const detalle = []

  if (
    ultimoInstructorA2
  ) {
    detalle.push({
      tipo:
        'INSTRUCTOR A2',

      registrado:
        true,

      vigente:
        Boolean(
          instructorA2Vigente
        ),

      vigencia:
        ultimoInstructorA2
          ?.vigencia ||
        '',

      categoria:
        ultimoInstructorA2
          ?.categoria ||
        '',

      numero_certificado:
        ultimoInstructorA2
          ?.numero_certificado ||
        '',
    })
  }

  if (
    ultimoInstructorBC
  ) {
    detalle.push({
      tipo:
        'INSTRUCTOR B/C',

      registrado:
        true,

      vigente:
        Boolean(
          instructorBCVigente
        ),

      vigencia:
        ultimoInstructorBC
          ?.vigencia ||
        '',

      categoria:
        ultimoInstructorBC
          ?.categoria ||
        '',

      numero_certificado:
        ultimoInstructorBC
          ?.numero_certificado ||
        '',
    })
  }

  if (
    ultimoConduccionA2
  ) {
    detalle.push({
      tipo:
        'CONDUCCIÓN A2',

      registrado:
        true,

      vigente:
        Boolean(
          conduccionA2Vigente
        ),

      vigencia:
        ultimoConduccionA2
          ?.vigencia ||
        '',

      categoria:
        ultimoConduccionA2
          ?.categoria ||
        '',

      numero_certificado:
        '',
    })
  }

  if (
    ultimoConduccionBC
  ) {
    detalle.push({
      tipo:
        'CONDUCCIÓN B/C',

      registrado:
        true,

      vigente:
        Boolean(
          conduccionBCVigente
        ),

      vigencia:
        ultimoConduccionBC
          ?.vigencia ||
        '',

      categoria:
        ultimoConduccionBC
          ?.categoria ||
        '',

      numero_certificado:
        '',
    })
  }

  // Si no existe ningún registro del tipo,
  // lo agregamos para que el modal lo informe.

  if (
    !ultimoInstructorA2 &&
    !ultimoInstructorBC
  ) {
    detalle.push({
      tipo:
        'INSTRUCTOR',

      registrado:
        false,

      vigente:
        false,

      vigencia:
        '',

      categoria:
        '',

      numero_certificado:
        '',
    })
  }

  if (
    !ultimoConduccionA2 &&
    !ultimoConduccionBC
  ) {
    detalle.push({
      tipo:
        'CONDUCCIÓN',

      registrado:
        false,

      vigente:
        false,

      vigencia:
        '',

      categoria:
        '',

      numero_certificado:
        '',
    })
  }

  const valido =
    instructorVigente &&
    conduccionVigente

  let motivo =
    ''

  if (
  !tieneInstructor
) {
  motivo =
    'No tiene Certificado de INSTRUCTOR registrado.'
} else if (
  !instructorVigente
) {
  motivo =
    'Tiene uno o más Certificados de INSTRUCTOR vencidos o sin vigencia.'
} else if (
  !tieneConduccion
) {
  motivo =
    'No tiene Licencia de CONDUCCIÓN registrada.'
} else if (
  !conduccionVigente
) {
  motivo =
    'Tiene una o más Licencias de CONDUCCIÓN vencidas o sin vigencia.'
}
  return {
    valido,
    motivo,
    detalle,
  }
}

async function consultarDocumentacionInstructorHorario(
  supabase,
  documento,
  fechaReferencia
) {
  const documentoNormalizado =
    normalizarDocumento(
      documento
    )

  if (
    !documentoNormalizado
  ) {
    return {
      valido:
        false,

      motivo:
        'No fue posible identificar el documento del instructor.',

      instructor:
        null,

      detalle:
        [],
    }
  }

  const {
    data:
      instructor,

    error:
      instructorError,
  } =
    await supabase
      .from(
        'personal'
      )
      .select(`
        id,
        tipo_documento,
        documento,
        nombres,
        apellidos,
        estado
      `)
      .eq(
        'documento',
        documentoNormalizado
      )
      .maybeSingle()

  if (
    instructorError
  ) {
    throw new Error(
      `No fue posible consultar el instructor: ${instructorError.message}`
    )
  }

  if (
    !instructor
  ) {
    return {
      valido:
        false,

      motivo:
        'El instructor no se encuentra registrado en Personal.',

      instructor:
        null,

      detalle:
        [],
    }
  }

  const {
    data:
      licencias,

    error:
      licenciasError,
  } =
    await supabase
      .from(
        'licencias_personal'
      )
      .select(`
        id,
        personal_id,
        documento,
        tipo_licencia,
        categoria,
        vigencia,
        numero_certificado,
        fecha_actualizacion,
        observaciones
      `)
      .eq(
        'personal_id',
        instructor.id
      )

  if (
    licenciasError
  ) {
    throw new Error(
      `No fue posible consultar las licencias del instructor: ${licenciasError.message}`
    )
  }

  const validacion =
    evaluarDocumentacionInstructorHorario({
      licencias:
        licencias || [],

      fechaReferencia,
    })

  return {
    ...validacion,

    instructor,
  }
}

// =========================================================
// DURACIÓN DE JORNADA
// =========================================================
//
// IMPORTANTE:
//
// 45 minutos por clase:
// Se utiliza en el FRONTEND como tiempo mínimo operativo
// para permitir cerrar la jornada.
//
// 50 minutos por clase:
// Se utiliza aquí para calcular la duración/permanencia
// académica registrada en duracion_jornada.
//
// Estas dos reglas cumplen propósitos diferentes.
// =========================================================

function calcDuracionHoras(clasesDictadas) {
  const clases =
    Number(clasesDictadas || 0)

  const horas =
    (clases * 50) / 60

  return (
    Math.round(
      horas * 10
    ) / 10
  )
}

// =========================================================
// VALIDACIÓN DE KILOMETRAJE EN SERVIDOR
// =========================================================

async function validarKilometrajeServidor(
  supabase,
  placa,
  kilometraje
) {
  const placaNormalizada =
    normalizarPlaca(placa)

  const kmActual =
    Number(kilometraje)

  if (!placaNormalizada) {
    return {
      estado: 'error',
      mensaje:
        'No se recibió una placa válida para verificar el kilometraje.',
      maxKm: 0,
      fuente: '',
      campo: '',
    }
  }

  if (
    !Number.isFinite(kmActual) ||
    kmActual < 0
  ) {
    return {
      estado: 'error',
      mensaje:
        'El kilometraje no es válido.',
      maxKm: 0,
      fuente: '',
      campo: '',
    }
  }

  const consultas = [
    {
      tabla:
        'preoperacionales',
      campo:
        'km_registro',
    },
    {
      tabla:
        'horarios',
      campo:
        'km_inicial',
    },
    {
      tabla:
        'horarios',
      campo:
        'km_final',
    },
    {
      tabla:
        'mantenimientos',
      campo:
        'kilometraje',
    },
    {
      tabla:
        'reporte_fallas',
      campo:
        'kilometraje',
    },
  ]

  let maxKm = 0
  let fuente = ''
  let campo = ''

  for (
    const consulta of consultas
  ) {
    const {
      data,
      error,
    } = await supabase
      .from(
        consulta.tabla
      )
      .select(
        consulta.campo
      )
      .eq(
        'placa',
        placaNormalizada
      )
      .not(
        consulta.campo,
        'is',
        null
      )
      .order(
        consulta.campo,
        {
          ascending: false,
        }
      )
      .limit(1)

    if (error) {
      console.error(
        `Error validando kilometraje en ${consulta.tabla}.${consulta.campo}:`,
        error
      )

      throw new Error(
        `No fue posible validar el kilometraje contra ${consulta.tabla}.`
      )
    }

    if (
      Array.isArray(data) &&
      data.length > 0
    ) {
      const valor =
        Number(
          data[0][
            consulta.campo
          ]
        )

      if (
        Number.isFinite(valor) &&
        valor > maxKm
      ) {
        maxKm = valor
        fuente =
          consulta.tabla
        campo =
          consulta.campo
      }
    }
  }

  if (maxKm === 0) {
    return {
      estado: 'ok',
      mensaje:
        'No existen registros previos de kilometraje.',
      maxKm: 0,
      diferencia: 0,
      fuente: '',
      campo: '',
    }
  }

  if (kmActual < maxKm) {
    return {
      estado:
        'error',

      mensaje:
        `El kilometraje ingresado (${kmActual}) es menor al último registrado (${maxKm}) en ${fuente}.`,

      maxKm,

      diferencia:
        kmActual - maxKm,

      fuente,

      campo,
    }
  }

  const diferencia =
    kmActual - maxKm

  if (diferencia > 300) {
    return {
      estado:
        'advertencia',

      mensaje:
        `La diferencia de kilometraje (${diferencia} km) supera el límite de 300 km respecto al último registrado (${maxKm}).`,

      maxKm,

      diferencia,

      fuente,

      campo,
    }
  }

  return {
    estado: 'ok',

    mensaje:
      'Kilometraje válido.',

    maxKm,

    diferencia,

    fuente,

    campo,
  }
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
    // DOCUMENTACIÓN INSTRUCTOR
    // =====================================================

    if (
      recurso ===
      'documentacion_instructor'
    ) {
      const documento =
        normalizarDocumento(
          searchParams.get(
            'documento'
          )
        )

      const fecha =
        normalizarTexto(
          searchParams.get(
            'fecha'
          )
        )

      if (
        !documento
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El documento del instructor es obligatorio.',
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

      const validacion =
        await consultarDocumentacionInstructorHorario(
          supabase,
          documento,
          fecha
        )

      return NextResponse.json({
        status:
          'success',

        valido:
          validacion.valido,

        motivo:
          validacion.motivo,

        instructor:
          validacion.instructor,

        detalle:
          validacion.detalle,
      })
    }

    // =====================================================
    // VEHÍCULOS
    // =====================================================

    if (
      recurso ===
      'vehiculos'
    ) {
      const {
        data,
        error,
      } = await supabase
        .from('vehiculos')
        .select(`
          placa,
          tipo_vehiculo,
          marca
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
              error.message,
          },
          {
            status: 500,
          }
        )
      }

      return NextResponse.json({
        status:
          'success',

        vehiculos:
          data || [],
      })
    }

    // =====================================================
    // JORNADA ABIERTA DEL USUARIO
    // =====================================================

    if (
      recurso ===
      'jornada_abierta'
    ) {
      const usuario =
        normalizarTexto(
          searchParams.get(
            'usuario'
          )
        )

      const fecha =
        normalizarTexto(
          searchParams.get(
            'fecha'
          )
        )

      if (
        !usuario ||
        !fecha
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'Usuario y fecha son obligatorios.',
          },
          {
            status:
              400,
          }
        )
      }

      const {
        data,
        error,
      } = await supabase
        .from('horarios')
        .select(`
          id,
          placa,
          km_inicial,
          clases_programadas,
          fecha_entrada,
          hora_entrada,
          timestamp_entrada,
          estado_registro
        `)
        .eq(
          'usuario',
          usuario
        )
        .eq(
          'fecha_entrada',
          fecha
        )
        .eq(
          'estado_registro',
          'Abierto'
        )
        .order(
          'timestamp_entrada',
          {
            ascending: false,
          }
        )
        .limit(1)

      if (error) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              error.message,
          },
          {
            status: 500,
          }
        )
      }

      return NextResponse.json({
        status:
          'success',

        jornada:
          data?.length
            ? data[0]
            : null,
      })
    }

    // =====================================================
    // PLACA EN USO
    // =====================================================

    if (
      recurso ===
      'placa_en_uso'
    ) {
      const placa =
        normalizarPlaca(
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
        !placa ||
        !fecha
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'Placa y fecha son obligatorios.',
          },
          {
            status:
              400,
          }
        )
      }

      const {
        data,
        error,
      } = await supabase
        .from('horarios')
        .select(`
          id,
          usuario,
          nombre_completo,
          placa,
          fecha_entrada,
          hora_entrada,
          estado_registro
        `)
        .eq(
          'placa',
          placa
        )
        .eq(
          'fecha_entrada',
          fecha
        )
        .eq(
          'estado_registro',
          'Abierto'
        )
        .limit(1)

      if (error) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              error.message,
          },
          {
            status: 500,
          }
        )
      }

      return NextResponse.json({
        status:
          'success',

        enUso:
          data?.length
            ? data[0]
            : null,
      })
    }

    // =====================================================
    // PREOPERACIONAL DEL DÍA
    // =====================================================

    if (
      recurso ===
      'preoperacional'
    ) {
      const placa =
        normalizarPlaca(
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
        !placa ||
        !fecha
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'Placa y fecha son obligatorios.',
          },
          {
            status:
              400,
          }
        )
      }

      const {
        data,
        error,
      } = await supabase
        .from(
          'preoperacionales'
        )
        .select('id')
        .eq(
          'placa',
          placa
        )
        .eq(
          'fecha_registro',
          fecha
        )
        .limit(1)

      if (error) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              error.message,
          },
          {
            status: 500,
          }
        )
      }

      return NextResponse.json({
        status:
          'success',

        existe:
          Boolean(
            data?.length
          ),
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
      'Error GET /api/horarios:',
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
        body.accion
      )

    // =====================================================
    // REGISTRAR ENTRADA
    // =====================================================

    if (
      accion ===
      'entrada'
    ) {
      const timestampEntrada =
        normalizarTexto(
          body.timestamp_entrada
        )

      const fechaEntrada =
        normalizarTexto(
          body.fecha_entrada
        )

      const horaEntrada =
        normalizarTexto(
          body.hora_entrada
        )

      const usuario =
        normalizarTexto(
          body.usuario
        )

      const documentoInstructor =
        normalizarDocumento(
          body.documento_instructor
        )

      const nombreCompleto =
        normalizarTexto(
          body.nombre_completo
        )

      const placa =
        normalizarPlaca(
          body.placa
        )

      const km =
        Number(
          body.km_inicial
        )

      const clases =
        Number(
          body.clases_programadas
        )

      // ===================================================
      // DATOS OBLIGATORIOS
      // ===================================================

      if (
        !timestampEntrada ||
        !fechaEntrada ||
        !horaEntrada ||
        !usuario ||
        !documentoInstructor ||
        !nombreCompleto ||
        !placa
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'Faltan datos obligatorios para registrar la entrada.',
          },
          {
            status: 400,
          }
        )
      }

      // ===================================================
      // VALIDAR DOCUMENTACIÓN DEL INSTRUCTOR
      // ===================================================

      const validacionDocumentalInstructor =
        await consultarDocumentacionInstructorHorario(
          supabase,
          documentoInstructor,
          fechaEntrada
        )

      if (
        !validacionDocumentalInstructor
          .valido
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            codigo:
              'INSTRUCTOR_DOCUMENTACION_NO_VIGENTE',

            message:
              validacionDocumentalInstructor
                .motivo,

            detalle:
              validacionDocumentalInstructor
                .detalle,
          },
          {
            status:
              409,
          }
        )
      }

      // ===================================================
      // KILOMETRAJE BÁSICO
      // ===================================================

      if (
        !Number.isFinite(km) ||
        km < 0
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El kilometraje inicial no es válido.',
          },
          {
            status: 400,
          }
        )
      }

      // ===================================================
      // CLASES PROGRAMADAS
      // ===================================================

      if (
        !Number.isFinite(
          clases
        ) ||
        !Number.isInteger(
          clases
        ) ||
        clases < 1
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'Debe registrar al menos una clase programada.',
          },
          {
            status: 400,
          }
        )
      }

      // ===================================================
      // VALIDAR VEHÍCULO
      // ===================================================

      const {
        data:
          vehiculo,

        error:
          vehiculoError,
      } =
        await supabase
          .from(
            'vehiculos'
          )
          .select(`
            id,
            placa,
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
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              vehiculoError.message,
          },
          {
            status:
              500,
          }
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
      // VALIDAR KILOMETRAJE HISTÓRICO
      // ===================================================

      const validacionKmEntrada =
        await validarKilometrajeServidor(
          supabase,
          placa,
          km
        )

      if (
        validacionKmEntrada
          .estado ===
        'error'
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              validacionKmEntrada
                .mensaje,

            maxKm:
              validacionKmEntrada
                .maxKm,

            fuente:
              validacionKmEntrada
                .fuente,

            campo:
              validacionKmEntrada
                .campo,
          },
          {
            status:
              400,
          }
        )
      }

      // ===================================================
      // VERIFICAR JORNADA DEL MISMO USUARIO
      // ===================================================

      const {
        data:
          jornadaUsuario,

        error:
          jornadaError,
      } =
        await supabase
          .from(
            'horarios'
          )
          .select(
            'id'
          )
          .eq(
            'usuario',
            usuario
          )
          .eq(
            'fecha_entrada',
            fechaEntrada
          )
          .eq(
            'estado_registro',
            'Abierto'
          )
          .limit(
            1
          )

      if (
        jornadaError
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              jornadaError.message,
          },
          {
            status:
              500,
          }
        )
      }

      if (
        jornadaUsuario
          ?.length
      ) {
        return NextResponse.json(
          {
            status:
              'warning',

            message:
              'Ya tienes una jornada abierta hoy.',
          },
          {
            status:
              409,
          }
        )
      }

      // ===================================================
      // VERIFICAR PLACA EN USO
      // ===================================================

      const {
        data:
          placaEnUso,

        error:
          placaError,
      } =
        await supabase
          .from(
            'horarios'
          )
          .select(`
            id,
            nombre_completo,
            hora_entrada
          `)
          .eq(
            'placa',
            placa
          )
          .eq(
            'fecha_entrada',
            fechaEntrada
          )
          .eq(
            'estado_registro',
            'Abierto'
          )
          .limit(
            1
          )

      if (
        placaError
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              placaError.message,
          },
          {
            status:
              500,
          }
        )
      }

      if (
        placaEnUso
          ?.length
      ) {
        return NextResponse.json(
          {
            status:
              'warning',

            message:
              `La placa ${placa} ya está siendo utilizada.`,

            enUso:
              placaEnUso[0],
          },
          {
            status:
              409,
          }
        )
      }

      // ===================================================
      // VERIFICAR PREOPERACIONAL
      // ===================================================

      const {
        data:
          preoperacional,

        error:
          preoperacionalError,
      } =
        await supabase
          .from(
            'preoperacionales'
          )
          .select(
            'id'
          )
          .eq(
            'placa',
            placa
          )
          .eq(
            'fecha_registro',
            fechaEntrada
          )
          .limit(
            1
          )

      if (
        preoperacionalError
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              preoperacionalError
                .message,
          },
          {
            status:
              500,
          }
        )
      }

      if (
        !preoperacional
          ?.length
      ) {
        return NextResponse.json(
          {
            status:
              'warning',

            message:
              `No existe inspección preoperacional de hoy para ${placa}.`,
          },
          {
            status:
              409,
          }
        )
      }

      // ===================================================
      // INSERTAR ENTRADA
      // ===================================================

      const {
        data:
          inserted,

        error,
      } =
        await supabase
          .from(
            'horarios'
          )
          .insert({
            timestamp_entrada:
              timestampEntrada,

            fecha_entrada:
              fechaEntrada,

            hora_entrada:
              horaEntrada,

            usuario,

            nombre_completo:
              nombreCompleto,

            rol:
              'INSTRUCTOR PRÁCTICA',

            placa,

            km_inicial:
              km,

            clases_programadas:
              clases,

            estado_registro:
              'Abierto',
          })
          .select(`
            id,
            placa,
            km_inicial,
            clases_programadas,
            fecha_entrada,
            hora_entrada,
            timestamp_entrada
          `)
          .single()

      if (
        error
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              `No se pudo registrar la entrada: ${error.message}`,
          },
          {
            status:
              500,
          }
        )
      }

      return NextResponse.json(
        {
          status:
            'success',

          message:
            'Entrada registrada correctamente.',

          jornada:
            inserted,
        },
        {
          status:
            201,
        }
      )
    }

    // =====================================================
    // REGISTRAR SALIDA
    // =====================================================

    if (
      accion ===
      'salida'
    ) {
      const id =
        Number(
          body.id
        )

      const timestampSalida =
        normalizarTexto(
          body.timestamp_salida
        )

      const fechaSalida =
        normalizarTexto(
          body.fecha_salida
        )

      const horaSalida =
        normalizarTexto(
          body.hora_salida
        )

      const kmFinal =
        Number(
          body.km_final
        )

      const clases =
        Number(
          body.clases_dictadas
        )

      const aprendices =
        Number(
          body.num_aprendices
        )

      // ===================================================
      // DATOS BÁSICOS
      // ===================================================

      if (
        !Number.isInteger(id) ||
        id <= 0 ||
        !timestampSalida ||
        !fechaSalida ||
        !horaSalida
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'Faltan datos obligatorios para registrar la salida.',
          },
          {
            status:
              400,
          }
        )
      }

      // ===================================================
      // KILOMETRAJE FINAL BÁSICO
      // ===================================================

      if (
        !Number.isFinite(
          kmFinal
        ) ||
        kmFinal < 0
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El kilometraje final no es válido.',
          },
          {
            status:
              400,
          }
        )
      }

      // ===================================================
      // CLASES
      // ===================================================

      if (
        !Number.isFinite(
          clases
        ) ||
        !Number.isInteger(
          clases
        ) ||
        clases < 0 ||
        clases > 12
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'Las clases dictadas deben estar entre 0 y 12.',
          },
          {
            status:
              400,
          }
        )
      }

      // ===================================================
      // APRENDICES
      // ===================================================

      if (
        !Number.isFinite(
          aprendices
        ) ||
        !Number.isInteger(
          aprendices
        ) ||
        aprendices < 0 ||
        aprendices > 6
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El número de aprendices debe estar entre 0 y 6.',
          },
          {
            status:
              400,
          }
        )
      }

      // ===================================================
      // OBTENER JORNADA
      // ===================================================

      const {
        data:
          jornada,

        error:
          jornadaError,
      } =
        await supabase
          .from(
            'horarios'
          )
          .select(`
            id,
            placa,
            km_inicial,
            estado_registro
          `)
          .eq(
            'id',
            id
          )
          .maybeSingle()

      if (
        jornadaError
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              jornadaError.message,
          },
          {
            status:
              500,
          }
        )
      }

      if (
        !jornada
      ) {
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

      // ===================================================
      // VALIDAR ESTADO
      // ===================================================

      if (
        String(
          jornada
            .estado_registro ||
          ''
        ).toLowerCase() !==
        'abierto'
      ) {
        return NextResponse.json(
          {
            status:
              'warning',

            message:
              'La jornada ya fue cerrada.',
          },
          {
            status:
              409,
          }
        )
      }

      // ===================================================
      // KM FINAL >= KM INICIAL
      // ===================================================

      const kmInicial =
        Number(
          jornada
            .km_inicial ||
          0
        )

      if (
        kmFinal <
        kmInicial
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              'El kilometraje final no puede ser menor al kilometraje inicial.',
          },
          {
            status:
              400,
          }
        )
      }

      // ===================================================
      // VALIDAR KILOMETRAJE HISTÓRICO
      // ===================================================

      const validacionKmSalida =
        await validarKilometrajeServidor(
          supabase,
          jornada.placa,
          kmFinal
        )

      if (
        validacionKmSalida
          .estado ===
        'error'
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              validacionKmSalida
                .mensaje,

            maxKm:
              validacionKmSalida
                .maxKm,

            fuente:
              validacionKmSalida
                .fuente,

            campo:
              validacionKmSalida
                .campo,
          },
          {
            status:
              400,
          }
        )
      }

      // ===================================================
      // DURACIÓN ACADÉMICA
      // ===================================================

      const duracion =
        calcDuracionHoras(
          clases
        )

      // ===================================================
      // CERRAR JORNADA
      // ===================================================

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
              timestampSalida,

            fecha_salida:
              fechaSalida,

            hora_salida:
              horaSalida,

            km_final:
              kmFinal,

            clases_dictadas:
              clases,

            num_aprendices:
              aprendices,

            duracion_jornada:
              duracion,

            estado_registro:
              'Cerrado',
          })
          .eq(
            'id',
            id
          )
          .select()
          .single()

      if (
        error
      ) {
        return NextResponse.json(
          {
            status:
              'failed',

            message:
              `No se pudo registrar la salida: ${error.message}`,
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
          'Salida registrada correctamente.',

        jornada:
          data,

        duracion,
      })
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
        status:
          400,
      }
    )
  } catch (error) {
    console.error(
      'Error POST /api/horarios:',
      error
    )

    return respuestaError(
      error
    )
  }
}