import { NextResponse } from 'next/server'
import { obtenerContextoCEA } from '@/lib/autorizacionCEA'
import { respuestaErrorEmpresa } from '@/lib/supabaseEmpresaServer'

function texto(v) { return String(v ?? '').trim() }
function normalizar(v) { return texto(v).toUpperCase() }
function errorRespuesta(e) {
  const r = respuestaErrorEmpresa(e)
  return NextResponse.json(r.body, { status: r.status })
}
function salida(data, status=200) { return NextResponse.json({ status:'success', data }, {status}) }

export async function GET(request) {
  try {
    const { supabaseAdmin: db } = await obtenerContextoCEA(request, {rolesPermitidos:['ADMINISTRATIVO']})
    const u = new URL(request.url)
    const id = Number(u.searchParams.get('id') || 0)
    let consulta = db.from('clientes_refuerzo')
      .select('id,tipo_documento,documento,nombre_completo,celular,categoria,observaciones,activo')
      .eq('activo',true)
    if (id > 0 && Number.isInteger(id)) {
      const { data, error } = await consulta.eq('id',id).maybeSingle()
      if (error) throw error
      return salida(data)
    }
    const buscar = texto(u.searchParams.get('busqueda'))
    if (buscar.length < 3) return salida([])
    // Consultas separadas para evitar límites de paginación y la
    // interpolación de caracteres especiales en expresiones OR.
    const patron = '%' + buscar.replace(/[\\%_]/g, '\\\\    // Filtrado local posterior a la consulta: evita interpolar caracteres
    // especiales sin escapar dentro del operador PostgREST .or().
    const {data,error} = await consulta.order('nombre_completo').limit(1000)
    if(error) throw error
    const q=buscar.toLocaleLowerCase('es')
    return salida((data||[]).filter(p => [p.documento,p.nombre_completo,p.celular]
      .some(v => texto(v).toLocaleLowerCase('es').includes(q))).slice(0,30))') + '%'
    const campos = ['documento','nombre_completo','celular']
    const consultas = await Promise.all(campos.map(campo=>
      db.from('clientes_refuerzo')
        .select('id,tipo_documento,documento,nombre_completo,celular,categoria,observaciones,activo')
        .eq('activo',true).ilike(campo,patron).limit(30)
    ))
    for (const respuesta of consultas) if(respuesta.error) throw respuesta.error
    const unicos = new Map()
    for (const respuesta of consultas) for (const cliente of respuesta.data || []) unicos.set(cliente.id, cliente)
    return salida([...unicos.values()].slice(0,30))
  } catch (e) { return errorRespuesta(e) }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { supabaseAdmin: db } = await obtenerContextoCEA(request, {rolesPermitidos:['ADMINISTRATIVO'], body})
    const documento=texto(body.documento)
    const nombre_completo=texto(body.nombre_completo)
    const categoria=normalizar(body.categoria)
    const tipo_documento=normalizar(body.tipo_documento || 'CC')
    const celular=texto(body.celular)
    const observaciones=texto(body.observaciones)
    if (!documento || !nombre_completo || !categoria)
      return NextResponse.json({status:'error',message:'Documento, nombre y categoría son obligatorios.'},{status:400})
    if ([documento,nombre_completo,categoria,tipo_documento,celular,observaciones].some(v=>v.length>500))
      return NextResponse.json({status:'error',message:'Uno de los campos supera el tamaño permitido.'},{status:400})
    const {data: anterior,error: errorAnterior}=await db.from('clientes_refuerzo')
      .select('id,tipo_documento,documento,nombre_completo,celular,categoria,observaciones,activo').eq('documento',documento).eq('categoria',categoria).maybeSingle()
    if(errorAnterior) throw errorAnterior
    if(anterior && anterior.activo !== true)
      return NextResponse.json({status:'error',message:'Este cliente externo ya está registrado pero inactivo. Revise su ficha antes de programarlo.'},{status:409})
    if(anterior) return salida({ ...anterior, reutilizado:true })
    const {data,error}=await db.from('clientes_refuerzo')
      .insert({documento,nombre_completo,categoria,tipo_documento,celular:celular||null,observaciones:observaciones||null})
      .select('id,tipo_documento,documento,nombre_completo,celular,categoria,observaciones,activo').single()
    if(error) throw error
    return salida(data,201)
  } catch(e) { return errorRespuesta(e) }
}
