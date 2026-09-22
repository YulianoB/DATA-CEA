import { NextResponse } from 'next/server'
import { getMasterSupabase } from '@/lib/supabaseMaster'

export async function GET() {
  try {
    const supabase = getMasterSupabase()

    const { data, error } = await supabase
      .from('empresas')
      .select('nit, codigo, nombre, razon_social, estado')
      .eq('estado', 'activo')
      .order('nombre', { ascending: true })

    if (error) {
      console.error('Error consultando empresas:', error)

      return NextResponse.json(
        {
          status: 'failed',
          message: 'Error consultando empresas.',
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'success',
      empresas: data || [],
    })
  } catch (error) {
    console.error('Error en /api/empresas:', error)

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