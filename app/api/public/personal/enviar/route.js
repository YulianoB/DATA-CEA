import { NextResponse } from 'next/server'
import { resolverFormularioPersonal } from '@/lib/formularioPersonalPublicoServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const limpio = (v, max = 250) => typeof v === 'string' ? v.trim().slice(0, max) : ''
const opcional = (v, max) => limpio(v, max) || null
const GENEROS = ['Femenino','Masculino','Otro']
const SANGRES = ['O+','O-','A+','A-','B+','B-','AB+','AB-']
const ESTADOS_CIVILES = ['Soltero(a)','Casado(a)','Unión libre','Divorciado(a)','Viudo(a)']
const TRANSPORTES = ['A pie','Bicicleta','Transporte público','Motocicleta propia','Motocicleta CEA','Automóvil propio','Automóvil CEA','Camioneta propia','Camioneta CEA']

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
    const licencias = Array.isArray(body.licencias) ? body.licencias.slice(0, 10) : []
    if (p.rol_conductor_instructor && !estudios.some(x => limpio(x.nivel_estudio) === 'BACHILLER')) {
      return NextResponse.json({ mensaje: 'El instructor debe registrar sus estudios.' }, { status: 400 })
    }
    if (p.rol_conductor_instructor) {
      const categoriasValidas = ['A2','B1','B1-C1','B2-C2','B3-C3']
      for (const tipo of ['INSTRUCTOR','CONDUCCION']) {
        const items = licencias.filter(x => x.tipo_licencia === tipo)
        if (!items.length || items.some(x => !categoriasValidas.includes(x.categoria) || !limpio(x.vigencia) || (tipo === 'INSTRUCTOR' && !limpio(x.numero_certificado)))) {
          return NextResponse.json({mensaje:'Complete las categorías y vigencias de certificados y licencias del instructor.'},{status:400})
        }
        if (items.filter(x=>x.categoria!=='A2').length > 1 || new Set(items.map(x=>x.categoria)).size !== items.length) {
          return NextResponse.json({mensaje:'Seleccione A2 y como máximo una categoría B por cada tipo de licencia.'},{status:400})
        }
      }
    }
    const obligatorio = v => typeof v === 'string' && v.trim().length > 0
    const faltantes = ['fecha_nacimiento','genero','tipo_sangre','estado_civil','nacionalidad','escolaridad','profesion','email','medio_transporte_trabajo','perfil_profesional','eps','arl','fondo_pension','telefono','direccion','departamento_residencia','ciudad_residencia','contacto_emergencia_nombre','contacto_emergencia_parentesco','contacto_emergencia_telefono'].filter(k => !obligatorio(p[k]))
    if (faltantes.length) return NextResponse.json({mensaje:'Complete todos los campos obligatorios de información general, contacto, perfil profesional y transporte.'},{status:400})
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email || '')) return NextResponse.json({mensaje:'Ingrese un correo electrónico válido.'},{status:400})
    if (!GENEROS.includes(p.genero) || !SANGRES.includes(p.tipo_sangre) || !ESTADOS_CIVILES.includes(p.estado_civil) || !TRANSPORTES.includes(p.medio_transporte_trabajo)) return NextResponse.json({mensaje:'Seleccione valores válidos de género, sangre, estado civil y transporte.'},{status:400})
    if (String(p.numero_hijos ?? '').trim() === '' || !Number.isInteger(Number(p.numero_hijos)) || Number(p.numero_hijos) < 0 || !Number.isSafeInteger(Number(p.numero_hijos))) return NextResponse.json({mensaje:'Número de hijos inválido: ingrese un entero igual o superior a 0.'},{status:400})
    if (p.trabaja_cea && ['tipo_personal','grupo_personal','cargo','tipo_contrato','tipo_permanencia','fecha_vinculacion'].some(k=>!obligatorio(p[k]))) {
      return NextResponse.json({mensaje:'Complete los datos de vinculación con el CEA.'},{status:400})
    }
    if (!estudios.some(x => ['nivel_estudio','titulo','institucion'].every(k=>obligatorio(x[k])))) return NextResponse.json({mensaje:'Registre al menos un estudio completo (tipo de formación, título e institución).'},{status:400})
    if (estudios.some(x => Object.values(x).some(v => typeof v === 'string' && obligatorio(v)) && ['nivel_estudio','titulo','institucion'].some(k=>!obligatorio(x[k])))) {
      return NextResponse.json({mensaje:'Complete tipo de formación, título e institución de cada estudio registrado.'},{status:400})
    }
    if (experiencias.some(x => obligatorio(x.empresa) && (['cargo','fecha_inicio'].some(k=>!obligatorio(x[k])) || (!x.actualmente && !obligatorio(x.fecha_fin)) || (x.fecha_fin && x.fecha_inicio && x.fecha_fin < x.fecha_inicio)))) {
      return NextResponse.json({mensaje:'Complete empresa, cargo y fecha de inicio de cada experiencia, y revise sus fechas.'},{status:400})
    }
    const { supabaseAdmin } = await resolverFormularioPersonal(body.cea, body.formulario)
    const { data: documentoVigente, error: errorDocumento } = await supabaseAdmin.from('autorizacion_personal_versiones').select('version').eq('vigente', true).maybeSingle()
    if (errorDocumento) throw errorDocumento
    if (!documentoVigente || !limpio(body.documento_version, 30) || documentoVigente.version !== body.documento_version) {
      return NextResponse.json({ mensaje: 'La autorización del personal no está disponible o cambió de versión. Consulte y acepte la versión vigente antes de enviar.' }, { status: 409 })
    }
    const { data: existente, error: errorExistente } = await supabaseAdmin.from('personal').select('id').eq('documento', documento).limit(1)
    if (errorExistente) throw errorExistente
    if (existente?.length) return NextResponse.json({ mensaje: 'El documento ya está registrado. Contacte al administrador.' }, { status: 409 })
    const trabajando = Boolean(p.trabaja_cea)
    const nuevo = {
      tipo_personal: limpio(p.tipo_personal) || 'contratista',
      tipo_documento: tipoDocumento, documento, nombres, apellidos,
      fecha_nacimiento: opcional(p.fecha_nacimiento),
      genero: p.genero, tipo_sangre: p.tipo_sangre, estado_civil: p.estado_civil,
      numero_hijos: Number(p.numero_hijos), medio_transporte_trabajo: p.medio_transporte_trabajo,
      escolaridad: opcional(p.escolaridad), profesion: opcional(p.profesion),
      nacionalidad: opcional(p.nacionalidad), telefono: opcional(p.telefono, 40),
      email: limpio(p.email).toLowerCase(), departamento_residencia: opcional(p.departamento_residencia),
      ciudad_residencia: opcional(p.ciudad_residencia), direccion: opcional(p.direccion),
      contacto_emergencia_nombre: opcional(p.contacto_emergencia_nombre),
      contacto_emergencia_parentesco: opcional(p.contacto_emergencia_parentesco),
      contacto_emergencia_telefono: opcional(p.contacto_emergencia_telefono, 40),
      eps: opcional(p.eps), arl: opcional(p.arl), fondo_pension: opcional(p.fondo_pension),
      rol_conductor_instructor: Boolean(p.rol_conductor_instructor),
      perfil_profesional: opcional(p.perfil_profesional, 4000),
      grupo_personal: trabajando ? opcional(p.grupo_personal) : null,
      tipo_permanencia: trabajando ? opcional(p.tipo_permanencia) : null,
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
        ['referencias_personal', [{ personal_id: personalId, tipo_referencia: ['personal','laboral'].includes(ref.tipo_referencia) ? ref.tipo_referencia : 'personal', nombre: limpio(ref.nombre), telefono: opcional(ref.telefono, 40), email: opcional(ref.email), ocupacion_cargo: opcional(ref.ocupacion_cargo), empresa: opcional(ref.empresa), relacion: opcional(ref.relacion), observaciones: opcional(ref.observaciones) }]],
        ['licencias_personal', p.rol_conductor_instructor ? licencias.filter(x=>limpio(x.categoria)).map(x=>({ personal_id: personalId, documento, nombre_completo: nombres + ' ' + apellidos, rol: 'INSTRUCTOR', categoria: limpio(x.categoria), tipo_licencia: limpio(x.tipo_licencia) || 'CONDUCCION', numero_certificado: opcional(x.numero_certificado), vigencia: opcional(x.vigencia) })) : []],
        ['estudios_personal', estudios.filter(x=>limpio(x.nivel_estudio)).map(x=>({ personal_id: personalId, nivel_estudio: limpio(x.nivel_estudio), titulo: opcional(x.titulo), institucion: opcional(x.institucion), fecha_grado: opcional(x.fecha_grado), observaciones: opcional(x.observaciones,1000) }))],
        ['experiencia_laboral_personal', experiencias.filter(x=>limpio(x.empresa)).map(x=>({ personal_id: personalId, empresa: limpio(x.empresa), cargo: opcional(x.cargo), fecha_inicio: opcional(x.fecha_inicio), fecha_fin: x.actualmente ? null : opcional(x.fecha_fin), actualmente: Boolean(x.actualmente), jefe_inmediato: opcional(x.jefe_inmediato), telefono_contacto: opcional(x.telefono_contacto,40), observaciones: opcional(x.observaciones,1000), funciones: opcional(x.funciones, 1000) }))],
        ['autorizaciones_datos_personal', [{ personal_id: personalId, documento_version: documentoVigente.version, autorizado: true, medio: 'formulario_publico', evidencia: { origen: 'formulario_publico', fecha: new Date().toISOString() } }]],
      ]
      for (const [tabla, filas] of operaciones) {
        if (!filas.length) continue
        const { error } = await supabaseAdmin.from(tabla).insert(filas)
        if (error) throw error
      }
      return NextResponse.json({ ok: true, mensaje: 'Formulario enviado correctamente.' }, { status: 201 })
    } catch (error) {
      if (personalId) {
        for (const tabla of ['autorizaciones_datos_personal','licencias_personal','experiencia_laboral_personal','estudios_personal','referencias_personal']) {
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
