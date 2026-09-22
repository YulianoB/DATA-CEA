// app/api/convenios/[id]/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function digitsOnly(s = '') { return String(s || '').replace(/\D+/g, '') }
function isValidEmail(s = '') { return !s || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) }

export async function PATCH(_req, { params }) {
  try {
    const id = Number(params?.id)
    if (!id) return NextResponse.json({ status:'error', message:'ID inválido.' }, { status: 400 })
    const body = await _req.json()
    const upd = {}

    if (body.nombre != null)    upd.nombre    = String(body.nombre).trim().toUpperCase()
    if (body.documento != null) upd.documento = digitsOnly(body.documento)
    if (body.celular != null)   upd.celular   = digitsOnly(body.celular)
    if (body.direccion != null) upd.direccion = String(body.direccion || '').trim().toUpperCase() || null
    if (body.correo != null)    upd.correo    = String(body.correo || '').trim().toLowerCase() || null
    if (body.activo != null)    upd.activo    = !!body.activo

    if (upd.correo && !isValidEmail(upd.correo)) {
      return NextResponse.json({ status:'error', message:'Correo inválido.' }, { status: 400 })
    }

    if (Object.keys(upd).length === 0) {
      return NextResponse.json({ status:'error', message:'Nada para actualizar.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('convenios')
      .update(upd)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (String(error.message || '').toLowerCase().includes('duplicate')) {
        return NextResponse.json({ status:'error', message:'Documento ya usado por otro convenio.' }, { status: 409 })
      }
      return NextResponse.json({ status:'error', message:error.message }, { status: 400 })
    }
    return NextResponse.json({ status:'success', data })
  } catch (e) {
    return NextResponse.json({ status:'error', message: e.message }, { status: 500 })
  }
}

/** Soft-delete (opcional): marcar inactivo */
export async function DELETE(_req, { params }) {
  try {
    const id = Number(params?.id)
    if (!id) return NextResponse.json({ status:'error', message:'ID inválido.' }, { status: 400 })
    const { data, error } = await supabase
      .from('convenios')
      .update({ activo: false })
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ status:'error', message:error.message }, { status: 400 })
    return NextResponse.json({ status:'success', data })
  } catch (e) {
    return NextResponse.json({ status:'error', message: e.message }, { status: 500 })
  }
}
