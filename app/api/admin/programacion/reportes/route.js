import { NextResponse } from 'next/server'
import { obtenerContextoCEA } from '@/lib/autorizacionCEA'
import { respuestaErrorEmpresa } from '@/lib/supabaseEmpresaServer'

const ESTADOS = ['AGENDADA','PENDIENTE_CARGUE','DICTADA','NO_DICTADA']
const texto = v => String(v ?? '').trim()
const fechaValida = v => /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v)) && new Date(v + 'T12:00:00Z').toISOString().slice(0,10) === v
const fallo = (message,status=400) => NextResponse.json({status:'error',message},{status})
const nombre = p => [p?.nombres,p?.apellidos].filter(Boolean).join(' ').trim()
const diferenciaDias = (a,b) => (Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000

// Reportes de SOLO LECTURA; aislados de las reglas de progreso/cargue RUNT.
// La paginación evita el límite habitual de 1000 registros de PostgREST.
export async function GET(request) {
  try {
    const { supabaseAdmin: db } = await obtenerContextoCEA(request, {
      rolesPermitidos:['ADMINISTRATIVO']
    })
    const q = new URL(request.url).searchParams
    if(q.get('solo_instructores')==='1') {
      const {data:personal,error} = await db.from('personal')
        .select('id,nombres,apellidos,cargo,tipo_personal,estado')
        .order('nombres',{ascending:true})
      if(error) throw error
      const instructores=(personal||[])
        .filter(p => texto(p.cargo).toUpperCase().includes('INSTRUCTOR') ||
                     texto(p.tipo_personal).toUpperCase().includes('INSTRUCTOR'))
        .map(p=>({id:p.id,nombre:nombre(p),estado:p.estado}))
      return NextResponse.json({status:'success',instructores},{headers:{'Cache-Control':'no-store'}})
    }
    const desde = texto(q.get('fecha_inicio'))
    const hasta = texto(q.get('fecha_fin'))
    const instructorId = texto(q.get('instructor_id'))
    if (!fechaValida(desde) || !fechaValida(hasta) || desde>hasta)
      return fallo('Seleccione un rango de fechas válido.')
    if (diferenciaDias(desde,hasta)>92) return fallo('El rango máximo del reporte es de 93 días.')
    if(instructorId && (!/^\d+$/.test(instructorId) || Number(instructorId)<=0))
      return fallo('Seleccione un instructor válido.')

    const {data:personal,error:errorPersonal} = await db.from('personal')
      .select('id,nombres,apellidos,cargo,tipo_personal,estado')
      .order('nombres',{ascending:true})
    if(errorPersonal) throw errorPersonal
    const instructores = (personal||[])
      .filter(p => texto(p.cargo).toUpperCase().includes('INSTRUCTOR') ||
                   texto(p.tipo_personal).toUpperCase().includes('INSTRUCTOR'))
      .map(p=>({id:p.id,nombre:nombre(p),estado:p.estado}))
    const personas = new Map(instructores.map(p=>[Number(p.id),p]))

    const clases = []
    const tamano = 500
    for (let offset=0; ;offset+=tamano) {
      let query=db.from('programacion_clases')
        .select(`id,instructor_id,matricula_id,recibo_refuerzo_id,cliente_refuerzo_id,
          fecha,hora_inicio,duracion_horas,estado,tipo_clase,tipo_programacion,categoria,
          observacion_no_dictada,observaciones,vehiculo_id,
          aprendiz:aprendices(id,consecutivo,tipo_doc,documento,nombres,apellidos),
          cliente:clientes_refuerzo(id,documento,nombre_completo)`)
        .gte('fecha',desde).lte('fecha',hasta).in('estado',ESTADOS)
        .order('fecha',{ascending:true}).order('hora_inicio',{ascending:true}).order('id',{ascending:true})
        .range(offset,offset+tamano-1)
      if(instructorId)query=query.eq('instructor_id',Number(instructorId))
      const {data,error}=await query
      if(error) throw error
      clases.push(...(data||[]))
      if(!data || data.length<tamano) break
      if(offset>=49500) return fallo('El reporte supera 50.000 clases. Seleccione un rango menor.',413)
    }

    const detalle = clases.map(c=>{
      const instructor=personas.get(Number(c.instructor_id))
      const persona=c.aprendiz
      const cliente=c.cliente
      return {
        id:c.id,fecha:c.fecha,hora_inicio:texto(c.hora_inicio).slice(0,5),
        instructor_id:c.instructor_id,instructor:instructor?.nombre||'Instructor '+c.instructor_id,
        tipo_clase:c.tipo_clase||'PRACTICA',tipo_programacion:c.tipo_programacion,
        categoria:c.categoria||'',estado:c.estado,
        documento:persona?.documento||cliente?.documento||'',
        aprendiz:persona?nombre(persona):(cliente?.nombre_completo||''),
        consecutivo:persona?.consecutivo||'',
        observacion:c.estado==='NO_DICTADA'
          ? (c.observacion_no_dictada||c.observaciones||'')
          : (c.observaciones||'')
      }
    })

    const resumen = new Map()
    for(const fila of detalle) {
      const clave=String(fila.instructor_id)+'|'+fila.fecha
      if(!resumen.has(clave))resumen.set(clave,{
        instructor_id:fila.instructor_id,instructor:fila.instructor,fecha:fila.fecha,
        total:0,agendadas:0,dictadas:0,pendientes_cargue:0,no_dictadas:0,
        practicas:0,teorias:0,pruebas_conduccion:0
      })
      const item=resumen.get(clave)
      item.total++
      if(fila.estado==='AGENDADA')item.agendadas++
      if(fila.estado==='DICTADA')item.dictadas++
      if(fila.estado==='PENDIENTE_CARGUE')item.pendientes_cargue++
      if(fila.estado==='NO_DICTADA')item.no_dictadas++
      if(fila.tipo_clase==='TEORIA')item.teorias++
      else if(fila.tipo_clase==='PRUEBA_CONDUCCION')item.pruebas_conduccion++
      else item.practicas++
    }
    const totales=detalle.reduce((a,c)=>{
      a.total++
      if(c.estado==='AGENDADA')a.agendadas++
      if(c.estado==='DICTADA')a.dictadas++
      if(c.estado==='PENDIENTE_CARGUE')a.pendientes_cargue++
      if(c.estado==='NO_DICTADA')a.no_dictadas++
      return a
    },{total:0,agendadas:0,dictadas:0,pendientes_cargue:0,no_dictadas:0})
    return NextResponse.json({
      status:'success',rango:{fecha_inicio:desde,fecha_fin:hasta},
      instructores,totales,
      resumen:[...resumen.values()].sort((a,b)=>a.fecha.localeCompare(b.fecha)||
        a.instructor.localeCompare(b.instructor,'es')),
      detalle
    },{headers:{'Cache-Control':'no-store'}})
  } catch(e) {
    console.error('Error consultando reportes de programación:',e)
    const r=respuestaErrorEmpresa(e)
    return NextResponse.json(r.body,{status:r.status})
  }
}
