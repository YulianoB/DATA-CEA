import { NextResponse } from 'next/server'
import { obtenerContextoCEA } from '@/lib/autorizacionCEA'
import { PLANTILLA_CODIGO_CONDUCTA, PLANTILLA_AUTORIZACION_DATOS } from '@/lib/plantillasDocumentosIniciales'

// Esta API solo admite la aprobación inicial. Nunca modifica documentos con secciones o versiones.
const TIPOS = {
  CODIGO_CONDUCTA: { tabla: 'configuracion_codigo_conducta_secciones', nombre: 'CÓDIGO DE CONDUCTA DEL ASPIRANTE' },
  AUTORIZACION_DATOS_CEA: { tabla: 'configuracion_autorizacion_datos_secciones', nombre: 'AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS PERSONALES' },
}
const responder = (data, status = 200) => NextResponse.json(data, { status })
const limpio = value => String(value ?? '').trim()
const errorBD = ({ error }) => { if (error) throw error }
const fechaCorrecta = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value))

async function estado(supabase, tipo) {
  const cfg = TIPOS[tipo]
  if (!cfg) throw new Error('Tipo documental inválido.')
  const [doc, secciones, versiones, finalidades, general] = await Promise.all([
    supabase.from('configuracion_documentos').select('*').eq('tipo_documento', tipo).maybeSingle(),
    supabase.from(cfg.tabla).select('id').limit(1),
    supabase.from('configuracion_documentos_versiones').select('id').eq('tipo_documento', tipo).limit(1),
    tipo === 'AUTORIZACION_DATOS_CEA' ? supabase.from('configuracion_autorizacion_datos_finalidades').select('id').limit(1) : Promise.resolve({data:[]}),
    tipo === 'AUTORIZACION_DATOS_CEA' ? supabase.from('configuracion_autorizacion_datos').select('*').eq('clave','GENERAL').maybeSingle() : Promise.resolve({data:null})
  ])
  for (const r of [doc,secciones,versiones,finalidades,general]) errorBD(r)
  return { documento: doc.data, general: general.data, disponible: !secciones.data?.length && !versiones.data?.length && !finalidades.data?.length }
}

export async function GET(request) {
  try {
    const tipo = new URL(request.url).searchParams.get('tipo')
    if (!TIPOS[tipo]) return responder({ok:false,error:'Documento no admitido.'},400)
    const { supabaseAdmin } = await obtenerContextoCEA(request,{rolesPermitidos:['ADMINISTRATIVO']})
    const actual = await estado(supabaseAdmin,tipo)
    return responder({ok:true,disponible:actual.disponible,plantilla:actual.disponible ? (tipo==='CODIGO_CONDUCTA' ? { secciones: PLANTILLA_CODIGO_CONDUCTA } : PLANTILLA_AUTORIZACION_DATOS) : null})
  } catch(e) {
    console.error('GET aprobación inicial:', e)
    return responder({ok:false,error:'No fue posible comprobar la configuración inicial.'},500)
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const tipo = limpio(body.tipo)
    if (!TIPOS[tipo]) return responder({ok:false,error:'Documento no admitido.'},400)
    const nombre_documento = limpio(body.nombre_documento)
    const version = limpio(body.version)
    const fecha_edicion = limpio(body.fecha_edicion)
    const vigencia = limpio(body.vigencia)
    const secciones = body.secciones
    const finalidades = body.finalidades
    if (!nombre_documento || !version || !fechaCorrecta(fecha_edicion) || !fechaCorrecta(vigencia))
      return responder({ok:false,error:'Complete nombre, versión, fecha de elaboración y fecha de vigencia.'},400)
    if (!Array.isArray(secciones) || !secciones.length || secciones.some(x=>!limpio(x.titulo)||!limpio(x.contenido)))
      return responder({ok:false,error:'Revise todas las secciones y sus contenidos.'},400)
    if (tipo==='AUTORIZACION_DATOS_CEA' && (!Array.isArray(finalidades)||finalidades.length===0||finalidades.some(x=>!limpio(x.codigo)||!limpio(x.descripcion))))
      return responder({ok:false,error:'Revise los códigos y descripciones de las finalidades.'},400)
    const { supabaseAdmin: db } = await obtenerContextoCEA(request,{rolesPermitidos:['ADMINISTRATIVO']})
    const previo = await estado(db,tipo)
    if (!previo.disponible) return responder({ok:false,error:'Este CEA ya posee contenido o versiones. No se reemplazará la configuración existente.'},409)
    const fecha = new Date().toISOString()
    const usuario = 'APROBACION_INICIAL'
    const docFields = { nombre_documento, codigo:limpio(body.codigo)||null,version,fecha_edicion,vigencia,activo:true,observaciones:limpio(body.observaciones),usuario_actualizacion:usuario,updated_at:fecha }
    const registro = {tipo_documento:tipo,...docFields}
    const creados = []
    let nuevoDoc = null, nuevoGeneral = null, documentoModificado = false, generalModificada = false
    try {
      // Al insertar secciones antes de activar el control documental evitamos declarar completo un borrador incompleto.
      const filas = secciones.map((s,i)=>({titulo:limpio(s.titulo),contenido:limpio(s.contenido),orden:i+1,activo:s.activo!==false,usuario_actualizacion:usuario,created_at:fecha,updated_at:fecha}))
      const rSecc = await db.from(TIPOS[tipo].tabla).insert(filas).select('id')
      errorBD(rSecc); creados.push({tabla:TIPOS[tipo].tabla,ids:rSecc.data.map(x=>x.id)})
      if (tipo==='AUTORIZACION_DATOS_CEA') {
        const codigos = finalidades.map(f=>limpio(f.codigo))
        if (new Set(codigos).size!==codigos.length) throw Error('Las finalidades tienen códigos duplicados.')
        const rFin=await db.from('configuracion_autorizacion_datos_finalidades').insert(finalidades.map((f,i)=>({codigo:limpio(f.codigo),descripcion:limpio(f.descripcion),orden:i+1,activo:f.activo!==false,requiere_respuesta:f.requiere_respuesta!==false,usuario_actualizacion:usuario,created_at:fecha,updated_at:fecha}))).select('id')
        errorBD(rFin); creados.push({tabla:'configuracion_autorizacion_datos_finalidades',ids:rFin.data.map(x=>x.id)})
        const general = body.configuracion || {}
        const generalFields = Object.fromEntries(['correo_proteccion_datos','telefono_contacto','direccion_contacto','medio_politica','texto_datos_biometricos','texto_menores_edad','texto_declaracion_final'].map(k=>[k,limpio(general[k])]))
        if(previo.general) {
          const r=await db.from('configuracion_autorizacion_datos').update({...generalFields,updated_at:fecha,usuario_actualizacion:usuario}).eq('id',previo.general.id)
          errorBD(r);generalModificada=true
        } else {
          const r=await db.from('configuracion_autorizacion_datos').insert({clave:'GENERAL',...generalFields,activo:true,usuario_actualizacion:usuario,created_at:fecha,updated_at:fecha}).select('id').single()
          errorBD(r);nuevoGeneral=r.data.id
        }
      }
      if(previo.documento){
        const r=await db.from('configuracion_documentos').update(docFields).eq('id',previo.documento.id)
        errorBD(r);documentoModificado=true
      } else {
        const r=await db.from('configuracion_documentos').insert({...registro,created_at:fecha}).select('id').single()
        errorBD(r);nuevoDoc=r.data.id
      }
      return responder({ok:true,mensaje:'Plantilla inicial aprobada para este CEA.'})
    } catch(e) {
      // Compensación de errores; nunca se eliminan registros que existían antes de la aprobación.
      console.error('Falló aprobación inicial; se intenta revertir:',e)
      if(nuevoDoc) errorBD(await db.from('configuracion_documentos').delete().eq('id',nuevoDoc))
      if(documentoModificado&&previo.documento) {
        const {id,created_at,...anterior}=previo.documento
        errorBD(await db.from('configuracion_documentos').update(anterior).eq('id',id))
      }
      if(nuevoGeneral) errorBD(await db.from('configuracion_autorizacion_datos').delete().eq('id',nuevoGeneral))
      if(generalModificada&&previo.general){
        const {id,created_at,...anterior}=previo.general
        errorBD(await db.from('configuracion_autorizacion_datos').update(anterior).eq('id',id))
      }
      for(const item of creados.reverse()) errorBD(await db.from(item.tabla).delete().in('id',item.ids))
      return responder({ok:false,error:'No se pudo completar la aprobación. Se intentó revertir los cambios parciales.'},500)
    }
  } catch(e) {
    console.error('POST aprobación inicial:',e)
    return responder({ok:false,error:'No fue posible aprobar la plantilla inicial.'},500)
  }
}
