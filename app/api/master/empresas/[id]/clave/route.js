import { NextResponse } from 'next/server'
import { getMasterSupabase } from '@/lib/supabaseMaster'
import { autorizadoMaster, origenValido } from '@/lib/masterApiSecurity'

export const runtime = 'nodejs'

export async function POST(request, { params }) {
  if (!await autorizadoMaster(request)) {
    return NextResponse.json({ message: 'Acceso no autorizado.' }, { status: 401 })
  }
  if (!origenValido(request)) {
    return NextResponse.json({ message: 'Origen no autorizado.' }, { status: 403 })
  }
  try {
    const { id } = await params
    const empresaId = Number(id)
    if (!Number.isSafeInteger(empresaId) || empresaId < 1) {
      return NextResponse.json({ message: 'Identificador inválido.' }, { status: 400 })
    }
    const body = await request.json()
    const clave = body?.clave
    if (typeof clave !== 'string' || !clave.trim() || clave.length > 4096) {
      return NextResponse.json({ message: 'Clave inválida.' }, { status: 400 })
    }
    const { error } = await getMasterSupabase().rpc('master_guardar_clave_cea', {
      p_empresa_id: empresaId,
      p_service_role_key: clave,
    })
    if (error) {
      return NextResponse.json({ message: 'No fue posible guardar la clave. Verifica la empresa y los permisos de Vault.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ message: 'No fue posible procesar la solicitud.' }, { status: 500 })
  }
}
