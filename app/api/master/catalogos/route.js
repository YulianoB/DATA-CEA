import { NextResponse } from 'next/server'
import { autorizadoMaster } from '@/lib/masterApiSecurity'
import { getMasterSupabase } from '@/lib/supabaseMaster'
import { obtenerSupabaseAdminEmpresaPorNit } from '@/lib/supabaseEmpresaServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  if (!await autorizadoMaster(request)) return NextResponse.json({status:'failed',message:'No autorizado.'},{status:401})
  const url = new URL(request.url)
  const catalogo = url.searchParams.get('catalogo')
  if (!['departamentos','municipios'].includes(catalogo)) return NextResponse.json({status:'failed',message:'Catálogo no permitido.'},{status:400})
  const departamentoId = url.searchParams.get('departamento_id')
  if (catalogo === 'municipios' && (!departamentoId || !/^[0-9]+$/.test(departamentoId))) return NextResponse.json({status:'failed',message:'Departamento inválido.'},{status:400})
  try {
    const {data:empresas,error:err} = await getMasterSupabase().from('empresas').select('nit').eq('estado','activo').not('supabase_service_role_secret_id','is',null).order('id').limit(10)
    if (err) throw err
    for (const empresa of empresas || []) {
      try {
        const {supabaseAdmin} = await obtenerSupabaseAdminEmpresaPorNit(empresa.nit)
        let consulta = supabaseAdmin.from(catalogo).select(catalogo==='departamentos'?'id,nombre,codigo_dane':'id,nombre,departamento_id,codigo_dane').eq('activo',true).order('nombre')
        if (catalogo === 'municipios') consulta = consulta.eq('departamento_id',Number(departamentoId))
        const {data,error} = await consulta
        if (!error) return NextResponse.json({status:'success',data:data||[]},{headers:{'Cache-Control':'no-store'}})
      } catch {}
    }
    return NextResponse.json({status:'failed',message:'No se pudo consultar el catálogo de ubicación de un CEA configurado.'},{status:503})
  } catch {return NextResponse.json({status:'failed',message:'No fue posible cargar el catálogo.'},{status:500})}
}
