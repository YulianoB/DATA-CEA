import { NextResponse } from 'next/server'
import { obtenerContextoCEA } from '@/lib/autorizacionCEA'
import { respuestaErrorEmpresa } from '@/lib/supabaseEmpresaServer'

const TIPOS = new Set(['TEORIA', 'PRUEBA_CONDUCCION'])
const OCUPAN = ['AGENDADA', 'PENDIENTE_CARGUE', 'DICTADA']
const str = value => String(value ?? '').trim()
const hh = value => str(value).slice(0, 5)
const mins = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5))
const errorJson = (message, status = 400) => NextResponse.json({status:'error',message},{status})
const validaFecha = value => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) && new Date(value + 'T12:00:00Z').toISOString().slice(0,10) === value

// Reserva una hora en la MISMA tabla de clases prácticas. Las reglas de
// progreso y matrícula permanecen exclusivamente en su flujo original.
export async function POST(request) {
  try {
    const body = await request.json()
    const { supabaseAdmin: db } = await obtenerContextoCEA(request, {
      rolesPermitidos: ['ADMINISTRATIVO'], body
    })
    const tipo = str(body.tipo_clase).toUpperCase()
    const instructorId = Number(body.instructor_id)
    const vehiculoId = body.vehiculo_id ? Number(body.vehiculo_id) : null
    const categoria = str(body.categoria).toUpperCase()
    const fecha = str(body.fecha)
    const hora = hh(body.hora_inicio)
    const usuario = str(body.usuario || body.usuario_programa)
    const observaciones = str(body.observaciones)
    if (!TIPOS.has(tipo)) return errorJson('Seleccione teoría o prueba de conducción.')
    if (!Number.isInteger(instructorId) || instructorId <= 0 ||
        !validaFecha(fecha) || !/^(0[6-9]|1\d|2[01]):00$/.test(hora) || !usuario) {
      return errorJson('Instructor, fecha, hora entre 06:00 y 21:00 y usuario son obligatorios.')
    }
    if (tipo === 'PRUEBA_CONDUCCION' &&
        (!Number.isInteger(vehiculoId) || vehiculoId <= 0 || !categoria)) {
      return errorJson('Para la prueba de conducción seleccione vehículo y categoría.')
    }
    const {data:instructor,error:errorInstructor}=await db.from('personal')
      .select('id,estado,cargo,tipo_personal').eq('id',instructorId).maybeSingle()
    if(errorInstructor) throw errorInstructor
    if(!instructor || str(instructor.estado).toUpperCase()!=='ACTIVO' ||
       !(str(instructor.cargo).toUpperCase().includes('INSTRUCTOR') ||
         str(instructor.tipo_personal).toUpperCase().includes('INSTRUCTOR'))) {
      return errorJson('Seleccione un instructor activo.',409)
    }
    if(tipo==='PRUEBA_CONDUCCION') {
      const {data:vehiculo,error:errorVehiculo}=await db.from('vehiculos')
        .select('id,estado,tipo_vehiculo').eq('id',vehiculoId).maybeSingle()
      if(errorVehiculo) throw errorVehiculo
      if(!vehiculo || str(vehiculo.estado).toUpperCase()!=='ACTIVO')
        return errorJson('Seleccione un vehículo activo.',409)
      const normalizar = valor => str(valor).toUpperCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g,'').replace(/[-_]/g,' ').replace(/\s+/g,' ')
      const tiposPermitidos = {
        A2:['MOTOCICLETA'], B1:['AUTOMOVIL','CAMIONETA'],
        C1:['AUTOMOVIL','CAMIONETA'], RC1:['AUTOMOVIL','CAMIONETA'],
        C2:['CAMION'], C3:['TRACTO CAMION']
      }
      if(!tiposPermitidos[categoria]?.includes(normalizar(vehiculo.tipo_vehiculo))) {
        return errorJson('El tipo de vehículo no corresponde a la categoría seleccionada.',409)
      }
      const {data:requisito,error:errorCategoria}=await db.from('runt_requisitos_categoria')
        .select('categoria').eq('categoria',categoria).maybeSingle()
      if(errorCategoria) throw errorCategoria
      if(!requisito) return errorJson('La categoría seleccionada no está configurada.',409)
    }
    const fin = mins(hora) + 60
    const [clases,bloqueos] = await Promise.all([
      db.from('programacion_clases').select('id,hora_inicio,duracion_horas,estado,vehiculo_id,instructor_id')
        .eq('fecha',fecha).in('estado',OCUPAN)
        .or(tipo==='PRUEBA_CONDUCCION'
          ? `instructor_id.eq.${instructorId},vehiculo_id.eq.${vehiculoId}`
          : `instructor_id.eq.${instructorId}`),
      db.from('bloqueos_agenda_instructores')
        .select('id,hora_inicio,hora_fin')
        .eq('instructor_id',instructorId).lte('fecha_inicio',fecha).gte('fecha_fin',fecha)
    ])
    if(clases.error) throw clases.error
    if(bloqueos.error) throw bloqueos.error
    const cruceClase=(clases.data||[]).some(c=>{
      const desde=mins(hh(c.hora_inicio))
      return desde<fin && desde+Number(c.duracion_horas||1)*60>mins(hora)
    })
    if(cruceClase) return errorJson('El instructor o vehículo ya tiene una actividad en este horario.',409)
    if((bloqueos.data||[]).some(b=>mins(hh(b.hora_inicio))<fin &&
                                  mins(hh(b.hora_fin))>mins(hora)))
      return errorJson('El instructor tiene un bloqueo administrativo en este horario.',409)
    const {data,error}=await db.from('programacion_clases').insert({
      tipo_clase:tipo,tipo_programacion:tipo,instructor_id:instructorId,
      vehiculo_id:tipo==='TEORIA'?null:vehiculoId,
      categoria:tipo==='TEORIA'?null:categoria,
      matricula_id:null,recibo_refuerzo_id:null,cliente_refuerzo_id:null,
      fecha,hora_inicio:hora,duracion_horas:1,estado:'AGENDADA',
      observaciones:observaciones||null,usuario_programa:usuario
    }).select('id,tipo_clase,tipo_programacion,instructor_id,vehiculo_id,categoria,fecha,hora_inicio,estado').single()
    if(error) {
      if(error.code==='23505') return errorJson('La franja ya está ocupada; actualice la agenda.',409)
      throw error
    }
    return NextResponse.json({status:'success',data,
      message:tipo==='TEORIA'?'Clase teórica programada.':'Prueba de conducción programada.'},{status:201})
  } catch(e) {
    console.error('Error programando actividad del instructor:',e)
    const r=respuestaErrorEmpresa(e)
    return NextResponse.json(r.body,{status:r.status})
  }
}
