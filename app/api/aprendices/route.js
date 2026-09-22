// app/api/aprendices/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CATS_VALIDAS = new Set(['A2','B1','C1','C2','RC1','C3'])

function limpiarCategorias(arr) {
  if (!Array.isArray(arr)) return []
  const out = []
  for (const x of arr) {
    const v = String(x || '').trim().toUpperCase()
    if (CATS_VALIDAS.has(v) && !out.includes(v)) out.push(v)
  }
  return out
}
function toIntOrNull(v) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

// GET: devuelve TODAS las matrículas para un documento (orden desc por fecha de creación)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const documento = searchParams.get('documento')
    if (!documento) {
      return NextResponse.json({ status: 'error', message: 'Falta documento' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('aprendices')
      .select('*')
      .eq('documento', documento)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ status: 'error', message: error.message }, { status: 400 })
    return NextResponse.json({
      status: 'success',
      data: data || [],
      latest: (data && data.length ? data[0] : null)
    }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ status: 'error', message: e.message }, { status: 500 })
  }
}

// POST: crea UNA matrícula (el trigger pone consecutivo/fecha/estado)
export async function POST(req) {
  try {
    const body = await req.json()
    const oblig = ['tipo_doc','documento','nombres','apellidos','fecha_nacimiento','genero']
    const faltantes = oblig.filter(k => !String(body?.[k] ?? '').trim())
    if (faltantes.length) {
      return NextResponse.json({
        status: 'error',
        message: `Campos obligatorios faltantes: ${faltantes.join(', ')}`
      }, { status: 400 })
    }

    const payload = {
      tipo_doc: String(body.tipo_doc).toUpperCase(),
      documento: String(body.documento).trim(),
      lugar_expedicion: body.lugar_expedicion || '',
      genero: String(body.genero || '').toUpperCase(),
      nombres: body.nombres || '',
      apellidos: body.apellidos || '',
      fecha_nacimiento: body.fecha_nacimiento || null,

      celular: body.celular || '',
      correo: (body.correo || '').toLowerCase(),
      direccion: body.direccion || '',
      barrio: body.barrio || '',
      ciudad: body.ciudad || '',

      estado_civil: body.estado_civil || '',
      ocupacion: body.ocupacion || '',
      eps: body.eps || '',
      estrato: toIntOrNull(body.estrato),
      nivel_educativo: body.nivel_educativo || '',

      convenio: body.convenio || '',
      categorias: limpiarCategorias(body.categorias),

      acudi_nombres: body.acudi_nombres || '',
      acudi_apellidos: body.acudi_apellidos || '',
      acudi_tipo_doc: body.acudi_tipo_doc || '',
      acudi_documento: body.acudi_documento || '',
      acudi_celular: body.acudi_celular || '',
      acudi_direccion: body.acudi_direccion || '',
      acudi_correo: (body.acudi_correo || '').toLowerCase(),

      emergencia_nombre: body.emergencia_nombre || '',
      emergencia_celular: body.emergencia_celular || '',
    }

    const { data, error } = await supabase
      .from('aprendices')
      .insert(payload)
      .select()
      .single()

    if (error) return NextResponse.json({ status: 'error', message: error.message }, { status: 400 })

    return NextResponse.json({
      status: 'success',
      data: { id: data.id, consecutivo: data.consecutivo, fecha_matricula: data.fecha_matricula }
    }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ status: 'error', message: e.message }, { status: 500 })
  }
}
