// app/api/admin/mantenimientos/proveedores/route.js

import { NextResponse } from 'next/server'

import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

function texto(valor) {
  return String(valor ?? '').trim()
}

function mayusculas(valor) {
  return texto(valor).toUpperCase()
}

function correo(valor) {
  return texto(valor).toLowerCase()
}

function entero(valor) {
  const n = Number(valor)
  return Number.isInteger(n) && n > 0 ? n : null
}

function errorHttp(message, status = 400, extra = {}) {
  const error = new Error(message)
  error.status = status
  Object.assign(error, extra)
  return error
}

function responderError(error) {
  if (error?.status) {
    return NextResponse.json(
      { ok: false, status: 'error', message: error.message },
      { status: error.status }
    )
  }

  const respuesta = respuestaErrorEmpresa(error)
  return NextResponse.json(respuesta.body, { status: respuesta.status })
}

async function contexto(request) {
  const resultado = await obtenerSupabaseAdminEmpresaDesdeRequest(request)
  if (!resultado?.supabaseAdmin) {
    throw errorHttp('No fue posible identificar la base de datos de la empresa.', 401)
  }
  return resultado
}

async function cargarTodo(supabaseAdmin) {
  const [rp, rd, rm, ra, rr, rt] = await Promise.all([
    supabaseAdmin
      .from('proveedores')
      .select('*')
      .order('razon_social', { ascending: true }),

    supabaseAdmin
      .from('departamentos')
      .select('id,codigo_dane,nombre,activo')
      .eq('activo', true)
      .order('nombre', { ascending: true }),

    supabaseAdmin
      .from('municipios')
      .select('id,departamento_id,codigo_dane,nombre,tipo,activo')
      .eq('activo', true)
      .order('nombre', { ascending: true }),

    supabaseAdmin
      .from('mantenimiento_actividades_catalogo')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true }),

    supabaseAdmin
      .from('proveedor_mantenimiento_actividades')
      .select('*')
      .eq('activo', true),

    supabaseAdmin
      .from('tecnicos')
      .select('*')
      .order('nombres', { ascending: true }),
  ])

  for (const r of [rp, rd, rm, ra, rr, rt]) {
    if (r.error) throw r.error
  }

  const relaciones = rr.data || []
  const tecnicos = rt.data || []

  const proveedores = (rp.data || []).map((p) => ({
    ...p,
    actividad_ids: relaciones
      .filter((x) => Number(x.proveedor_id) === Number(p.id))
      .map((x) => Number(x.actividad_id)),
    tecnicos: tecnicos.filter((x) => Number(x.proveedor_id) === Number(p.id)),
  }))

  return {
    proveedores,
    departamentos: rd.data || [],
    municipios: rm.data || [],
    actividades: ra.data || [],
  }
}

async function validarUbicacion(supabaseAdmin, departamentoId, municipioId) {
  if (!departamentoId && !municipioId) return

  if (!departamentoId || !municipioId) {
    throw errorHttp('Debe seleccionar departamento y municipio.')
  }

  const { data: municipio, error } = await supabaseAdmin
    .from('municipios')
    .select('id,departamento_id,activo')
    .eq('id', municipioId)
    .maybeSingle()

  if (error) throw error

  if (!municipio || municipio.activo !== true) {
    throw errorHttp('El municipio seleccionado no es válido.')
  }

  if (Number(municipio.departamento_id) !== Number(departamentoId)) {
    throw errorHttp('El municipio no corresponde al departamento seleccionado.')
  }
}

async function guardarActividades(supabaseAdmin, proveedorId, actividadIds) {
  const ids = [...new Set(
    (Array.isArray(actividadIds) ? actividadIds : [])
      .map(entero)
      .filter(Boolean)
  )]

  const { error: errorEliminar } = await supabaseAdmin
    .from('proveedor_mantenimiento_actividades')
    .delete()
    .eq('proveedor_id', proveedorId)

  if (errorEliminar) throw errorEliminar
  if (!ids.length) return

  const { error } = await supabaseAdmin
    .from('proveedor_mantenimiento_actividades')
    .insert(
      ids.map((actividad_id) => ({
        proveedor_id: proveedorId,
        actividad_id,
        activo: true,
      }))
    )

  if (error) throw error
}

async function guardarProveedor(supabaseAdmin, body) {
  const id = entero(body?.id)
  const tipoPersona = mayusculas(body?.tipo_persona)
  const razonSocial = mayusculas(body?.razon_social)
  const nit = texto(body?.nit).replace(/\D/g, '')
  const dv = texto(body?.digito_verificacion).replace(/\D/g, '').slice(0, 1)
  const departamentoId = entero(body?.departamento_id)
  const municipioId = entero(body?.municipio_id)

  if (!['NATURAL', 'JURIDICA'].includes(tipoPersona)) {
    throw errorHttp('Seleccione un tipo de persona válido.')
  }
  if (!razonSocial) throw errorHttp('La razón social o nombre es obligatorio.')
  if (nit && !/^\d+$/.test(nit)) throw errorHttp('El NIT debe contener solo números.')
  if (texto(body?.digito_verificacion) && !/^\d$/.test(dv)) {
    throw errorHttp('El dígito de verificación debe contener un solo número.')
  }

  await validarUbicacion(supabaseAdmin, departamentoId, municipioId)

  if (nit) {
    let q = supabaseAdmin.from('proveedores').select('id,nit,razon_social').eq('nit', nit)
    if (id) q = q.neq('id', id)
    const { data: repetidos, error } = await q.limit(1)
    if (error) throw error
    if ((repetidos || []).length) {
      throw errorHttp(`Ya existe un proveedor registrado con NIT ${nit}.`, 409)
    }
  }

  const registro = {
    tipo_persona: tipoPersona,
    razon_social: razonSocial,
    nombre_comercial: mayusculas(body?.nombre_comercial) || null,
    nit: nit || null,
    digito_verificacion: dv || null,
    direccion: mayusculas(body?.direccion) || null,
    telefono: texto(body?.telefono) || null,
    email: correo(body?.email) || null,
    departamento_id: departamentoId,
    municipio_id: municipioId,
    activo: body?.activo !== false,
    observaciones: texto(body?.observaciones) || null,
    updated_at: new Date().toISOString(),
  }

  let consulta
  if (id) {
    consulta = supabaseAdmin
      .from('proveedores')
      .update(registro)
      .eq('id', id)
      .select('*')
      .single()
  } else {
    consulta = supabaseAdmin
      .from('proveedores')
      .insert(registro)
      .select('*')
      .single()
  }

  const { data, error } = await consulta
  if (error) throw error

  await guardarActividades(supabaseAdmin, data.id, body?.actividad_ids)

  return data
}

async function guardarTecnico(supabaseAdmin, body) {
  const id = entero(body?.id)
  const proveedorId = entero(body?.proveedor_id)
  const nombres = mayusculas(body?.nombres)
  const documento = texto(body?.documento)

  if (!proveedorId) throw errorHttp('No se identificó el proveedor.')
  if (!nombres) throw errorHttp('El nombre del técnico es obligatorio.')
  if (!documento) throw errorHttp('El documento del técnico es obligatorio.')

  const registro = {
    proveedor_id: proveedorId,
    nombres,
    documento,
    telefono: texto(body?.telefono) || null,
    email: correo(body?.email) || null,
    activo: body?.activo !== false,
    observaciones: texto(body?.observaciones) || null,
    updated_at: new Date().toISOString(),
  }

  let consulta
  if (id) {
    consulta = supabaseAdmin
      .from('tecnicos')
      .update(registro)
      .eq('id', id)
      .eq('proveedor_id', proveedorId)
      .select('*')
      .single()
  } else {
    consulta = supabaseAdmin
      .from('tecnicos')
      .insert(registro)
      .select('*')
      .single()
  }

  const { data, error } = await consulta
  if (error) throw error
  return data
}

export async function GET(request) {
  try {
    const { supabaseAdmin } = await contexto(request)
    const data = await cargarTodo(supabaseAdmin)

    return NextResponse.json({
      ok: true,
      status: 'success',
      ...data,
    })
  } catch (error) {
    console.error('GET proveedores:', error)
    return responderError(error)
  }
}

export async function POST(request) {
  try {
    const { supabaseAdmin } = await contexto(request)
    const body = await request.json()
    const accion = mayusculas(body?.accion)

    if (accion === 'GUARDAR_PROVEEDOR') {
      const proveedor = await guardarProveedor(supabaseAdmin, body)
      return NextResponse.json({
        ok: true,
        status: 'success',
        message: body?.id
          ? 'Proveedor actualizado correctamente.'
          : 'Proveedor registrado correctamente.',
        proveedor,
      })
    }

    if (accion === 'CAMBIAR_ESTADO_PROVEEDOR') {
      const id = entero(body?.id)
      if (!id) throw errorHttp('Proveedor no válido.')

      const { data, error } = await supabaseAdmin
        .from('proveedores')
        .update({
          activo: body?.activo === true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error

      return NextResponse.json({
        ok: true,
        status: 'success',
        message: data.activo ? 'Proveedor activado.' : 'Proveedor inactivado.',
        proveedor: data,
      })
    }

    if (accion === 'GUARDAR_TECNICO') {
      const tecnico = await guardarTecnico(supabaseAdmin, body)
      return NextResponse.json({
        ok: true,
        status: 'success',
        message: body?.id
          ? 'Técnico actualizado correctamente.'
          : 'Técnico registrado correctamente.',
        tecnico,
      })
    }

    if (accion === 'CAMBIAR_ESTADO_TECNICO') {
      const id = entero(body?.id)
      if (!id) throw errorHttp('Técnico no válido.')

      const { data, error } = await supabaseAdmin
        .from('tecnicos')
        .update({
          activo: body?.activo === true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error

      return NextResponse.json({
        ok: true,
        status: 'success',
        message: data.activo ? 'Técnico activado.' : 'Técnico inactivado.',
        tecnico: data,
      })
    }

    throw errorHttp('Acción no válida.')
  } catch (error) {
    console.error('POST proveedores:', error)
    return responderError(error)
  }
}
