// app/api/admin/caja/egresos/catalogos/route.js

import {

  NextResponse,

} from 'next/server'

import {

  obtenerSupabaseAdminEmpresaDesdeRequest,

  respuestaErrorEmpresa,

} from '@/lib/supabaseEmpresaServer'

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

// VALIDAR NATURALEZA

// =========================================================

function naturalezaValida(

  valor

) {

  return [

    'INGRESO',

    'EGRESO',

    'AMBOS',

  ].includes(

    mayusculas(

      valor

    )

  )

}

const CATEGORIAS_PESV_VALIDAS = new Set([
  'MANTENIMIENTO_SEGURIDAD',
  'CAPACITACION',
  'SENALIZACION',
  'TECNOLOGIA_MONITOREO',
  'EMERGENCIAS',
  'GESTION_PESV',
  'OTROS',
])

function categoriaPesvValida(valor) {
  return CATEGORIAS_PESV_VALIDAS.has(mayusculas(valor))
}

// =========================================================

// CONSULTAR CONCEPTO POR NOMBRE

// =========================================================

async function buscarConceptoPorNombre(

  supabase,

  nombre

) {

  const nombreNormalizado =

    mayusculas(

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

        descripcion,

        naturaleza,

        requiere_aprendiz,

        requiere_vehiculo,

        es_gasto_pesv,

        categoria_pesv,

        activo,

        created_at,

        updated_at

      `)

      .ilike(

        'nombre',

        nombreNormalizado

      )

      .maybeSingle()

  if (

    error

  ) {

    throw new Error(

      `No fue posible validar el concepto: ${error.message}`

    )

  }

  return data

}

// =========================================================

// GET

// =========================================================

//

// Devuelve:

//

// conceptos

// mediosPago

// personal

// vehiculos

//

// En una sola llamada.

//

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

    // =====================================================

    // CONSULTAS PARALELAS

    // =====================================================

    const [

      conceptosResultado,

      mediosResultado,

      personalResultado,

      vehiculosResultado,

    ] =

      await Promise.all([

        // =================================================

        // CONCEPTOS

        // =================================================

        supabase

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

            activo,

            created_at,

            updated_at

          `)

          .in(

            'naturaleza',

            [

              'EGRESO',

              'AMBOS',

            ]

          )

          .order(

            'nombre',

            {

              ascending:

                true,

            }

          ),

        // =================================================

        // MEDIOS DE PAGO

        // =================================================

        supabase

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

            'activo',

            true

          )

          .order(

            'nombre',

            {

              ascending:

                true,

            }

          ),

        // =================================================

        // PERSONAL

        // =================================================

        supabase

          .from(

            'personal'

          )

          .select(`

            id,

            tipo_personal,

            tipo_documento,

            documento,

            nombres,

            apellidos,

            cargo,

            estado,

            telefono,

            email

          `)

          .eq(

            'estado',

            'activo'

          )

          .order(

            'nombres',

            {

              ascending:

                true,

            }

          ),

        // =================================================

        // VEHÍCULOS

        // =================================================

        supabase

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

          .order(

            'placa',

            {

              ascending:

                true,

            }

          ),

      ])

    // =====================================================

    // ERRORES

    // =====================================================

    if (

      conceptosResultado.error

    ) {

      throw new Error(

        `No fue posible cargar los conceptos: ${conceptosResultado.error.message}`

      )

    }

    if (

      mediosResultado.error

    ) {

      throw new Error(

        `No fue posible cargar los medios de pago: ${mediosResultado.error.message}`

      )

    }

    if (

      personalResultado.error

    ) {

      throw new Error(

        `No fue posible cargar el personal: ${personalResultado.error.message}`

      )

    }

    if (

      vehiculosResultado.error

    ) {

      throw new Error(

        `No fue posible cargar los vehículos: ${vehiculosResultado.error.message}`

      )

    }

    // =====================================================

    // NORMALIZAR CONCEPTOS

    // =====================================================

    const conceptos =

      (

        conceptosResultado.data ||

        []

      ).map(

        concepto => ({

          ...concepto,

          nombre:

            mayusculas(

              concepto.nombre

            ),

          naturaleza:

            mayusculas(

              concepto.naturaleza

            ),

          descripcion:

            texto(

              concepto.descripcion

            ),

          requiere_aprendiz:

            concepto

              .requiere_aprendiz ===

            true,

          requiere_vehiculo:

            concepto

              .requiere_vehiculo ===

            true,

          es_gasto_pesv:

            concepto

              .es_gasto_pesv ===

            true,

          activo:

            concepto.activo ===

            true,

        })

      )

    // =====================================================

    // NORMALIZAR MEDIOS

    // =====================================================

    const mediosPago =

      (

        mediosResultado.data ||

        []

      ).map(

        medio => ({

          ...medio,

          nombre:

            mayusculas(

              medio.nombre

            ),

          descripcion:

            texto(

              medio.descripcion

            ),

          activo:

            medio.activo ===

            true,

        })

      )

    // =====================================================

    // NORMALIZAR PERSONAL

    // =====================================================

    const personal =

      (

        personalResultado.data ||

        []

      ).map(

        persona => {

          const nombres =

            mayusculas(

              persona.nombres

            )

          const apellidos =

            mayusculas(

              persona.apellidos

            )

          return {

            ...persona,

            nombres,

            apellidos,

            nombre_completo:

              [

                nombres,

                apellidos,

              ]

                .filter(

                  Boolean

                )

                .join(

                  ' '

                )

                .trim(),

            tipo_documento:

              mayusculas(

                persona.tipo_documento

              ) ||

              'CC',

            documento:

              texto(

                persona.documento

              ),

            cargo:

              mayusculas(

                persona.cargo

              ),

            tipo_personal:

              mayusculas(

                persona.tipo_personal

              ),

            estado:

              mayusculas(

                persona.estado

              ),

          }

        }

      )

    // =====================================================

    // NORMALIZAR VEHÍCULOS

    // =====================================================

    const vehiculos =

      (

        vehiculosResultado.data ||

        []

      ).map(

        vehiculo => ({

          ...vehiculo,

          placa:

            mayusculas(

              vehiculo.placa

            ),

          tipo_vehiculo:

            mayusculas(

              vehiculo.tipo_vehiculo

            ),

          marca:

            mayusculas(

              vehiculo.marca

            ),

          linea:

            mayusculas(

              vehiculo.linea

            ),

          estado:

            mayusculas(

              vehiculo.estado

            ),

          propietario:

            mayusculas(

              vehiculo.propietario

            ),

          clasificacion:

            mayusculas(

              vehiculo.clasificacion

            ),

        })

      )

    // =====================================================

    // RESPUESTA

    // =====================================================

    return NextResponse.json({

      status:

        'success',

      data: {

        conceptos,

        mediosPago,

        personal,

        vehiculos,

      },

      empresa: {

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

    telefono:

    empresa?.telefono ||

    '',

  email:

    empresa?.email_principal ||

    '',

},

    })

  } catch (

    error

  ) {

    console.error(

      'Error GET /api/admin/caja/egresos/catalogos:',

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

// ADMINISTRACIÓN DE CONCEPTOS

//

// acciones:

//

// crear_concepto

// editar_concepto

// activar_concepto

// desactivar_concepto

//

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

    // CREAR CONCEPTO

    // =====================================================

    if (

      accion ===

      'crear_concepto'

    ) {

      const nombre =

        mayusculas(

          body?.nombre

        )

      const descripcion =

        texto(

          body?.descripcion

        )

      const naturaleza =

        mayusculas(

          body?.naturaleza ||

          'EGRESO'

        )

      const requiereAprendiz =

        body?.requiere_aprendiz ===

        true

      const requiereVehiculo =

        body?.requiere_vehiculo ===

        true

      const esGastoPesv =

        body?.es_gasto_pesv ===

        true

      const categoriaPesv =

        esGastoPesv

          ? mayusculas(body?.categoria_pesv)

          : null

      // ===================================================

      // VALIDACIONES

      // ===================================================

      if (

        !nombre

      ) {

        return NextResponse.json(

          {

            status:

              'error',

            message:

              'Ingrese el nombre del concepto.',

          },

          {

            status:

              400,

          }

        )

      }

      if (

        !naturalezaValida(

          naturaleza

        )

      ) {

        return NextResponse.json(

          {

            status:

              'error',

            message:

              'La naturaleza del concepto no es válida.',

          },

          {

            status:

              400,

          }

        )

      }

      if (

        esGastoPesv &&

        !categoriaPesvValida(categoriaPesv)

      ) {

        return NextResponse.json(

          {

            status: 'error',

            message: 'Seleccione una destinación PESV válida.',

          },

          { status: 400 }

        )

      }

      // ===================================================

      // VALIDAR DUPLICADO

      // ===================================================

      const existente =

        await buscarConceptoPorNombre(

          supabase,

          nombre

        )

      if (

        existente

      ) {

        return NextResponse.json(

          {

            status:

              'error',

            message:

              'Ya existe un concepto con ese nombre.',

          },

          {

            status:

              409,

          }

        )

      }

      // ===================================================

      // INSERT

      // ===================================================

      const {

        data,

        error,

      } =

        await supabase

          .from(

            'conceptos_caja'

          )

          .insert({

            nombre,

            descripcion:

              descripcion ||

              null,

            naturaleza,

            requiere_aprendiz:

              requiereAprendiz,

            requiere_vehiculo:

              requiereVehiculo,

            es_gasto_pesv:

              esGastoPesv,

            categoria_pesv:
              categoriaPesv,

            activo:

              true,

          })

          .select(`

            id,

            nombre,

            descripcion,

            naturaleza,

            requiere_aprendiz,

            requiere_vehiculo,

            es_gasto_pesv,

        categoria_pesv,

            activo,

            created_at,

            updated_at

          `)

          .single()

      if (

        error

      ) {

        return NextResponse.json(

          {

            status:

              'error',

            message:

              `No fue posible crear el concepto: ${error.message}`,

          },

          {

            status:

              400,

          }

        )

      }

      return NextResponse.json(

        {

          status:

            'success',

          message:

            'Concepto creado correctamente.',

          data,

          empresa: {

            nit:

              empresa?.nit ||

              '',

            nombre:

              empresa?.nombre ||

              '',

          },

        },

        {

          status:

            201,

        }

      )

    }

    // =====================================================

    // EDITAR CONCEPTO

    // =====================================================

    if (

      accion ===

      'editar_concepto'

    ) {

      const conceptoId =

        Number(

          body?.concepto_id

        )

      const nombre =

        mayusculas(

          body?.nombre

        )

      const descripcion =

        texto(

          body?.descripcion

        )

      const naturaleza =

        mayusculas(

          body?.naturaleza

        )

      const requiereAprendiz =

        body?.requiere_aprendiz ===

        true

      const requiereVehiculo =

        body?.requiere_vehiculo ===

        true

      const esGastoPesv =

        body?.es_gasto_pesv ===

        true

      const categoriaPesv =

        esGastoPesv

          ? mayusculas(body?.categoria_pesv)

          : null

      if (

        !Number.isInteger(

          conceptoId

        ) ||

        conceptoId <=

          0

      ) {

        return NextResponse.json(

          {

            status:

              'error',

            message:

              'El concepto seleccionado no es válido.',

          },

          {

            status:

              400,

          }

        )

      }

      if (

        !nombre

      ) {

        return NextResponse.json(

          {

            status:

              'error',

            message:

              'Ingrese el nombre del concepto.',

          },

          {

            status:

              400,

          }

        )

      }

      if (

        !naturalezaValida(

          naturaleza

        )

      ) {

        return NextResponse.json(

          {

            status:

              'error',

            message:

              'La naturaleza del concepto no es válida.',

          },

          {

            status:

              400,

          }

        )

      }

      if (

        esGastoPesv &&

        !categoriaPesvValida(categoriaPesv)

      ) {

        return NextResponse.json(

          {

            status: 'error',

            message: 'Seleccione una destinación PESV válida.',

          },

          { status: 400 }

        )

      }

      // ===================================================

      // VALIDAR OTRO CON EL MISMO NOMBRE

      // ===================================================

      const {

        data:

          conceptoDuplicado,

        error:

          errorDuplicado,

      } =

        await supabase

          .from(

            'conceptos_caja'

          )

          .select(`

            id,

            nombre

          `)

          .ilike(

            'nombre',

            nombre

          )

          .neq(

            'id',

            conceptoId

          )

          .maybeSingle()

      if (

        errorDuplicado

      ) {

        throw new Error(

          `No fue posible validar el concepto: ${errorDuplicado.message}`

        )

      }

      if (

        conceptoDuplicado

      ) {

        return NextResponse.json(

          {

            status:

              'error',

            message:

              'Ya existe otro concepto con ese nombre.',

          },

          {

            status:

              409,

          }

        )

      }

      // ===================================================

      // UPDATE

      // ===================================================

      const {

        data,

        error,

      } =

        await supabase

          .from(

            'conceptos_caja'

          )

          .update({

            nombre,

            descripcion:

              descripcion ||

              null,

            naturaleza,

            requiere_aprendiz:

              requiereAprendiz,

            requiere_vehiculo:

              requiereVehiculo,

            es_gasto_pesv:

              esGastoPesv,

            categoria_pesv:
              categoriaPesv,

            updated_at:

              new Date()

                .toISOString(),

          })

          .eq(

            'id',

            conceptoId

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

            activo,

            created_at,

            updated_at

          `)

          .maybeSingle()

      if (

        error

      ) {

        return NextResponse.json(

          {

            status:

              'error',

            message:

              `No fue posible editar el concepto: ${error.message}`,

          },

          {

            status:

              400,

          }

        )

      }

      if (

        !data

      ) {

        return NextResponse.json(

          {

            status:

              'error',

            message:

              'El concepto no existe.',

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

        message:

          'Concepto actualizado correctamente.',

        data,

      })

    }

    // =====================================================

    // ACTIVAR / DESACTIVAR

    // =====================================================

    if (

      accion ===

        'activar_concepto' ||

      accion ===

        'desactivar_concepto'

    ) {

      const conceptoId =

        Number(

          body?.concepto_id

        )

      if (

        !Number.isInteger(

          conceptoId

        ) ||

        conceptoId <=

          0

      ) {

        return NextResponse.json(

          {

            status:

              'error',

            message:

              'El concepto seleccionado no es válido.',

          },

          {

            status:

              400,

          }

        )

      }

      const activar =

        accion ===

        'activar_concepto'

      const {

        data,

        error,

      } =

        await supabase

          .from(

            'conceptos_caja'

          )

          .update({

            activo:

              activar,

            updated_at:

              new Date()

                .toISOString(),

          })

          .eq(

            'id',

            conceptoId

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

            activo,

            created_at,

            updated_at

          `)

          .maybeSingle()

      if (

        error

      ) {

        return NextResponse.json(

          {

            status:

              'error',

            message:

              `No fue posible actualizar el concepto: ${error.message}`,

          },

          {

            status:

              400,

          }

        )

      }

      if (

        !data

      ) {

        return NextResponse.json(

          {

            status:

              'error',

            message:

              'El concepto no existe.',

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

        message:

          activar

            ? 'Concepto activado correctamente.'

            : 'Concepto inactivado correctamente.',

        data,

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

      'Error POST /api/admin/caja/egresos/catalogos:',

      error

    )

    return respuestaError(

      error

    )

  }

}
