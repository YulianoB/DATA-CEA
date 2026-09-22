import { NextResponse } from 'next/server'
import { getMasterSupabase } from '@/lib/supabaseMaster'

export async function GET(request, { params }) {
  try {
    const { nit } = await params

    if (!nit) {
      return NextResponse.json(
        { status: 'failed', message: 'NIT no recibido.' },
        { status: 400 }
      )
    }

    const supabase = getMasterSupabase()

    const { data, error } = await supabase
      .from('empresas')
      .select(`
        nit,
        codigo,
        nombre,
        razon_social,
        supabase_url,
        supabase_anon_key,
        correos_notificacion,
        correos_mantenimiento,
        correos_preoperacional,
        correos_siniestros,
        correos_vencimientos,
        estado
      `)
      .eq('nit', nit)
      .eq('estado', 'activo')
      .single()

    if (error) {
      console.error('Error consultando empresa:', error)
      return NextResponse.json(
        { status: 'failed', message: 'Empresa no encontrada o inactiva.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      status: 'success',
      empresa: data,
    })
  } catch (error) {
    console.error('Error en /api/empresas/[nit]:', error)

    return NextResponse.json(
      {
        status: 'failed',
        message: 'Error interno del servidor.',
        error: error.message,
      },
      { status: 500 }
    )
  }
}