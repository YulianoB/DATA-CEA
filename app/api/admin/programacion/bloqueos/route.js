import { NextResponse } from 'next/server'
import { respuestaErrorEmpresa } from '@/lib/supabaseEmpresaServer'
import { obtenerContextoCEA } from '@/lib/autorizacionCEA'

const tabla = 'bloqueos_agenda_instructores'
const faltaTipoActividad = error => /(?:tipo_actividad)/i.test(String(error?.message || '')) && /(?:does not exist|schema cache|could not find|column)/i.test(String(error?.message || ''))
const t = v => String(v ?? '').trim()
const validaFecha = v => /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v)) &&
  new Date(v + 'T12:00:00Z').toISOString().slice(0,10) === v
const validaHora = v => /^(?:0[6-9]|1\d|2[01]):00$/.test(v) || v === '22:00'
const minutos = h => Number(h.slice(0,2))*60 + Number(h.slice(3,5))
const responderError = e => {
  if (e?.code === 'PGRST202' || /Could not find the function public\\.cea_(?:retirar|editar|liberar)/i.test(String(e?.message||''))) {
    return NextResponse.json({status:'error',
      message:'Falta aplicar la migración SQL de gestión de bloqueos en Supabase CEA. Ejecute supabase/migrations/20261119_gestion_bloqueos_agenda.sql y actualice el esquema.'},{status:409})
  }
  const r = respuestaErrorEmpresa(e)
  return NextResponse.json(r.body, { status:r.status })
}
async function contexto(request) {
  return obtenerContextoCEA(request, { rolesPermitidos:['ADMINISTRATIVO'] })
}
export async function GET(request) {
  try {
    const { supabaseAdmin:db } = await contexto(request)
    const { searchParams:p } = new URL(request.url)
    const inicio = t(p.get('fecha_inicio'))
    const fin = t(p.get('fecha_fin'))
    const instructorId = Number(p.get('instructor_id'))
    if (!validaFecha(inicio) || !validaFecha(fin) || inicio > fin) {
      return NextResponse.json({status:'error',message:'Indique un rango de fechas válido.'},{status:400})
    }
    const consulta = (campos) => {
      let q = db.from(tabla).select(campos)
        .lte('fecha_inicio',fin).gte('fecha_fin',inicio)
        .order('fecha_inicio',{ascending:true})
      if (Number.isInteger(instructorId) && instructorId>0) q=q.eq('instructor_id',instructorId)
      return q
    }
    let [bloqueos,personal]=await Promise.all([
      consulta('id,instructor_id,fecha_inicio,fecha_fin,hora_inicio,hora_fin,motivo,tipo_actividad,creado_por,created_at'),
      db.from('personal').select('id,nombres,apellidos,cargo,tipo_personal,estado').order('nombres',{ascending:true})
    ])
    if (bloqueos.error && faltaTipoActividad(bloqueos.error)) {
      const anterior = await consulta('id,instructor_id,fecha_inicio,fecha_fin,hora_inicio,hora_fin,motivo,creado_por,created_at')
      bloqueos = anterior.error ? anterior : {
        data:(anterior.data||[]).map(b=>({...b,tipo_actividad:'BLOQUEO'})),
        error:null
      }
    }
    if (bloqueos.error) throw new Error('No se pudo consultar los bloqueos: '+bloqueos.error.message)
    if (personal.error) throw new Error('No se pudo consultar los instructores: '+personal.error.message)
    return NextResponse.json({status:'success',data:bloqueos.data||[],instructores:(personal.data||[])
      .filter(x=>String(x.estado||'').toUpperCase()==='ACTIVO' &&
        (String(x.cargo||'').toUpperCase().includes('INSTRUCTOR') || String(x.tipo_personal||'').toUpperCase().includes('INSTRUCTOR')))
      .map(x=>({id:x.id,nombre_completo:[x.nombres,x.apellidos].filter(Boolean).join(' ')}))})
  } catch(e){return responderError(e)}
}
export async function POST(request) {
  try {
    const {supabaseAdmin:db}=await contexto(request)
    const b=await request.json()
    const instructorId=Number(b.instructor_id)
    const inicio=t(b.fecha_inicio),fin=t(b.fecha_fin)
    const desde=t(b.hora_inicio),hasta=t(b.hora_fin)
    const motivo=t(b.motivo),usuario=t(b.usuario)
    const tipoActividad=t(b.tipo_actividad||'BLOQUEO').toUpperCase()
    if (!Number.isInteger(instructorId)||instructorId<1||
        !validaFecha(inicio)||!validaFecha(fin)||fin<inicio||
        (Date.parse(fin)-Date.parse(inicio))/86400000>90 ||
        !validaHora(desde)||!validaHora(hasta)||minutos(hasta)<=minutos(desde)||
        !motivo||motivo.length<8||!usuario||tipoActividad !== 'BLOQUEO') {
      return NextResponse.json({status:'error',message:'Instructor, fechas (máximo 90 días), horas y motivo (mínimo 8 caracteres) son obligatorios.'},{status:400})
    }
    const {data:personal,error:errorPersonal}=await db.from('personal')
      .select('id,estado,cargo,tipo_personal').eq('id',instructorId).maybeSingle()
    if(errorPersonal)throw new Error(errorPersonal.message)
    if(!personal || String(personal.estado).toUpperCase()!=='ACTIVO'||
       !(String(personal.cargo||'').toUpperCase().includes('INSTRUCTOR') || String(personal.tipo_personal||'').toUpperCase().includes('INSTRUCTOR'))) {
      return NextResponse.json({status:'error',message:'Seleccione un instructor activo.'},{status:409})
    }
    // No permitir bloquear una franja que contiene una clase activa.
    const {data:clases,error:errorClases}=await db.from('programacion_clases')
      .select('id,fecha,hora_inicio,duracion_horas,estado')
      .eq('instructor_id',instructorId).gte('fecha',inicio).lte('fecha',fin)
      .in('estado',['AGENDADA','PENDIENTE_CARGUE','DICTADA'])
    if(errorClases)throw new Error(errorClases.message)
    const cruce=(clases||[]).find(c=>{
      const h=t(c.hora_inicio).slice(0,5)
      return minutos(h)<minutos(hasta) &&
        minutos(h)+Number(c.duracion_horas||1)*60>minutos(desde)
    })
    if(cruce) {
      return NextResponse.json({status:'error',
        message:'No se puede bloquear: existe una clase programada el '+cruce.fecha+' a las '+t(cruce.hora_inicio).slice(0,5)+'.'},{status:409})
    }
    const {data:existentes,error:errorExistentes}=await db.from(tabla)
      .select('id,hora_inicio,hora_fin').eq('instructor_id',instructorId)
      .lte('fecha_inicio',fin).gte('fecha_fin',inicio)
    if(errorExistentes)throw new Error(errorExistentes.message)
    if((existentes||[]).some(x=>minutos(t(x.hora_inicio).slice(0,5))<minutos(hasta) &&
       minutos(t(x.hora_fin).slice(0,5))>minutos(desde))) {
      return NextResponse.json({status:'error',message:'El instructor ya tiene un bloqueo que coincide con el rango seleccionado.'},{status:409})
    }
    const datos = {
      instructor_id:instructorId,fecha_inicio:inicio,fecha_fin:fin,
      hora_inicio:desde,hora_fin:hasta,motivo,tipo_actividad:tipoActividad,creado_por:usuario
    }
    let {data,error}=await db.from(tabla).insert(datos).select('*').single()
    if (error && faltaTipoActividad(error)) {
      if (tipoActividad === 'TEORIA') {
        return NextResponse.json({status:'error',message:'Debe ejecutar primero la migración SQL de actividades teóricas en esta base CEA.'},{status:409})
      }
      const {tipo_actividad:omitido,...datosAnteriores} = datos
      const anterior=await db.from(tabla).insert(datosAnteriores).select('*').single()
      data=anterior.data ? {...anterior.data,tipo_actividad:'BLOQUEO'} : null
      error=anterior.error
    }
    if(error)throw new Error(error.message)
    return NextResponse.json({status:'success',data,message:'Bloqueo registrado correctamente.'},{status:201})
  }catch(e){return responderError(e)}
}
// Edición de intervalo completo: validar antes de cambiar y excluir el
// propio registro de la verificación de cruces.
export async function PATCH(request) {
  try {
    const {supabaseAdmin:db}=await contexto(request)
    const b=await request.json()
    const id=Number(b.id),instructorId=Number(b.instructor_id)
    const inicio=t(b.fecha_inicio),fin=t(b.fecha_fin)
    const desde=t(b.hora_inicio),hasta=t(b.hora_fin)
    const motivo=t(b.motivo),usuario=t(b.usuario)
    if(!Number.isSafeInteger(id)||id<1||
      !Number.isSafeInteger(instructorId)||instructorId<1||
      !validaFecha(inicio)||!validaFecha(fin)||inicio>fin||
      (Date.parse(fin)-Date.parse(inicio))/86400000>90||
      !validaHora(desde)||!validaHora(hasta)||minutos(hasta)<=minutos(desde)||
      motivo.length<8||!usuario)
      return NextResponse.json({status:'error',message:'Datos del bloqueo inválidos (motivo mínimo 8 caracteres).'}, {status:400})
    const {data:actual,error:errorActual}=await db.from(tabla)
      .select('id,instructor_id,tipo_actividad').eq('id',id).maybeSingle()
    if(errorActual)throw errorActual
    if(!actual)return NextResponse.json({status:'error',message:'El bloqueo ya no existe.'},{status:404})
    if(actual.tipo_actividad && actual.tipo_actividad!=='BLOQUEO')
      return NextResponse.json({status:'error',message:'Solo se pueden editar bloqueos administrativos.'},{status:409})
    const {data:instructor,error:errorInstructor}=await db.from('personal')
      .select('id,estado,cargo,tipo_personal').eq('id',instructorId).maybeSingle()
    if(errorInstructor)throw errorInstructor
    if(!instructor||String(instructor.estado).toUpperCase()!=='ACTIVO'||
      !(String(instructor.cargo||'').toUpperCase().includes('INSTRUCTOR')||
        String(instructor.tipo_personal||'').toUpperCase().includes('INSTRUCTOR')))
      return NextResponse.json({status:'error',message:'Seleccione un instructor activo.'},{status:409})
    const [clases,bloqueos]=await Promise.all([
      db.from('programacion_clases').select('id,fecha,hora_inicio,duracion_horas')
        .eq('instructor_id',instructorId).gte('fecha',inicio).lte('fecha',fin)
        .in('estado',['AGENDADA','PENDIENTE_CARGUE','DICTADA']),
      db.from(tabla).select('id,hora_inicio,hora_fin').eq('instructor_id',instructorId)
        .lte('fecha_inicio',fin).gte('fecha_fin',inicio).neq('id',id)
    ])
    if(clases.error)throw clases.error
    if(bloqueos.error)throw bloqueos.error
    const cruce=(clases.data||[]).find(c=>{
      const h=t(c.hora_inicio).slice(0,5)
      return minutos(h)<minutos(hasta)&&minutos(h)+Number(c.duracion_horas||1)*60>minutos(desde)
    })
    if(cruce)return NextResponse.json({status:'error',message:'Existe una clase el '+cruce.fecha+' a las '+t(cruce.hora_inicio).slice(0,5)+'.'},{status:409})
    if((bloqueos.data||[]).some(x=>
      minutos(t(x.hora_inicio).slice(0,5))<minutos(hasta)&&
      minutos(t(x.hora_fin).slice(0,5))>minutos(desde)))
      return NextResponse.json({status:'error',message:'El nuevo rango se cruza con otro bloqueo.'},{status:409})
    // Esta función SQL registra el cambio y valida dentro de la transacción.
    const {data,error}=await db.rpc('cea_editar_bloqueo_agenda',{
      p_id:id,p_instructor_id:instructorId,p_fecha_inicio:inicio,
      p_fecha_fin:fin,p_hora_inicio:desde,p_hora_fin:hasta,
      p_motivo:motivo,p_usuario:usuario
    })
    if(error)throw error
    return NextResponse.json({status:'success',data,message:'Bloqueo actualizado correctamente.'})
  } catch(e){return responderError(e)}
}

// Liberar una sola hora de un bloqueo existente. La función SQL divide
// el rango dentro de una transacción, conserva todas las otras franjas
// y registra la acción en la auditoría.
export async function PUT(request) {
  try {
    const {supabaseAdmin:db}=await contexto(request)
    const b=await request.json()
    const id=Number(b.id),fecha=t(b.fecha),hora=t(b.hora_inicio),usuario=t(b.usuario)
    if(!Number.isSafeInteger(id)||id<1||!validaFecha(fecha)||
      !validaHora(hora)||hora==='22:00'||!usuario)
      return NextResponse.json({status:'error',message:'Indique un bloqueo, fecha, hora y usuario válidos.'},{status:400})
    const {data,error}=await db.rpc('cea_liberar_franja_bloqueo',{
      p_id:id,p_fecha:fecha,p_hora:hora,p_usuario:usuario
    })
    if(error)throw error
    return NextResponse.json({status:'success',data,message:'Franja liberada; el resto del bloqueo se conserva.'})
  }catch(e){return responderError(e)}
}

export async function DELETE(request) {
  try {
    const {supabaseAdmin:db}=await contexto(request)
    const body=await request.json()
    const id=Number(body.id),usuario=t(body.usuario)
    if(!Number.isSafeInteger(id)||id<1||!usuario)
      return NextResponse.json({status:'error',message:'Se requieren el bloqueo y el usuario responsable.'},{status:400})
    const {data,error}=await db.rpc('cea_retirar_bloqueo_agenda',{p_id:id,p_usuario:usuario})
    if(error)throw error
    return NextResponse.json({status:'success',data,message:'Bloqueo retirado y registrado en auditoría.'})
  }catch(e){return responderError(e)}
}
