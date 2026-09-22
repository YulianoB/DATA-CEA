import { NextResponse } from 'next/server'
import { getMasterSupabase } from '@/lib/supabaseMaster'
import { crearClienteEmpresa } from '@/lib/supabaseDinamico'

export async function GET(request, { params }) {
  try {
    const { nit } = await params

    const master = getMasterSupabase()

    const { data: empresa, error } = await master
      .from('empresas')
      .select('*')
      .eq('nit', nit)
      .eq('estado', 'activo')
      .single()

    if (error || !empresa) {
      return NextResponse.json(
        { status: 'failed', message: 'Empresa no encontrada.' },
        { status: 404 }
      )
    }

    const supabaseEmpresa = crearClienteEmpresa(empresa)

    const { count, error: errorPersonal } = await supabaseEmpresa
      .from('personal')
      .select('*', { count: 'exact', head: true })

    if (errorPersonal) {
      return NextResponse.json(
        {
          status: 'failed',
          message: 'No fue posible consultar la tabla personal.',
          error: errorPersonal.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'success',
      empresa: empresa.nombre,
      registros_personal: count ?? 0,
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'failed',
        error: error.message,
      },
      { status: 500 }
    )
  }
}