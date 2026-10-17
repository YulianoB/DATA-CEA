import { NextResponse } from 'next/server'
import { resolverFormularioPersonal } from '@/lib/formularioPersonalPublicoServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const limpio = (v, max = 250) => typeof v === 'string' ? v.trim().slice(0, max) : ''
const opcional = (v, max) => limpio(v, max) || null

export async function POST(request) {
  try {
    const body = await request.json()
    const p = body.personal || {}
    if (JSON.stringify(body).length > 40000) return NextResponse.json({ mensaje: 'Formulario demasiado grande.' }, { status: 400 })
    const documento = limpio(p.documento, 25)
    const nombres = limpio(p.nombres)
    const apellidos = limpio(p.apellidos)
    const tipoDocumento = limpio(p.tipo_documento, 10)
    if (!/^[a-zA-Z0-9-]{4,25}$/.test(documento) || !nombres || !apellidos || !['CC','CE','TI','PPT','PA'].includes(tipoDocumento) || !body.autorizado) {
      return NextResponse.json({ mensaje: 'Complete la identificación y acepte el tratamiento de datos.' }, { status: 400 })
    }
    const ref = body.referencia || {}
    if (!limpio(ref.nombre) || !limpio(ref.telefono, 40) || limpio(ref.nombre).toLowerCase() === limpio(p.contacto_emergencia_nombre).toLowerCase()) {
      return NextResponse.json({ mensaje: 'Debe indicar una referencia personal distinta del contacto de emergencia.' }, { status: 400 })
    }
    const estudios = Array.isArray(body.estudios) ? body.estudios.slice(0, 10) : []
    const experiencias = Array.isArray(body.experiencias) ? body.experiencias.slice(0, 10) : []
    if (p.rol_conductor_instructor && !estudios.some(x => limpio(x.nivel_estudio))) {
      return NextResponse.json({ mensaje: 'El instructor debe registrar sus estudios.' }, { status: 400 })
    }
    const { supabaseAdmin } = await resolverFormularioPersonal(body.cea, body.formulario)
    const { data: existente, error: errorExistente } = await supabaseAdmin.from('personal').select('id').eq('documento', documento).limit(1)
    if (errorExistente) throw errorExistente
    if (existente?.length) return NextResponse.json({ mensaje: 'El documento ya está registrado. Contacte al administrador.' }, { status: 409 })
    const trabajando = Boolean(p.trabaja_cea)
    const nuevo = {
      tipo_personal: limpio(p.tipo_personal) || 'contratista',
      tipo_documento: tipoDocumento, documento, nombres, apellidos,
      fecha_nacimiento: opcional(p.fecha_nacimiento),
      genero: opcional(p.genero), estado_civil: opcional(p.estado_civil),
      escolaridad: opcional(p.escolaridad), profesion: opcional(p.profesion),
      nacionalidad: opcional(p.nacionalidad), telefono: opcional(p.telefono, 40),
      email: opcional(p.email), departamento_residencia: opcional(p.departamento_residencia),
      ciudad_residencia: opcional(p.ciudad_residencia), direccion: opcional(p.direccion),
      contacto_emergencia_nombre: opcional(p.contacto_emergencia_nombre),
      contacto_emergencia_parentesco: opcional(p.contacto_emergencia_parentesco),
      contacto_emergencia_telefono: opcional(p.contacto_emergencia_telefono, 40),
      eps: opcional(p.eps), arl: opcional(p.arl), fondo_pension: opcional(p.fondo_pension),
      rol_conductor_instructor: Boolean(p.rol_conductor_instructor),
      perfil_profesional: opcional(p.perfil_profesional, 4000),
      cargo: trabajando ? opcional(p.cargo) : null,
      tipo_contrato: trabajando ? opcional(p.tipo_contrato) : null,
      fecha_vinculacion: trabajando ? opcional(p.fecha_vinculacion) : null,
      estado: trabajando ? 'activo' : 'inactivo',
      origen_registro: 'formulario_publico', estado_aprobacion: 'pendiente',
    }
    let personalId = null
    try {
      const { data: creado, error: errorCrear } = await supabaseAdmin.from('personal').insert(nuevo).select('id').single()
      if (errorCrear) {
        if (errorCrear.code === '23505') return NextResponse.json({ mensaje: 'El documento ya está registrado.' }, { status: 409 })
        throw errorCrear
      }
      personalId = creado.id
      const operaciones = [
        ['referencias_personal', [{ personal_id: personalId, tipo_referencia: 'personal', nombre: limpio(ref.nombre), telefono: opcional(ref.telefono, 40), relacion: opcional(ref.relacion), ocupacion_cargo: opcional(ref.ocupacion_cargo) }]],
        ['estudios_personal', estudios.filter(x=>limpio(x.nivel_estudio)).map(x=>({ personal_id: personalId, nivel_estudio: limpio(x.nivel_estudio), titulo: opcional(x.titulo), institucion: opcional(x.institucion), fecha_grado: opcional(x.fecha_grado) }))],
        ['experiencia_laboral_personal', experiencias.filter(x=>limpio(x.empresa)).map(x=>({ personal_id: personalId, empresa: limpio(x.empresa), cargo: opcional(x.cargo), fecha_inicio: opcional(x.fecha_inicio), fecha_fin: opcional(x.fecha_fin), funciones: opcional(x.funciones, 1000) }))],
        ['autorizaciones_datos_personal', [{ personal_id: personalId, documento_version: 'formulario_publico', autorizado: true, medio: 'formulario_publico', evidencia: { origen: 'formulario_publico', fecha: new Date().toISOString() } }]],
      ]
      for (const [tabla, filas] of operaciones) {
        if (!filas.length) continue
        const { error } = await supabaseAdmin.from(tabla).insert(filas)
        if (error) throw error
      }
      return NextResponse.json({ ok: true, mensaje: 'Formulario enviado correctamente.' }, { status: 201 })
    } catch (error) {
      if (personalId) {
        for (const tabla of ['autorizaciones_datos_personal','experiencia_laboral_personal','estudios_personal','referencias_personal']) {
          await supabaseAdmin.from(tabla).delete().eq('personal_id', personalId)
        }
        await supabaseAdmin.from('personal').delete().eq('id', personalId)
      }
      throw error
    }
  } catch (error) {
    console.error('Error envío formulario público:', error)
    return NextResponse.json({ mensaje: 'No fue posible enviar el formulario. Intente nuevamente.' }, { status: 500 })
  }
}
