// app/api/personal/[id]/cuenta/route.js

import { NextResponse } from 'next/server'
import { sesionNotificaciones } from '@/lib/notificacionesCorporativasServer'
import {
  obtenerSupabaseAdminEmpresaPorNit,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

const ROLES_PERMITIDOS = {
  ADMINISTRATIVO: 'menu_administrativo',
  AUXILIAR_ADMINISTRATIVO: 'menu_basico',
  INSTRUCTOR_TEORIA: 'menu_basico',
  INSTRUCTOR_PRACTICA: 'menu_instructor_practica',
}

function normalizarEmail(valor) {
  return String(valor || '').trim().toLowerCase()
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function respuestaError(error) {
  const respuesta = respuestaErrorEmpresa(error)

  return NextResponse.json(
    respuesta.body,
    { status: respuesta.status }
  )
}

export async function GET(request, { params }) {
  try {
    const sesion = await sesionNotificaciones(request, ['ADMINISTRATIVO'])
    if (!sesion) return NextResponse.json({ status: 'failed', message: 'Sesión no autorizada.' }, { status: 403 })
    const nitSolicitado = new URL(request.url).searchParams.get('nit')
    if (nitSolicitado && nitSolicitado.trim() !== String(sesion.nitEmpresa).trim()) {
      return NextResponse.json({ status: 'failed', message: 'Empresa no autorizada.' }, { status: 403 })
    }

    const { id } = await params

    const { supabaseAdmin: supabase } = await obtenerSupabaseAdminEmpresaPorNit(sesion.nitEmpresa)

    const { data, error } = await supabase
      .from('cuentas_usuario')
      .select(`
        id,
        personal_id,
        documento,
        usuario_login,
        email,
        email_autorizado,
        estado,
        auth_user_id,
        fecha_preautorizacion,
        fecha_registro_app,
        fecha_ultimo_acceso,
        email_confirmado,
        fecha_confirmacion_email,
        creado_por_nombre,
        actualizado_por_nombre,
        observaciones,
        perfiles_usuario (
          id,
          rol,
          menu_tipo,
          estado,
          fecha_asignacion,
          asignado_por_nombre
        )
      `)
      .eq('personal_id', id)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        {
          status: 'failed',
          message: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'success',
      cuenta: data || null,
    })
  } catch (error) {
    console.error(
      'Error GET /api/personal/[id]/cuenta:',
      error
    )

    return respuestaError(error)
  }
}

export async function PATCH(request, { params }) {
  try {
    const sesion = await sesionNotificaciones(request, ['ADMINISTRATIVO'])
    if (!sesion) return NextResponse.json({ status: 'failed', message: 'Sesión no autorizada.' }, { status: 403 })
    const nitSolicitado = new URL(request.url).searchParams.get('nit')
    if (nitSolicitado && nitSolicitado.trim() !== String(sesion.nitEmpresa).trim()) {
      return NextResponse.json({ status: 'failed', message: 'Empresa no autorizada.' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const emailAutorizado =
      normalizarEmail(body.email_autorizado)

    const estado =
      String(body.estado || '')
        .trim()
        .toLowerCase()

    const observaciones =
      body.observaciones || null

    const actualizadoPor =
      body.actualizado_por || 'ADMINISTRATIVO'

    if (!emailAutorizado) {
      return NextResponse.json(
        {
          status: 'failed',
          message: 'El correo autorizado es obligatorio.',
        },
        { status: 400 }
      )
    }

    if (!emailValido(emailAutorizado)) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            'El correo autorizado no tiene un formato válido.',
        },
        { status: 400 }
      )
    }

    if (
      ![
        'pre_autorizado',
        'activo',
        'inactivo',
        'suspendido',
      ].includes(estado)
    ) {
      return NextResponse.json(
        {
          status: 'failed',
          message: 'El estado de la cuenta no es válido.',
        },
        { status: 400 }
      )
    }

    const { supabaseAdmin: supabase } = await obtenerSupabaseAdminEmpresaPorNit(sesion.nitEmpresa)

    const { data: cuentaActual, error: cuentaError } =
      await supabase
        .from('cuentas_usuario')
        .select(
          'id, personal_id, email, email_autorizado, auth_user_id, fecha_registro_app, estado'
        )
        .eq('personal_id', id)
        .maybeSingle()

    if (cuentaError) {
      return NextResponse.json(
        {
          status: 'failed',
          message: cuentaError.message,
        },
        { status: 500 }
      )
    }

    if (!cuentaActual) {
      return NextResponse.json(
        {
          status: 'failed',
          message:
            'El personal no tiene cuenta de usuario creada.',
        },
        { status: 404 }
      )
    }

    let perfilesSolicitados = null
    if (Object.prototype.hasOwnProperty.call(body, 'perfiles')) {
      if (!Array.isArray(body.perfiles) || body.perfiles.some((rol) => typeof rol !== 'string' || !Object.prototype.hasOwnProperty.call(ROLES_PERMITIDOS, rol))) {
        return NextResponse.json({ status: 'failed', message: 'Los perfiles seleccionados no son válidos.' }, { status: 400 })
      }
      perfilesSolicitados = [...new Set(body.perfiles)]
      if (estado === 'activo' && perfilesSolicitados.length === 0) {
        return NextResponse.json({ status: 'failed', message: 'Una cuenta activa debe tener al menos un perfil autorizado.' }, { status: 400 })
      }
    }

    const registroCompletado = Boolean(cuentaActual.auth_user_id && cuentaActual.fecha_registro_app)
    if (estado === 'activo' && !registroCompletado) {
      return NextResponse.json({ status: 'failed', message: 'La cuenta no ha completado el registro. Seleccione Preautorizado.' }, { status: 400 })
    }
    if (estado === 'pre_autorizado' && registroCompletado) {
      return NextResponse.json({ status: 'failed', message: 'Una cuenta registrada no puede volver a Preautorizado.' }, { status: 400 })
    }
    if (estado === 'suspendido' && cuentaActual.estado !== 'suspendido') {
      return NextResponse.json({ status: 'failed', message: 'No se permiten nuevas suspensiones.' }, { status: 400 })
    }
    if (estado === 'pre_autorizado' && perfilesSolicitados?.length === 0) {
      return NextResponse.json({ status: 'failed', message: 'La cuenta preautorizada debe tener al menos un perfil.' }, { status: 400 })
    }

    const emailAnterior =
      normalizarEmail(cuentaActual.email_autorizado)

    const cambioCorreo =
      emailAnterior !== emailAutorizado

    if (
      cambioCorreo &&
      cuentaActual.auth_user_id
    ) {
      const { supabaseAdmin } =
        await obtenerSupabaseAdminEmpresaPorNit(sesion.nitEmpresa)

      const { error: authError } =
        await supabaseAdmin.auth.admin.updateUserById(
          cuentaActual.auth_user_id,
          {
            email: emailAutorizado,
            email_confirm: true,
          }
        )

      if (authError) {
        return NextResponse.json(
          {
            status: 'failed',
            message: authError.message,
          },
          { status: 500 }
        )
      }
    }

    const updateCuenta = {
      email_autorizado: emailAutorizado,
      email: emailAutorizado,
      estado,
      observaciones,
      actualizado_por_nombre: actualizadoPor,
      updated_at: new Date().toISOString(),
    }

    if (cambioCorreo) {
      updateCuenta.email_confirmado = true
      updateCuenta.fecha_confirmacion_email =
        new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('cuentas_usuario')
      .update(updateCuenta)
      .eq('id', cuentaActual.id)
      .select(`
        id,
        personal_id,
        documento,
        usuario_login,
        email,
        email_autorizado,
        estado,
        auth_user_id,
        fecha_preautorizacion,
        fecha_registro_app,
        fecha_ultimo_acceso,
        email_confirmado,
        fecha_confirmacion_email,
        creado_por_nombre,
        actualizado_por_nombre,
        observaciones
      `)
      .single()

    if (error) {
      return NextResponse.json(
        {
          status: 'failed',
          message: error.message,
        },
        { status: 500 }
      )
    }

    const { error: personalError } = await supabase
      .from('personal')
      .update({
        email: emailAutorizado,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (personalError) {
      console.error(
        'El correo se actualizó en cuentas_usuario pero no en personal:',
        personalError
      )
    }

    if (perfilesSolicitados !== null) {
      const { data: existentes, error: perfilesError } = await supabase
        .from('perfiles_usuario')
        .select('id, rol, estado')
        .eq('personal_id', id)
      if (perfilesError) return NextResponse.json({ status: 'failed', message: perfilesError.message }, { status: 500 })

      for (const perfil of existentes || []) {
        const estadoPerfil = perfilesSolicitados.includes(perfil.rol) ? 'activo' : 'inactivo'
        if (perfil.estado === estadoPerfil) continue
        const { error: actualizarError } = await supabase.from('perfiles_usuario').update({ estado: estadoPerfil }).eq('id', perfil.id)
        if (actualizarError) return NextResponse.json({ status: 'failed', message: actualizarError.message }, { status: 500 })
      }
      const rolesExistentes = new Set((existentes || []).map((perfil) => perfil.rol))
      const nuevos = perfilesSolicitados.filter((rol) => !rolesExistentes.has(rol)).map((rol) => ({
        cuenta_usuario_id: cuentaActual.id,
        personal_id: id,
        rol,
        menu_tipo: ROLES_PERMITIDOS[rol],
        estado: 'activo',
        asignado_por_nombre: actualizadoPor,
      }))
      if (nuevos.length) {
        const { error: insertarError } = await supabase.from('perfiles_usuario').insert(nuevos)
        if (insertarError) return NextResponse.json({ status: 'failed', message: insertarError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      status: 'success',
      message: 'Cuenta actualizada correctamente.',
      cuenta: data,
    })
  } catch (error) {
    console.error(
      'Error PATCH /api/personal/[id]/cuenta:',
      error
    )

    return respuestaError(error)
  }
}

export async function POST(request, { params }) {
  try {
    const sesion = await sesionNotificaciones(request, ['ADMINISTRATIVO'])
    if (!sesion) return NextResponse.json({ status: 'failed', message: 'Sesión no autorizada.' }, { status: 403 })
    const nitSolicitado = new URL(request.url).searchParams.get('nit')
    if (nitSolicitado && nitSolicitado.trim() !== String(sesion.nitEmpresa).trim()) {
      return NextResponse.json({ status: 'failed', message: 'Empresa no autorizada.' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { supabaseAdmin: supabase } = await obtenerSupabaseAdminEmpresaPorNit(sesion.nitEmpresa)
    const roles = [...new Set(Array.isArray(body.perfiles) ? body.perfiles : [])]
    if (!roles.length || roles.some(rol => !Object.prototype.hasOwnProperty.call(ROLES_PERMITIDOS, rol))) {
      return NextResponse.json({ status: 'failed', message: 'Seleccione al menos un perfil autorizado válido.' }, { status: 400 })
    }
    const email = normalizarEmail(body.email_autorizado)
    if (!emailValido(email)) return NextResponse.json({ status: 'failed', message: 'Indique un correo autorizado válido.' }, { status: 400 })
    const { data: persona, error: personaError } = await supabase.from('personal').select('id, documento, email, origen_registro, estado_aprobacion').eq('id', id).single()
    if (personaError || !persona) return NextResponse.json({ status: 'failed', message: 'Personal no encontrado.' }, { status: 404 })
    if (persona.origen_registro !== 'formulario_publico' || persona.estado_aprobacion !== 'aprobado') {
      return NextResponse.json({ status: 'failed', message: 'Primero deben aprobarse todas las secciones del expediente público.' }, { status: 400 })
    }
    const { data: existente, error: existenteError } = await supabase.from('cuentas_usuario').select('id').eq('personal_id', id).maybeSingle()
    if (existenteError) throw existenteError
    if (existente) return NextResponse.json({ status: 'failed', message: 'Ya existe una cuenta para este personal. Actualice sus perfiles desde esta sección.' }, { status: 409 })
    const ahora = new Date().toISOString()
    const { data: cuenta, error: cuentaError } = await supabase.from('cuentas_usuario').insert({
      personal_id: id, documento: persona.documento, usuario_login: persona.documento,
      email, email_autorizado: email, estado: 'pre_autorizado',
      fecha_preautorizacion: ahora, creado_por_nombre: body.actualizado_por || 'ADMINISTRATIVO',
      observaciones: body.observaciones || null,
    }).select('id').single()
    if (cuentaError) throw cuentaError
    const { error: perfilesError } = await supabase.from('perfiles_usuario').insert(roles.map(rol => ({
      cuenta_usuario_id: cuenta.id, personal_id: id, rol,
      menu_tipo: ROLES_PERMITIDOS[rol], estado: 'activo',
      asignado_por_nombre: body.actualizado_por || 'ADMINISTRATIVO',
    })))
    if (perfilesError) {
      await supabase.from('cuentas_usuario').delete().eq('id', cuenta.id)
      throw perfilesError
    }
    return NextResponse.json({ status: 'success', message: 'Cuenta preautorizada con perfiles asignados. La persona ya puede registrarse.' })
  } catch (error) {
    console.error('Error POST /api/personal/[id]/cuenta:', error)
    return respuestaError(error)
  }
}
