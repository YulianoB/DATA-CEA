import { NextResponse } from 'next/server'
import { getMasterSupabase } from '@/lib/supabaseMaster'
import { autorizadoMaster } from '@/lib/masterApiSecurity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  if (!await autorizadoMaster(request)) {
    return NextResponse.json({ message: 'Acceso no autorizado.' }, { status: 401 })
  }
  try {
    const { data, error } = await getMasterSupabase()
      .from('empresas')
      .select('id,nit,codigo,nombre,razon_social,nivel_cea,estado,supabase_url,supabase_service_role_secret_id')
      .order('nombre')
    if (error) throw error
    return NextResponse.json({
      empresas: (data || []).map(({ supabase_service_role_secret_id, ...empresa }) => ({
        ...empresa,
        clave_configurada: Boolean(supabase_service_role_secret_id),
      })),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ message: 'No fue posible consultar las empresas.' }, { status: 500 })
  }
}
