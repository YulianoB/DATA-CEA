// app/api/convenios/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function digitsOnly(s = '') {
  return String(s || '').replace(/\D+/g, '')
}
function isValidEmail(s = '') {
  if (!s) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}
function normalizeIn(payload = {}) {
  const obj = { ...payload }
  // normalizar campos
  obj.nombre    = (obj.nombre || '').toString().trim().toUpperCase()
  obj.documento = digitsOnly(obj.documento)
  obj.celular   = digitsOnly(obj.celular)
  obj.direccion = (obj.direccion || '').toString().trim().toUpperCase()
  obj.correo    = (obj.correo || '').toString().trim().toLowerCase()
  // activo puede venir como boolean; si no, default true en DB
  return obj
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim()
    const includeInactivos = (searchParams.get('include_inactivos') || 'false').toLowerCase() === 'true'
    let query = supabase
      .from('convenios')
      .select('id, nombre, documento, celular, direccion, correo, activo, created_at, updated_at')
      .order('nombre', { ascending: true })
    if (!includeInactivos) query = query.eq('activo', true)
    if (q) {
      // búsqueda por nombre/documento
      query = query.or(`nombre.ilike.%${q}%,documento.ilike.%${q}%`)
    }
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ status: 'success', data })
  } catch (e) {
    return NextResponse.json({ status: 'error', message: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const n = normalizeIn(body)

    // Validaciones mínimas
    if (!n.nombre || !n.documento || !n.celular) {
      return NextResponse.json({ status:'error', message:'Campos obligatorios: nombre, documento, celular.' }, { status: 400 })
    }
    if (!isValidEmail(n.correo)) {
      return NextResponse.json({ status:'error', message:'Correo inválido.' }, { status: 400 })
    }

    const insert = {
      nombre: n.nombre,
      documento: n.documento,
      celular: n.celular,
      direccion: n.direccion || null,
      correo: n.correo || null,
      activo: typeof n.activo === 'boolean' ? n.activo : true,
    }
    const { data, error } = await supabase.from('convenios').insert(insert).select().single()
    if (error) {
      // conflicto por documento (índice único)
      if (String(error.message || '').toLowerCase().includes('duplicate')) {
        return NextResponse.json({ status:'error', message:'Ya existe un convenio con ese documento.' }, { status: 409 })
      }
      return NextResponse.json({ status:'error', message:error.message }, { status: 400 })
    }
    return NextResponse.json({ status:'success', data }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ status:'error', message: e.message }, { status: 500 })
  }
}
