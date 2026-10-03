// app/api/mantenimientos/route.js

import { NextResponse } from 'next/server'
import {
  obtenerSupabaseAdminEmpresaDesdeRequest,
  respuestaErrorEmpresa,
} from '@/lib/supabaseEmpresaServer'

function respuestaError(error) {
  const respuesta = respuestaErrorEmpresa(error)

  return NextResponse.json(
    respuesta.body,
    { status: respuesta.status }
  )
}

function normalizarTexto(valor) {
  return String(valor || '').trim()
}

function normalizarMayusculas(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
}

// Normaliza valores usados como claves lógicas. De esta manera
// "Camión", "camion", " CAMION " y variantes equivalentes se
// comparan de forma consistente sin modificar el dato histórico.
function normalizarClave(valor) {
  return String(valor || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

function esVehiculoActivo(estado) {
  return normalizarClave(estado) === 'ACTIVO'
}

function obtenerFamiliaMantenimiento(tipoVehiculo) {
  const tipo = normalizarClave(tipoVehiculo)

  if (
    tipo === 'AUTOMOVIL' ||
    tipo === 'CAMIONETA'
  ) {
    return 'AUTOMOVIL'
  }

  if (tipo === 'MOTOCICLETA') {
    return 'MOTOCICLETA'
  }

  if (tipo === 'CAMION') {
    return 'CAMION'
  }

  return null
}

function normalizarEmail(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
}

function emailValido(email) {
  if (!email) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// =========================================================
// GET
// =========================================================

export async function GET(request) {
  try {
    const { supabaseAdmin } =
      await obtenerSupabaseAdminEmpresaDesdeRequest(request)

    const supabase = supabaseAdmin

    const { searchParams } =
      new URL(request.url)

    const recurso =
      normalizarTexto(
        searchParams.get('recurso')
      )

    // =====================================================
    // VEHÍCULOS ACTIVOS
    // =====================================================

    if (recurso === 'vehiculos') {
      const { data, error } = await supabase
        .from('vehiculos')
        .select(`
          id,
          placa,
          tipo_vehiculo,
          marca,
          estado
        `)
        .order('placa', {
          ascending: true,
        })

      if (error) {
        return NextResponse.json(
          {
            status: 'failed',
            message: error.message,
          },
          { status: 500 }
        )
      }

      // El filtro se hace después de consultar para tolerar diferencias
      // históricas de mayúsculas, minúsculas, espacios y tildes.
      const vehiculos = (data || [])
        .filter((vehiculo) =>
          esVehiculoActivo(
            vehiculo.estado
          )
        )
        .map((vehiculo) => ({
          ...vehiculo,
          familia_mantenimiento:
            obtenerFamiliaMantenimiento(
              vehiculo.tipo_vehiculo
            ),
        }))

      return NextResponse.json({
        status: 'success',
        vehiculos,
      })
    }

    // =====================================================
    // PROGRAMACIÓN PREVENTIVA PENDIENTE POR PLACA
    // =====================================================

    if (recurso === 'programacion_pendiente') {
      const placa = normalizarTexto(
        searchParams.get('placa')
      )

      if (!placa) {
        return NextResponse.json(
          { status: 'failed', message: 'La placa es obligatoria.' },
          { status: 400 }
        )
      }

      const { data: vehiculo, error: vehiculoError } = await supabase
        .from('vehiculos')
        .select('id, placa, tipo_vehiculo, marca, estado')
        .eq('placa', placa)
        .maybeSingle()

      if (vehiculoError) {
        return NextResponse.json(
          { status: 'failed', message: vehiculoError.message },
          { status: 500 }
        )
      }

      if (!vehiculo || !esVehiculoActivo(vehiculo.estado)) {
        return NextResponse.json(
          { status: 'failed', message: 'El vehículo no existe o no está activo.' },
          { status: 404 }
        )
      }

      const { data: programaciones, error: programacionError } = await supabase
        .from('programacion_mantenimiento')
        .select(`
          id, vehiculo_id, plan_mantenimiento_id, ciclo, nivel,
          km_base, km_desde, km_limite, vigencia, mes_programado,
          fecha_programada, estado, observaciones
        `)
        .eq('vehiculo_id', vehiculo.id)
        .in('estado', ['PROGRAMADO', 'VENCIDO'])
        .order('vigencia', { ascending: true })
        .order('mes_programado', { ascending: true })
        .order('id', { ascending: true })
        .limit(1)

      if (programacionError) {
        return NextResponse.json(
          { status: 'failed', message: programacionError.message },
          { status: 500 }
        )
      }

      const programacion = programaciones?.[0] || null

      if (!programacion) {
        return NextResponse.json({
          status: 'success',
          programacion: null,
          message: 'El vehículo aún no tiene un mantenimiento preventivo programado pendiente.',
        })
      }

      const { data: plan, error: planError } = await supabase
        .from('plan_mantenimiento')
        .select('id, tipo_vehiculo, familia, nivel, desde_km, hasta_km, actividad, activo')
        .eq('id', programacion.plan_mantenimiento_id)
        .maybeSingle()

      if (planError || !plan || plan.activo === false) {
        return NextResponse.json(
          {
            status: 'failed',
            message: planError?.message || 'La programación no tiene un nivel de mantenimiento activo asociado.',
          },
          { status: 500 }
        )
      }

      // Para un nivel acumulativo se muestran las actividades desde N1
      // hasta el nivel formalmente programado.
      const { data: planesFamilia, error: planesError } = await supabase
        .from('plan_mantenimiento')
        .select('id, nivel')
        .eq('familia', plan.familia)
        .eq('activo', true)
        .lte('nivel', plan.nivel)
        .order('nivel', { ascending: true })

      if (planesError) {
        return NextResponse.json(
          { status: 'failed', message: planesError.message },
          { status: 500 }
        )
      }

      const idsPlan = (planesFamilia || []).map((item) => Number(item.id))
      let actividades = []

      if (idsPlan.length > 0) {
        const { data: actividadesData, error: actividadesError } = await supabase
          .from('plan_mantenimiento_actividades')
          .select('id, plan_mantenimiento_id, actividad, orden, activo')
          .in('plan_mantenimiento_id', idsPlan)
          .eq('activo', true)
          .order('plan_mantenimiento_id', { ascending: true })
          .order('orden', { ascending: true })

        if (actividadesError) {
          return NextResponse.json(
            { status: 'failed', message: actividadesError.message },
            { status: 500 }
          )
        }

        const nivelPorPlan = new Map(
          (planesFamilia || []).map((item) => [Number(item.id), Number(item.nivel)])
        )

        actividades = (actividadesData || []).map((item) => ({
          id: item.id,
          plan_mantenimiento_id: item.plan_mantenimiento_id,
          nivel_origen: nivelPorPlan.get(Number(item.plan_mantenimiento_id)),
          actividad: item.actividad,
          orden: item.orden,
        }))
      }

      return NextResponse.json({
        status: 'success',
        programacion: {
          ...programacion,
          familia: plan.familia,
          tipo_vehiculo: plan.tipo_vehiculo,
          desde_km: plan.desde_km,
          hasta_km: plan.hasta_km,
          actividad: plan.actividad,
          actividades,
        },
      })
    }

    // =====================================================
    // PROVEEDORES ACTIVOS
    // =====================================================

    if (recurso === 'proveedores') {
      const { data, error } = await supabase
        .from('proveedores')
        .select(`
          id,
          razon_social,
          nombre_comercial,
          tipo_persona,
          nit,
          digito_verificacion,
          direccion,
          telefono,
          email,
          departamento_id,
          municipio_id,
          activo,
          observaciones
        `)
        .eq('activo', true)
        .order('razon_social', { ascending: true })

      if (error) {
        return NextResponse.json(
          { status: 'failed', message: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        status: 'success',
        proveedores: (data || []).map((item) => ({
          ...item,
          // Alias temporal para los registros históricos y componentes
          // que todavía muestran la etiqueta "empresa".
          empresa: item.razon_social,
        })),
      })
    }

    // =====================================================
    // PLAN DE MANTENIMIENTO POR FAMILIA / NIVEL
    // =====================================================

    if (recurso === 'plan') {
      const tipoVehiculo =
        normalizarTexto(
          searchParams.get('tipo_vehiculo')
        )

      const familiaParametro =
        normalizarTexto(
          searchParams.get('familia')
        )

      const familia =
        obtenerFamiliaMantenimiento(
          familiaParametro ||
            tipoVehiculo
        )

      if (!familia) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              'El tipo de vehículo no tiene una familia de mantenimiento configurada.',
          },
          { status: 400 }
        )
      }

      const {
        data: nivelesData,
        error: nivelesError,
      } = await supabase
        .from('plan_mantenimiento')
        .select(`
          id,
          tipo_vehiculo,
          actividad,
          desde_km,
          hasta_km,
          nivel,
          familia,
          activo
        `)
        .eq('familia', familia)
        .eq('activo', true)
        .order('nivel', {
          ascending: true,
        })

      if (nivelesError) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              nivelesError.message,
          },
          { status: 500 }
        )
      }

      const niveles = nivelesData || []
      const idsPlan = niveles
        .map((item) => Number(item.id))
        .filter((id) =>
          Number.isInteger(id)
        )

      let actividadesData = []

      if (idsPlan.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from(
            'plan_mantenimiento_actividades'
          )
          .select(`
            id,
            plan_mantenimiento_id,
            actividad,
            orden,
            activo
          `)
          .in(
            'plan_mantenimiento_id',
            idsPlan
          )
          .eq('activo', true)
          .order('orden', {
            ascending: true,
          })

        if (error) {
          return NextResponse.json(
            {
              status: 'failed',
              message: error.message,
            },
            { status: 500 }
          )
        }

        actividadesData = data || []
      }

      const actividadesPorPlan =
        new Map()

      for (const actividad of actividadesData) {
        const planId = Number(
          actividad.plan_mantenimiento_id
        )

        if (
          !actividadesPorPlan.has(
            planId
          )
        ) {
          actividadesPorPlan.set(
            planId,
            []
          )
        }

        actividadesPorPlan
          .get(planId)
          .push({
            id: actividad.id,
            actividad:
              actividad.actividad,
            orden:
              actividad.orden,
          })
      }

      const nivelesEstructurados = []
      const actividadesAcumuladas = []

      for (const nivel of niveles) {
        const propias =
          actividadesPorPlan.get(
            Number(nivel.id)
          ) || []

        // Los niveles son acumulativos: N3, por ejemplo, incorpora
        // las actividades configuradas para N1 + N2 + N3.
        // No se deduplican por texto porque una inspección repetida
        // puede ser una exigencia técnica válida de otro nivel.
        for (const actividad of propias) {
          actividadesAcumuladas.push({
            ...actividad,
            plan_mantenimiento_id:
              nivel.id,
            nivel_origen:
              nivel.nivel,
          })
        }

        nivelesEstructurados.push({
          id: nivel.id,
          tipo_vehiculo:
            nivel.tipo_vehiculo,
          familia:
            nivel.familia,
          nivel: nivel.nivel,
          desde_km:
            nivel.desde_km,
          hasta_km:
            nivel.hasta_km,

          // Compatibilidad temporal con la página actual.
          // No se elimina todavía el texto histórico de la tabla.
          actividad:
            nivel.actividad,

          actividades_propias:
            propias,
          actividades_acumuladas:
            actividadesAcumuladas.map(
              (actividad) => ({
                ...actividad,
              })
            ),
        })
      }

      return NextResponse.json({
        status: 'success',
        familia,
        niveles:
          nivelesEstructurados,

        // Compatibilidad con la interfaz actual, que todavía espera
        // la propiedad "actividades" con los registros del plan.
        actividades:
          nivelesEstructurados,
      })
    }

    // =====================================================
    // ACTIVIDADES HABILITADAS POR PROVEEDOR / TALLER
    // =====================================================

    if (recurso === 'actividades_proveedor') {
      const proveedorId = Number(searchParams.get('proveedor_id'))
      const tipoVehiculo = normalizarClave(searchParams.get('tipo_vehiculo'))

      if (!Number.isInteger(proveedorId) || proveedorId <= 0) {
        return NextResponse.json(
          { status: 'failed', message: 'El proveedor es obligatorio.' },
          { status: 400 }
        )
      }

      const { data: relaciones, error: relacionesError } = await supabase
        .from('proveedor_mantenimiento_actividades')
        .select('actividad_id')
        .eq('proveedor_id', proveedorId)
        .eq('activo', true)

      if (relacionesError) {
        return NextResponse.json(
          { status: 'failed', message: relacionesError.message },
          { status: 500 }
        )
      }

      const ids = [...new Set((relaciones || [])
        .map((item) => Number(item.actividad_id))
        .filter((id) => Number.isInteger(id) && id > 0))]

      if (!ids.length) {
        return NextResponse.json({ status: 'success', actividades: [] })
      }

      const { data: catalogo, error: catalogoError } = await supabase
        .from('mantenimiento_actividades_catalogo')
        .select('*')
        .in('id', ids)
        .eq('activo', true)
        .order('nombre', { ascending: true })

      if (catalogoError) {
        return NextResponse.json(
          { status: 'failed', message: catalogoError.message },
          { status: 500 }
        )
      }

      const actividades = (catalogo || []).filter((item) => {
        if (!tipoVehiculo) return true
        return normalizarClave(item.tipo_vehiculo) === tipoVehiculo
      })

      return NextResponse.json({ status: 'success', actividades })
    }

    // =====================================================
    // TÉCNICOS POR PROVEEDOR
    // =====================================================

    if (recurso === 'tecnicos') {
      const proveedorId =
        Number(
          searchParams.get('proveedor_id')
        )

      if (
        !Number.isInteger(proveedorId) ||
        proveedorId <= 0
      ) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              'El proveedor es obligatorio.',
          },
          { status: 400 }
        )
      }

      const { data, error } = await supabase
        .from('tecnicos')
        .select(`
          id,
          proveedor_id,
          nombres,
          documento,
          telefono,
          email,
          activo,
          observaciones
        `)
        .eq(
          'proveedor_id',
          proveedorId
        )
        .eq('activo', true)
        .order('nombres', {
          ascending: true,
        })

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
        tecnicos: data || [],
      })
    }

    // =====================================================
    // VALIDAR DOCUMENTO TÉCNICO
    // =====================================================

    if (recurso === 'validar_tecnico') {
      const proveedorId =
        Number(
          searchParams.get('proveedor_id')
        )

      const documento =
        normalizarTexto(
          searchParams.get('documento')
        )

      if (
        !Number.isInteger(proveedorId) ||
        proveedorId <= 0 ||
        !documento
      ) {
        return NextResponse.json({
          status: 'success',
          existe: false,
          tecnico: null,
        })
      }

      const { data, error } = await supabase
        .from('tecnicos')
        .select(`
          id,
          nombres,
          documento
        `)
        .eq(
          'proveedor_id',
          proveedorId
        )
        .eq(
          'documento',
          documento
        )
        .limit(1)

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
        existe:
          Boolean(data?.length),
        tecnico:
          data?.length
            ? data[0]
            : null,
      })
    }

    return NextResponse.json(
      {
        status: 'failed',
        message: 'Recurso no válido.',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error(
      'Error GET /api/mantenimientos:',
      error
    )

    return respuestaError(error)
  }
}

// =========================================================
// POST
// =========================================================

export async function POST(request) {
  try {
    const body = await request.json()

    const { supabaseAdmin } =
        await obtenerSupabaseAdminEmpresaDesdeRequest(
            request,
            body
        )

    const supabase = supabaseAdmin

    const accion =
      normalizarTexto(body.accion)

    // En mantenimiento correctivo el instructor puede registrar un proveedor
    // básico cuando el taller aún no existe. Se crea SIN actividades asociadas.
    // La configuración/edición completa queda disponible en Administración.
    if (accion === 'crear_proveedor_correctivo') {
      const tipoPersona = normalizarMayusculas(body.tipo_persona) || 'JURIDICA'
      const razonSocial = normalizarMayusculas(body.razon_social)
      const nombreComercial = normalizarMayusculas(body.nombre_comercial)
      const nitProveedor = String(body.nit_proveedor || '').replace(/\D/g, '')
      const digitoVerificacion = String(body.digito_verificacion || '').replace(/\D/g, '').slice(0, 1)
      const direccion = normalizarMayusculas(body.direccion)
      const telefono = String(body.telefono || '').replace(/\D/g, '')
      const email = normalizarEmail(body.email)

      if (!['NATURAL', 'JURIDICA'].includes(tipoPersona)) {
        return NextResponse.json({ status: 'failed', message: 'El tipo de persona no es válido.' }, { status: 400 })
      }
      if (!razonSocial) {
        return NextResponse.json({ status: 'failed', message: 'La razón social o nombre del proveedor es obligatoria.' }, { status: 400 })
      }
      if (!/^\d+$/.test(nitProveedor)) {
        return NextResponse.json({ status: 'failed', message: 'El NIT o documento debe contener únicamente números.' }, { status: 400 })
      }
      if (digitoVerificacion && !/^\d$/.test(digitoVerificacion)) {
        return NextResponse.json({ status: 'failed', message: 'El DV (dígito de verificación) debe ser un solo número.' }, { status: 400 })
      }
      if (!direccion) {
        return NextResponse.json({ status: 'failed', message: 'La dirección es obligatoria.' }, { status: 400 })
      }
      if (!/^\d{7,10}$/.test(telefono)) {
        return NextResponse.json({ status: 'failed', message: 'El teléfono debe contener entre 7 y 10 números.' }, { status: 400 })
      }
      if (email && !emailValido(email)) {
        return NextResponse.json({ status: 'failed', message: 'El correo electrónico no es válido.' }, { status: 400 })
      }

      const { data: existente, error: existenteError } = await supabase
        .from('proveedores')
        .select('id, razon_social, nombre_comercial, nit, activo')
        .eq('nit', nitProveedor)
        .limit(1)

      if (existenteError) {
        return NextResponse.json({ status: 'failed', message: existenteError.message }, { status: 500 })
      }
      if (existente?.length) {
        return NextResponse.json(
          {
            status: 'failed',
            message: `Ya existe un proveedor con este NIT/documento: ${existente[0].razon_social}.`,
            proveedor: existente[0],
          },
          { status: 409 }
        )
      }

      const { data: proveedor, error: proveedorError } = await supabase
        .from('proveedores')
        .insert({
          tipo_persona: tipoPersona,
          razon_social: razonSocial,
          nombre_comercial: nombreComercial || null,
          nit: nitProveedor,
          digito_verificacion: digitoVerificacion || null,
          direccion,
          telefono,
          email: email || null,
          activo: true,
          observaciones: 'REGISTRADO DESDE MANTENIMIENTO CORRECTIVO - PENDIENTE DE REVISIÓN ADMINISTRATIVA',
          updated_at: new Date().toISOString(),
        })
        .select(`
          id, razon_social, nombre_comercial, tipo_persona, nit,
          digito_verificacion, direccion, telefono, email,
          departamento_id, municipio_id, activo, observaciones
        `)
        .single()

      if (proveedorError) {
        return NextResponse.json({ status: 'failed', message: proveedorError.message }, { status: 500 })
      }

      return NextResponse.json({
        status: 'success',
        proveedor: { ...proveedor, empresa: proveedor.razon_social },
        message: 'Proveedor registrado para mantenimiento correctivo. Administración podrá completar su configuración posteriormente.',
      })
    }

    // El instructor puede registrar un técnico únicamente dentro de un proveedor existente.
    if (accion === 'crear_tecnico') {
      const proveedorId = Number(body.proveedor_id)
      const nombres = normalizarMayusculas(body.nombres)
      const documento = String(body.documento || '').replace(/\D/g, '')
      const telefono = String(body.telefono || '').replace(/\D/g, '')
      const email = normalizarEmail(body.email)
      const observaciones = normalizarMayusculas(body.observaciones)

      if (!Number.isInteger(proveedorId) || proveedorId <= 0) {
        return NextResponse.json({ status: 'failed', message: 'Debe seleccionar un proveedor o taller válido.' }, { status: 400 })
      }

      if (!nombres) {
        return NextResponse.json({ status: 'failed', message: 'Los nombres del técnico son obligatorios.' }, { status: 400 })
      }

      if (!/^\d{5,12}$/.test(documento)) {
        return NextResponse.json({ status: 'failed', message: 'El documento debe contener entre 5 y 12 números.' }, { status: 400 })
      }

      if (/^3\d{9}$/.test(documento)) {
        return NextResponse.json({ status: 'failed', message: 'El documento ingresado tiene estructura de número celular. Verifique que no haya intercambiado el documento y el celular.' }, { status: 400 })
      }

      if (!/^3\d{9}$/.test(telefono)) {
        return NextResponse.json({ status: 'failed', message: 'El celular debe contener exactamente 10 dígitos y comenzar por 3.' }, { status: 400 })
      }

      if (documento === telefono) {
        return NextResponse.json({ status: 'failed', message: 'El documento y el celular no pueden ser iguales.' }, { status: 400 })
      }

      if (email && !emailValido(email)) {
        return NextResponse.json({ status: 'failed', message: 'El correo electrónico no es válido.' }, { status: 400 })
      }

      const { data: proveedor, error: proveedorError } = await supabase
        .from('proveedores')
        .select('id, activo')
        .eq('id', proveedorId)
        .maybeSingle()

      if (proveedorError) {
        return NextResponse.json({ status: 'failed', message: proveedorError.message }, { status: 500 })
      }

      if (!proveedor || proveedor.activo === false) {
        return NextResponse.json({ status: 'failed', message: 'El proveedor seleccionado no existe o está inactivo.' }, { status: 400 })
      }

      const { data: existente, error: existenteError } = await supabase
        .from('tecnicos')
        .select('id, proveedor_id, nombres, documento, telefono, email, activo, observaciones')
        .eq('proveedor_id', proveedorId)
        .eq('documento', documento)
        .limit(1)

      if (existenteError) {
        return NextResponse.json({ status: 'failed', message: existenteError.message }, { status: 500 })
      }

      if (existente?.length) {
        return NextResponse.json({ status: 'failed', message: 'Ya existe un técnico con este documento para el proveedor seleccionado.' }, { status: 409 })
      }

      const { data: tecnico, error: tecnicoError } = await supabase
        .from('tecnicos')
        .insert({
          proveedor_id: proveedorId,
          nombres,
          documento,
          telefono,
          email: email || null,
          activo: true,
          observaciones: observaciones || null,
          updated_at: new Date().toISOString(),
        })
        .select('id, proveedor_id, nombres, documento, telefono, email, activo, observaciones')
        .single()

      if (tecnicoError) {
        return NextResponse.json({ status: 'failed', message: tecnicoError.message }, { status: 500 })
      }

      return NextResponse.json({ status: 'success', tecnico })
    }

    // =====================================================
    // REGISTRAR MANTENIMIENTO
    // =====================================================

    if (accion === 'registrar') {
      const placa =
        normalizarTexto(
          body.placa
        )

      const kilometraje =
        Number(
          body.kilometraje
        )

      const tipoMantenimiento =
        normalizarMayusculas(
          body.tipo_mantenimiento
        )

      const actividad =
        normalizarTexto(
          body.actividad_realizada
        )

      const actividadCatalogoId =
        body.actividad_catalogo_id
          ? Number(body.actividad_catalogo_id)
          : null

      const proveedorId =
        body.proveedor_id
          ? Number(body.proveedor_id)
          : null

      const tecnicoId =
        body.tecnico_id
          ? Number(body.tecnico_id)
          : null

      const programacionMantenimientoId =
        body.programacion_mantenimiento_id
          ? Number(body.programacion_mantenimiento_id)
          : null

      const planMantenimientoId =
        body.plan_mantenimiento_id
          ? Number(body.plan_mantenimiento_id)
          : null

      const nivelMantenimiento =
        body.nivel_mantenimiento
          ? Number(body.nivel_mantenimiento)
          : null

      if (!placa) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              'La placa es obligatoria.',
          },
          { status: 400 }
        )
      }

      if (
        !Number.isFinite(kilometraje) ||
        kilometraje < 0
      ) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              'El kilometraje no es válido.',
          },
          { status: 400 }
        )
      }

      if (
        ![
          'PREVENTIVO',
          'CORRECTIVO',
        ].includes(
          tipoMantenimiento
        )
      ) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              'El tipo de mantenimiento no es válido.',
          },
          { status: 400 }
        )
      }

      if (!actividad) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              'La actividad realizada es obligatoria.',
          },
          { status: 400 }
        )
      }

      const repuestosUtilizados = normalizarTexto(body.repuestos_utilizados)
      const tiempoParadaHoras =
        body.tiempoparada !== null &&
        body.tiempoparada !== undefined &&
        body.tiempoparada !== ''
          ? Number(body.tiempoparada)
          : null
      const tiemposPermitidos = new Set([0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 12, 24, 48, 72])

      if (!repuestosUtilizados) {
        return NextResponse.json(
          { status: 'failed', message: 'Los repuestos utilizados son obligatorios. Si no se utilizaron repuestos, registre NO APLICA.' },
          { status: 400 }
        )
      }

      if (tiempoParadaHoras !== null && !tiemposPermitidos.has(tiempoParadaHoras)) {
        return NextResponse.json(
          { status: 'failed', message: 'El tiempo de parada aproximado debe seleccionarse de la lista de horas permitidas.' },
          { status: 400 }
        )
      }

      if (!Number.isInteger(proveedorId) || proveedorId <= 0) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              'Debe seleccionar un proveedor o taller registrado.',
          },
          { status: 400 }
        )
      }


      // ===================================================
      // VALIDAR PUNTO PREVENTIVO DEL NUEVO PLAN
      // ===================================================

      let programacionPreventiva = null
      let actividadesRequeridas = []
      let actividadesSeleccionadas = []

      if (tipoMantenimiento === 'PREVENTIVO') {
        const vehiculoId = Number(body.vehiculo_id)
        const ciclo = Number(body.ciclo)
        const kmObjetivo = Number(body.km_objetivo)
        const idsSeleccionados = Array.isArray(body.actividades_config_ids)
          ? [...new Set(body.actividades_config_ids.map(Number).filter(Number.isInteger))]
          : []

        if (!Number.isInteger(vehiculoId) || vehiculoId <= 0 || !Number.isInteger(ciclo) || ciclo <= 0) {
          return NextResponse.json(
            { status: 'failed', message: 'El punto preventivo seleccionado no es válido.' },
            { status: 400 }
          )
        }

        if (!Number.isFinite(kmObjetivo) || kmObjetivo < 0) {
          return NextResponse.json(
            { status: 'failed', message: 'El kilometraje objetivo del punto no es válido.' },
            { status: 400 }
          )
        }

        if (!idsSeleccionados.length) {
          return NextResponse.json(
            { status: 'failed', message: 'Seleccione al menos una actividad realmente ejecutada.' },
            { status: 400 }
          )
        }

        const { data: vehiculoProgramado, error: vehiculoProgramadoError } = await supabase
          .from('vehiculos')
          .select('id, placa, estado')
          .eq('id', vehiculoId)
          .eq('placa', placa)
          .maybeSingle()

        if (vehiculoProgramadoError || !vehiculoProgramado || !esVehiculoActivo(vehiculoProgramado.estado)) {
          return NextResponse.json(
            { status: 'failed', message: vehiculoProgramadoError?.message || 'El vehículo no existe o no está activo.' },
            { status: 400 }
          )
        }

        const { data: configs, error: configsError } = await supabase
          .from('vehiculo_mantenimiento_config')
          .select('id, actividad_id, frecuencia_km, tolerancia_km, activo')
          .eq('vehiculo_id', vehiculoId)

        if (configsError) {
          return NextResponse.json({ status: 'failed', message: configsError.message }, { status: 500 })
        }

        const activas = (configs || []).filter((x) => x.activo !== false && Number(x.frecuencia_km) > 0)
        if (!activas.length) {
          return NextResponse.json({ status: 'failed', message: 'El vehículo no tiene configuración de mantenimiento activa.' }, { status: 409 })
        }

        const { data: catalogo, error: catalogoError } = await supabase
          .from('mantenimiento_actividades_catalogo')
          .select('id, nombre, activo')
          .eq('activo', true)

        if (catalogoError) {
          return NextResponse.json({ status: 'failed', message: catalogoError.message }, { status: 500 })
        }

        const catalogoPorId = new Map((catalogo || []).map((x) => [Number(x.id), x]))
        const normalizar = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase()
        const configBase = activas.find((cfg) => {
          const nombre = normalizar(catalogoPorId.get(Number(cfg.actividad_id))?.nombre)
          return nombre === 'ACEITE DE MOTOR Y FILTRO DE ACEITE' || nombre === 'ACEITE DE MOTOR' || nombre.includes('CAMBIO DE ACEITE')
        })
        const frecuenciaBase = Number(configBase?.frecuencia_km)

        if (!Number.isFinite(frecuenciaBase) || frecuenciaBase <= 0) {
          return NextResponse.json({ status: 'failed', message: 'No se encontró la frecuencia base del vehículo.' }, { status: 409 })
        }

        const kmCiclo = frecuenciaBase * ciclo
        actividadesRequeridas = activas.filter((cfg) => {
          const f = Number(cfg.frecuencia_km)
          return Number.isFinite(f) && f >= frecuenciaBase && f % frecuenciaBase === 0 && kmCiclo % f === 0
        })

        const toleranciasPunto = actividadesRequeridas
          .map((cfg) => {
            const valor = Number(cfg.tolerancia_km)
            return Number.isFinite(valor) && valor >= 0
              ? valor
              : 500
          })

        const toleranciaPunto = toleranciasPunto.length
          ? Math.min(...toleranciasPunto)
          : 500

        const kmMinimoPermitido = kmObjetivo - toleranciaPunto
        const kmMaximoPermitido = kmObjetivo + toleranciaPunto
        const kmRegistro = Number(kilometraje)

        if (
          !Number.isFinite(kmRegistro) ||
          kmRegistro < kmMinimoPermitido ||
          kmRegistro > kmMaximoPermitido
        ) {
          return NextResponse.json(
            {
              status: 'failed',
              code: 'FUERA_TOLERANCIA_PREVENTIVO',
              message:
                `El mantenimiento preventivo P${ciclo} solo puede acreditarse entre ` +
                `${kmMinimoPermitido.toLocaleString('es-CO')} km y ` +
                `${kmMaximoPermitido.toLocaleString('es-CO')} km. ` +
                `Kilometraje registrado: ${kmRegistro.toLocaleString('es-CO')} km.`,
            },
            { status: 409 }
          )
        }

        const requeridasIds = new Set(actividadesRequeridas.map((x) => Number(x.id)))
        actividadesSeleccionadas = activas.filter((x) => idsSeleccionados.includes(Number(x.id)) && requeridasIds.has(Number(x.id)))

        if (actividadesSeleccionadas.length !== idsSeleccionados.length) {
          return NextResponse.json({ status: 'failed', message: 'Una o más actividades seleccionadas no corresponden al punto preventivo.' }, { status: 409 })
        }

        const { data: existente, error: existenteError } = await supabase
          .from('programacion_mantenimiento')
          .select('*')
          .eq('vehiculo_id', vehiculoId)
          .eq('ciclo', ciclo)
          .maybeSingle()

        if (existenteError) {
          return NextResponse.json({ status: 'failed', message: existenteError.message }, { status: 500 })
        }

        if (existente && String(existente.estado || '').toUpperCase() === 'EJECUTADO') {
          return NextResponse.json({ status: 'failed', message: 'Este punto preventivo ya se encuentra completamente ejecutado.' }, { status: 409 })
        }

        if (existente) {
          programacionPreventiva = existente
        } else {
          const estadoInicial = 'PROGRAMADO'
          const fecha = body.fecha_registro || null
          const { data: creada, error: crearError } = await supabase
            .from('programacion_mantenimiento')
            .insert({
              vehiculo_id: vehiculoId,
              ciclo,
              km_limite: kmObjetivo,
              estado: estadoInicial,
              vigencia: fecha ? Number(String(fecha).slice(0, 4)) : null,
              mes_programado: fecha ? Number(String(fecha).slice(5, 7)) : null,
              observaciones: `P${ciclo} materializado al registrar mantenimiento preventivo.`,
            })
            .select()
            .single()

          if (crearError) {
            return NextResponse.json({ status: 'failed', message: `No se pudo materializar P${ciclo}: ${crearError.message}` }, { status: 500 })
          }
          programacionPreventiva = creada
        }
      }

      // ===================================================
      // OBTENER PROVEEDOR Y VALIDAR ACTIVIDADES HABILITADAS
      // ===================================================

      const { data: proveedor, error: proveedorError } = await supabase
        .from('proveedores')
        .select(`
          id,
          razon_social,
          nombre_comercial,
          nit,
          direccion,
          telefono,
          email,
          activo
        `)
        .eq('id', proveedorId)
        .maybeSingle()

      if (proveedorError) {
        return NextResponse.json(
          { status: 'failed', message: proveedorError.message },
          { status: 500 }
        )
      }

      if (!proveedor || proveedor.activo === false) {
        return NextResponse.json(
          {
            status: 'failed',
            message: 'El proveedor seleccionado no existe o está inactivo.',
          },
          { status: 400 }
        )
      }

      const { data: relacionesProveedor, error: relacionesProveedorError } = await supabase
        .from('proveedor_mantenimiento_actividades')
        .select('actividad_id')
        .eq('proveedor_id', proveedorId)
        .eq('activo', true)

      if (relacionesProveedorError) {
        return NextResponse.json(
          { status: 'failed', message: relacionesProveedorError.message },
          { status: 500 }
        )
      }

      const actividadesProveedorIds = new Set(
        (relacionesProveedor || []).map((item) => Number(item.actividad_id))
      )

      if (
        tipoMantenimiento === 'PREVENTIVO' &&
        !actividadesProveedorIds.size
      ) {
        return NextResponse.json(
          {
            status: 'failed',
            message: 'El proveedor seleccionado no tiene actividades de mantenimiento configuradas para preventivo. Solicite a Administración completar su configuración.',
          },
          { status: 409 }
        )
      }

      if (tipoMantenimiento === 'PREVENTIVO') {
        const noHabilitadas = actividadesSeleccionadas.filter(
          (cfg) => !actividadesProveedorIds.has(Number(cfg.actividad_id))
        )

        if (noHabilitadas.length) {
          return NextResponse.json(
            {
              status: 'failed',
              message: 'Una o más actividades seleccionadas no están habilitadas para el proveedor o taller escogido.',
            },
            { status: 409 }
          )
        }
      }

      // ===================================================
      // OBTENER TÉCNICO
      // ===================================================

      let tecnico = null

      if (tecnicoId) {
        const {
          data,
          error,
        } = await supabase
          .from('tecnicos')
          .select(`
            id,
            proveedor_id,
            nombres,
            documento,
            telefono,
            email,
            activo
          `)
          .eq(
            'id',
            tecnicoId
          )
          .maybeSingle()

        if (error) {
          return NextResponse.json(
            {
              status: 'failed',
              message:
                error.message,
            },
            { status: 500 }
          )
        }

        if (
          !data ||
          data.activo === false
        ) {
          return NextResponse.json(
            {
              status: 'failed',
              message:
                'El técnico seleccionado no existe o está inactivo.',
            },
            { status: 400 }
          )
        }

        if (
          proveedor &&
          Number(data.proveedor_id) !==
            Number(proveedor.id)
        ) {
          return NextResponse.json(
            {
              status: 'failed',
              message:
                'El técnico seleccionado no pertenece al proveedor.',
            },
            { status: 400 }
          )
        }

        tecnico = data
      }

      // ===================================================
      // COSTOS
      // ===================================================

      const valorRepuestos =
        body.valor_repuestos !== null &&
        body.valor_repuestos !== undefined &&
        body.valor_repuestos !== ''
          ? Number(
              body.valor_repuestos
            )
          : null

      const valorManoObra =
        body.valor_mano_obra !== null &&
        body.valor_mano_obra !== undefined &&
        body.valor_mano_obra !== ''
          ? Number(
              body.valor_mano_obra
            )
          : null

      const costoTotal =
        body.costo_total !== null &&
        body.costo_total !== undefined &&
        body.costo_total !== ''
          ? Number(
              body.costo_total
            )
          : null

      const payload = {
        timestamp_registro:
          body.timestamp_registro ||
          null,

        fecha_registro:
          body.fecha_registro ||
          null,

        placa,

        kilometraje,

        tipo_mantenimiento:
          tipoMantenimiento,

        actividad_realizada:
          actividad,

        plan_mantenimiento_id: null,

        programacion_mantenimiento_id:
          tipoMantenimiento === 'PREVENTIVO'
            ? programacionPreventiva?.id || null
            : null,

        nivel_mantenimiento: null,

        repuestos_utilizados:
          repuestosUtilizados,

        // IDs de catálogo
        proveedor_id:
          proveedor?.id ||
          null,

        tecnico_id:
          tecnico?.id ||
          null,

        // Fotografía histórica del proveedor
        empresa:
          proveedor?.razon_social ||
          null,

        nit:
          proveedor?.nit ||
          null,

        direccion:
          proveedor?.direccion ||
          null,

        telefono_empresa:
          proveedor?.telefono ||
          null,

        // Fotografía histórica del técnico
        nombres_tecnico:
          tecnico?.nombres ||
          null,

        telefono_tecnico:
          tecnico?.telefono ||
          null,

        documento_tecnico:
          tecnico?.documento ||
          null,

        // Los registros nuevos usan horas como única unidad.
        tiempoparada:
          tiempoParadaHoras !== null
            ? String(tiempoParadaHoras)
            : null,

        factura:
          normalizarTexto(
            body.factura
          ) || null,

        valor_repuestos:
          Number.isFinite(
            valorRepuestos
          )
            ? valorRepuestos
            : null,

        valor_mano_obra:
          Number.isFinite(
            valorManoObra
          )
            ? valorManoObra
            : null,

        costo_total:
          Number.isFinite(
            costoTotal
          )
            ? costoTotal
            : null,

        responsable:
          normalizarTexto(
            body.responsable
          ) || null,

        documento_responsable:
          normalizarTexto(
            body.documento_responsable
          ) || null,

        cargo:
          normalizarTexto(
            body.cargo
          ) || null,

        observaciones:
          normalizarTexto(
            body.observaciones
          ) || null,
      }

      const {
        data,
        error,
      } = await supabase
        .from('mantenimientos')
        .insert(payload)
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              `No se pudo registrar el mantenimiento: ${error.message}`,
          },
          { status: 500 }
        )
      }

      if (tipoMantenimiento === 'PREVENTIVO' && programacionPreventiva) {
        const filasActividades = actividadesSeleccionadas.map((cfg) => ({
          mantenimiento_id: data.id,
          vehiculo_mantenimiento_config_id: cfg.id,
          fecha_ejecucion: payload.fecha_registro,
          km_ejecucion: kilometraje,
        }))

        if (filasActividades.length) {
          const { error: actividadesError } = await supabase
            .from('mantenimiento_actividades_ejecutadas')
            .insert(filasActividades)

          if (actividadesError) {
            return NextResponse.json(
              {
                status: 'failed',
                code: 'MANTENIMIENTO_GUARDADO_ACTIVIDADES_NO_ACREDITADAS',
                message: `El mantenimiento fue guardado, pero no se pudieron acreditar sus actividades: ${actividadesError.message}`,
                mantenimiento: data,
              },
              { status: 500 }
            )
          }
        }

        const { data: mantenimientosPunto, error: mpError } = await supabase
          .from('mantenimientos')
          .select('id')
          .eq('programacion_mantenimiento_id', programacionPreventiva.id)

        if (mpError) {
          return NextResponse.json({ status: 'failed', message: mpError.message }, { status: 500 })
        }

        const idsMantenimientos = (mantenimientosPunto || []).map((x) => Number(x.id)).filter(Boolean)
        let ejecutadas = []

        if (idsMantenimientos.length) {
          const { data: ejecData, error: ejecError } = await supabase
            .from('mantenimiento_actividades_ejecutadas')
            .select('vehiculo_mantenimiento_config_id, mantenimiento_id')
            .in('mantenimiento_id', idsMantenimientos)

          if (ejecError) {
            return NextResponse.json({ status: 'failed', message: ejecError.message }, { status: 500 })
          }
          ejecutadas = ejecData || []
        }

        const ejecutadasIds = new Set(ejecutadas.map((x) => Number(x.vehiculo_mantenimiento_config_id)))
        const completo = actividadesRequeridas.length > 0 && actividadesRequeridas.every((cfg) => ejecutadasIds.has(Number(cfg.id)))

        if (completo) {
          const { error: actualizarProgramacionError } = await supabase
            .from('programacion_mantenimiento')
            .update({
              estado: 'EJECUTADO',
              mantenimiento_id: data.id,
              fecha_ejecucion: payload.fecha_registro,
              km_ejecucion: kilometraje,
              updated_at: new Date().toISOString(),
            })
            .eq('id', programacionPreventiva.id)

          if (actualizarProgramacionError) {
            return NextResponse.json({ status: 'failed', message: `El mantenimiento fue guardado, pero no se pudo cerrar P${programacionPreventiva.ciclo}: ${actualizarProgramacionError.message}` }, { status: 500 })
          }
        }
      }

      return NextResponse.json(
        {
          status: 'success',
          message:
            tipoMantenimiento === 'PREVENTIVO' ? 'Mantenimiento preventivo registrado. El punto se cerrará automáticamente cuando estén acreditadas todas sus actividades.' : 'Mantenimiento registrado correctamente.',
          mantenimiento: data,
        },
        { status: 201 }
      )
    }

    return NextResponse.json(
      {
        status: 'failed',
        message:
          'Acción no válida.',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error(
      'Error POST /api/mantenimientos:',
      error
    )

    return respuestaError(error)
  }
}