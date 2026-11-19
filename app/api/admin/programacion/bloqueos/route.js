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
  const r = respuestaErrorEmpresa(e)
  return NextResponse.json(r.body, { status:r.status })
}
const fallo = (message,status=400) => NextResponse.json({status:'error',message},{status})
const esAdministrativo = b => !b.tipo_actividad || b.tipo_actividad === 'BLOQUEO'
const inicioDia = (fecha) => new Date(fecha + 'T12:00:00Z')
const sumarDia = (fecha,dias) => {
  const d=inicioDia(fecha)
  d.setUTCDate(d.getUTCDate()+dias)
  return d.toISOString().slice(0,10)
}
async function obtenerBloqueo(db,id) {
  const {data,error}=await db.from(tabla).select('*').eq('id',id).maybeSingle()
  if(error) throw error
  return data
}
async function guardarAuditoria(db,antes,despues,accion,usuario) {
  // Auditoría solo si ya existe tabla; ninguna función ni trigger.
  // Su ausencia no impide administrar los bloqueos.
  const {error}=await db.from('bloqueos_agenda_auditoria').insert({
    bloqueo_id:antes.id,accion,usuario,antes,despues
  })
  if(error && error.code!=='42P01' && error.code!=='PGRST205' && error.code!=='PGRST204')
    console.warn('No se pudo registrar auditoría de bloqueo:',error.message)
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
// Los cambios se procesan desde Next.js; Supabase solo almacena datos.
export async function PATCH(request) {
  try {
    const {supabaseAdmin:db}=await contexto(request)
    const b=await request.json()
    const id=Number(b.id),instructorId=Number(b.instructor_id)
    const inicio=t(b.fecha_inicio),fin=t(b.fecha_fin)
    const desde=t(b.hora_inicio),hasta=t(b.hora_fin)
    const motivo=t(b.motivo),usuario=t(b.usuario)
    if(!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(instructorId)||instructorId<1||
      !validaFecha(inicio)||!validaFecha(fin)||inicio>fin||
      (Date.parse(fin)-Date.parse(inicio))/86400000>90||
      !validaHora(desde)||!validaHora(hasta)||minutos(hasta)<=minutos(desde)||
      motivo.length<8||!usuario)return fallo('Datos inválidos. Verifique fechas, horas y motivo (mínimo 8 caracteres).')
    const actual=await obtenerBloqueo(db,id)
    if(!actual)return fallo('El bloqueo no existe.',404)
    if(!esAdministrativo(actual))return fallo('Esta actividad no es un bloqueo administrativo.',409)
    const {data:personal,error:ep}=await db.from('personal')
      .select('id,estado,cargo,tipo_personal').eq('id',instructorId).maybeSingle()
    if(ep)throw ep
    if(!personal||t(personal.estado).toUpperCase()!=='ACTIVO'||
       !(t(personal.cargo).toUpperCase().includes('INSTRUCTOR')||
         t(personal.tipo_personal).toUpperCase().includes('INSTRUCTOR')))
      return fallo('Seleccione un instructor activo.',409)
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
    if(cruce)return fallo('Existe una clase el '+cruce.fecha+' a las '+t(cruce.hora_inicio).slice(0,5)+'.',409)
    if((bloqueos.data||[]).some(x=>minutos(t(x.hora_inicio).slice(0,5))<minutos(hasta)&&
      minutos(t(x.hora_fin).slice(0,5))>minutos(desde)))
      return fallo('El nuevo rango coincide con otro bloqueo.',409)
    const cambios={instructor_id:instructorId,fecha_inicio:inicio,fecha_fin:fin,
      hora_inicio:desde,hora_fin:hasta,motivo}
    // Coincidencia optimista: evita sobrescribir un bloqueo ya cambiado.
    const {data,error}=await db.from(tabla).update(cambios)
      .eq('id',id).eq('instructor_id',actual.instructor_id)
      .eq('fecha_inicio',actual.fecha_inicio).eq('fecha_fin',actual.fecha_fin)
      .eq('hora_inicio',actual.hora_inicio).eq('hora_fin',actual.hora_fin)
      .eq('motivo',actual.motivo).select('*').maybeSingle()
    if(error)throw error
    if(!data)return fallo('El bloqueo fue modificado por otro usuario. Actualice la agenda.',409)
    await guardarAuditoria(db,actual,data,'EDITAR',usuario)
    return NextResponse.json({status:'success',data,message:'Bloqueo actualizado correctamente.'})
  }catch(e){return responderError(e)}
}

// Al liberar una hora, primero se insertan los fragmentos restantes;
// después se elimina condicionalmente el original. En caso de error,
// la API intenta compensar los registros insertados. Sin transacciones
// SQL no se puede garantizar atomicidad entre peticiones independientes.
export async function PUT(request) {
  try {
    const {supabaseAdmin:db}=await contexto(request)
    const b=await request.json()
    const id=Number(b.id),fecha=t(b.fecha),hora=t(b.hora_inicio),usuario=t(b.usuario)
    if(!Number.isSafeInteger(id)||id<1||!validaFecha(fecha)||
      !validaHora(hora)||hora==='22:00'||!usuario)return fallo('Indique un bloqueo, fecha, hora y usuario válidos.')
    const actual=await obtenerBloqueo(db,id)
    if(!actual)return fallo('El bloqueo no existe.',404)
    if(!esAdministrativo(actual)||fecha<actual.fecha_inicio||fecha>actual.fecha_fin||
      minutos(hora)<minutos(t(actual.hora_inicio).slice(0,5))||
      minutos(hora)+60>minutos(t(actual.hora_fin).slice(0,5)))
      return fallo('La hora seleccionada no pertenece al bloqueo.',409)
    const finHora=String(Number(hora.slice(0,2))+1).padStart(2,'0')+':00'
    const base={instructor_id:actual.instructor_id,motivo:actual.motivo,
      tipo_actividad:'BLOQUEO',creado_por:actual.creado_por}
    const fragmentos=[]
    const add=(f1,f2,h1,h2)=>{
      if(f1<=f2&&minutos(h1)<minutos(h2))
        fragmentos.push({...base,fecha_inicio:f1,fecha_fin:f2,hora_inicio:h1,hora_fin:h2})
    }
    if(actual.fecha_inicio<fecha)
      add(actual.fecha_inicio,sumarDia(fecha,-1),t(actual.hora_inicio).slice(0,5),t(actual.hora_fin).slice(0,5))
    add(fecha,fecha,t(actual.hora_inicio).slice(0,5),hora)
    add(fecha,fecha,finHora,t(actual.hora_fin).slice(0,5))
    if(actual.fecha_fin>fecha)
      add(sumarDia(fecha,1),actual.fecha_fin,t(actual.hora_inicio).slice(0,5),t(actual.hora_fin).slice(0,5))
    let nuevos=[]
    if(fragmentos.length) {
      const {data,error}=await db.from(tabla).insert(fragmentos).select('*')
      if(error)throw error
      nuevos=data||[]
      if(nuevos.length!==fragmentos.length) {
        if(nuevos.length) {
          const rollback=await db.from(tabla).delete().in('id',nuevos.map(x=>x.id))
          if(rollback.error)console.error('Error revirtiendo segmentos incompletos:',rollback.error)
        }
        return fallo('No se pudieron confirmar todos los fragmentos. El bloqueo original se conservó.',500)
      }
    }
    const {data:retirado,error:ed}=await db.from(tabla).delete()
      .eq('id',id).eq('instructor_id',actual.instructor_id)
      .eq('fecha_inicio',actual.fecha_inicio).eq('fecha_fin',actual.fecha_fin)
      .eq('hora_inicio',actual.hora_inicio).eq('hora_fin',actual.hora_fin)
      .eq('motivo',actual.motivo).select('id').maybeSingle()
    if(ed||!retirado){
      if(nuevos.length) {
        const ids=nuevos.map(x=>x.id)
        const rollback=await db.from(tabla).delete().in('id',ids)
        if(rollback.error)console.error('No se pudieron revertir fragmentos de bloqueo:',rollback.error)
      }
      if(ed)throw ed
      return fallo('El bloqueo cambió durante la operación. Actualice la agenda.',409)
    }
    await guardarAuditoria(db,actual,nuevos,'LIBERAR_FRANJA',usuario)
    return NextResponse.json({status:'success',data:{segmentos_conservados:nuevos},
      message:'Franja liberada. Las demás horas continúan bloqueadas.'})
  }catch(e){return responderError(e)}
}

export async function DELETE(request) {
  try {
    const {supabaseAdmin:db}=await contexto(request)
    const body=await request.json()
    const id=Number(body.id),usuario=t(body.usuario)
    if(!Number.isSafeInteger(id)||id<1||!usuario)return fallo('Indique el bloqueo y usuario responsable.')
    const actual=await obtenerBloqueo(db,id)
    if(!actual)return fallo('El bloqueo ya no existe.',404)
    if(!esAdministrativo(actual))return fallo('Solo se pueden retirar bloqueos administrativos.',409)
    const {data,error}=await db.from(tabla).delete().eq('id',id)
      .eq('instructor_id',actual.instructor_id)
      .eq('fecha_inicio',actual.fecha_inicio).eq('fecha_fin',actual.fecha_fin)
      .eq('hora_inicio',actual.hora_inicio).eq('hora_fin',actual.hora_fin)
      .eq('motivo',actual.motivo).select('id').maybeSingle()
    if(error)throw error
    if(!data)return fallo('El bloqueo fue modificado. Actualice la agenda.',409)
    await guardarAuditoria(db,actual,null,'RETIRAR',usuario)
    return NextResponse.json({status:'success',data,
      message:'Bloqueo retirado. Todas las franjas del rango quedaron liberadas.'})
  }catch(e){return responderError(e)}
}
