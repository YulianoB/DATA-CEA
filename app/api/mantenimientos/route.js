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
    // PROVEEDORES
    // =====================================================

    if (recurso === 'proveedores') {
      const { data, error } = await supabase
        .from('proveedores')
        .select(`
          id,
          empresa,
          nit,
          direccion,
          telefono,
          email,
          activo,
          observaciones
        `)
        .eq('activo', true)
        .order('empresa', {
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
        proveedores: data || [],
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
    // VALIDAR NIT PROVEEDOR
    // =====================================================

    if (recurso === 'validar_nit') {
      const nitProveedor =
        normalizarTexto(
          searchParams.get('nit_proveedor')
        )

      if (!nitProveedor) {
        return NextResponse.json({
          status: 'success',
          existe: false,
          proveedor: null,
        })
      }

      const { data, error } = await supabase
        .from('proveedores')
        .select(`
          id,
          empresa,
          nit
        `)
        .eq('nit', nitProveedor)
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
        proveedor:
          data?.length
            ? data[0]
            : null,
      })
    }

    // =====================================================
    // VALIDAR EMPRESA PROVEEDOR
    // =====================================================

    if (recurso === 'validar_empresa') {
      const empresa =
        normalizarMayusculas(
          searchParams.get('empresa')
        )

      if (!empresa) {
        return NextResponse.json({
          status: 'success',
          existe: false,
          proveedor: null,
        })
      }

      const { data, error } = await supabase
        .from('proveedores')
        .select(`
          id,
          empresa,
          nit,
          direccion,
          telefono,
          email,
          activo
        `)
        .eq('empresa', empresa)
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
        proveedor:
          data?.length
            ? data[0]
            : null,
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

    // =====================================================
    // CREAR PROVEEDOR
    // =====================================================

    if (accion === 'crear_proveedor') {
      const empresa =
        normalizarMayusculas(
          body.empresa
        )

      const nitProveedor =
        normalizarTexto(
          body.nit_proveedor
        )

      const direccion =
        normalizarMayusculas(
          body.direccion
        )

      const telefono =
        normalizarTexto(
          body.telefono
        )

      const email =
        normalizarEmail(
          body.email
        )

      if (!empresa) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              'La empresa es obligatoria.',
          },
          { status: 400 }
        )
      }

      if (
        email &&
        !emailValido(email)
      ) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              'El correo del proveedor no es válido.',
          },
          { status: 400 }
        )
      }

      // ---------------------------------
      // Empresa duplicada
      // ---------------------------------

      const {
        data: empresaExistente,
        error: empresaError,
      } = await supabase
        .from('proveedores')
        .select(`
          id,
          empresa,
          nit,
          direccion,
          telefono,
          email,
          activo
        `)
        .eq('empresa', empresa)
        .limit(1)

      if (empresaError) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              empresaError.message,
          },
          { status: 500 }
        )
      }

      if (empresaExistente?.length) {
        return NextResponse.json({
          status: 'success',
          existente: true,
          message:
            'El proveedor ya estaba registrado.',
          proveedor:
            empresaExistente[0],
        })
      }

      // ---------------------------------
      // NIT duplicado
      // ---------------------------------

      if (nitProveedor) {
        const {
          data: nitExistente,
          error: nitError,
        } = await supabase
          .from('proveedores')
          .select(`
            id,
            empresa,
            nit
          `)
          .eq(
            'nit',
            nitProveedor
          )
          .limit(1)

        if (nitError) {
          return NextResponse.json(
            {
              status: 'failed',
              message:
                nitError.message,
            },
            { status: 500 }
          )
        }

        if (nitExistente?.length) {
          return NextResponse.json(
            {
              status: 'warning',
              message:
                `El NIT ya está registrado para ${nitExistente[0].empresa}.`,
              proveedor:
                nitExistente[0],
            },
            { status: 409 }
          )
        }
      }

      const {
        data,
        error,
      } = await supabase
        .from('proveedores')
        .insert({
          empresa,

          nit:
            nitProveedor ||
            null,

          direccion:
            direccion ||
            null,

          telefono:
            telefono ||
            null,

          email:
            email ||
            null,

          activo: true,
        })
        .select(`
          id,
          empresa,
          nit,
          direccion,
          telefono,
          email,
          activo
        `)
        .single()

      if (error) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              `No se pudo crear el proveedor: ${error.message}`,
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          status: 'success',
          existente: false,
          message:
            'Proveedor creado correctamente.',
          proveedor: data,
        },
        { status: 201 }
      )
    }

    // =====================================================
    // CREAR TÉCNICO
    // =====================================================

    if (accion === 'crear_tecnico') {
      const proveedorId =
        Number(
          body.proveedor_id
        )

      const nombres =
        normalizarMayusculas(
          body.nombres
        )

      const documento =
        normalizarTexto(
          body.documento
        )

      const telefono =
        normalizarTexto(
          body.telefono
        )

      const email =
        normalizarEmail(
          body.email
        )

      if (
        !Number.isInteger(proveedorId) ||
        proveedorId <= 0
      ) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              'Debe seleccionar un proveedor.',
          },
          { status: 400 }
        )
      }

      if (!nombres) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              'El nombre del técnico es obligatorio.',
          },
          { status: 400 }
        )
      }

      if (!documento) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              'El documento del técnico es obligatorio.',
          },
          { status: 400 }
        )
      }

      if (
        email &&
        !emailValido(email)
      ) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              'El correo del técnico no es válido.',
          },
          { status: 400 }
        )
      }

      // Verificar que proveedor existe y está activo

      const {
        data: proveedor,
        error: proveedorError,
      } = await supabase
        .from('proveedores')
        .select(`
          id,
          empresa,
          activo
        `)
        .eq(
          'id',
          proveedorId
        )
        .maybeSingle()

      if (proveedorError) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              proveedorError.message,
          },
          { status: 500 }
        )
      }

      if (
        !proveedor ||
        proveedor.activo === false
      ) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              'El proveedor no existe o está inactivo.',
          },
          { status: 404 }
        )
      }

      // Documento duplicado dentro del proveedor

      const {
        data: tecnicoExistente,
        error: tecnicoExistenteError,
      } = await supabase
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

      if (tecnicoExistenteError) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              tecnicoExistenteError.message,
          },
          { status: 500 }
        )
      }

      if (tecnicoExistente?.length) {
        return NextResponse.json(
          {
            status: 'warning',
            message:
              'Ese documento ya está registrado para este proveedor.',
            tecnico:
              tecnicoExistente[0],
          },
          { status: 409 }
        )
      }

      const {
        data,
        error,
      } = await supabase
        .from('tecnicos')
        .insert({
          proveedor_id:
            proveedorId,

          nombres,

          documento,

          telefono:
            telefono ||
            null,

          email:
            email ||
            null,

          activo: true,
        })
        .select(`
          id,
          proveedor_id,
          nombres,
          documento,
          telefono,
          email,
          activo
        `)
        .single()

      if (error) {
        return NextResponse.json(
          {
            status: 'failed',
            message:
              `No se pudo crear el técnico: ${error.message}`,
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          status: 'success',
          message:
            'Técnico creado correctamente.',
          tecnico: data,
        },
        { status: 201 }
      )
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

      // ===================================================
      // VALIDAR PROGRAMACIÓN PREVENTIVA
      // ===================================================

      let programacionPreventiva = null

      if (tipoMantenimiento === 'PREVENTIVO') {
        if (!programacionMantenimientoId || !planMantenimientoId || !nivelMantenimiento) {
          return NextResponse.json(
            {
              status: 'failed',
              message: 'El mantenimiento preventivo debe estar asociado a una programación vigente.',
            },
            { status: 400 }
          )
        }

        const { data: vehiculoProgramado, error: vehiculoProgramadoError } = await supabase
          .from('vehiculos')
          .select('id, placa, estado')
          .eq('placa', placa)
          .maybeSingle()

        if (vehiculoProgramadoError || !vehiculoProgramado) {
          return NextResponse.json(
            { status: 'failed', message: vehiculoProgramadoError?.message || 'No se encontró el vehículo.' },
            { status: 400 }
          )
        }

        const { data: programacionData, error: programacionDataError } = await supabase
          .from('programacion_mantenimiento')
          .select('id, vehiculo_id, plan_mantenimiento_id, nivel, vigencia, mes_programado, fecha_programada, estado')
          .eq('id', programacionMantenimientoId)
          .maybeSingle()

        if (programacionDataError) {
          return NextResponse.json(
            { status: 'failed', message: programacionDataError.message },
            { status: 500 }
          )
        }

        if (
          !programacionData ||
          Number(programacionData.vehiculo_id) !== Number(vehiculoProgramado.id) ||
          Number(programacionData.plan_mantenimiento_id) !== Number(planMantenimientoId) ||
          Number(programacionData.nivel) !== Number(nivelMantenimiento) ||
          !['PROGRAMADO', 'VENCIDO'].includes(normalizarMayusculas(programacionData.estado))
        ) {
          return NextResponse.json(
            {
              status: 'failed',
              message: 'La programación preventiva ya no está disponible o no corresponde al vehículo y nivel seleccionados.',
            },
            { status: 409 }
          )
        }

        programacionPreventiva = programacionData
      }

      // ===================================================
      // OBTENER PROVEEDOR
      // ===================================================

      let proveedor = null

      if (proveedorId) {
        const {
          data,
          error,
        } = await supabase
          .from('proveedores')
          .select(`
            id,
            empresa,
            nit,
            direccion,
            telefono,
            email,
            activo
          `)
          .eq(
            'id',
            proveedorId
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
                'El proveedor seleccionado no existe o está inactivo.',
            },
            { status: 400 }
          )
        }

        proveedor = data
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

        plan_mantenimiento_id:
          tipoMantenimiento === 'PREVENTIVO'
            ? planMantenimientoId
            : null,

        programacion_mantenimiento_id:
          tipoMantenimiento === 'PREVENTIVO'
            ? programacionMantenimientoId
            : null,

        nivel_mantenimiento:
          tipoMantenimiento === 'PREVENTIVO'
            ? nivelMantenimiento
            : null,

        repuestos_utilizados:
          normalizarTexto(
            body.repuestos_utilizados
          ) || null,

        // IDs de catálogo
        proveedor_id:
          proveedor?.id ||
          null,

        tecnico_id:
          tecnico?.id ||
          null,

        // Fotografía histórica del proveedor
        empresa:
          proveedor?.empresa ||
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

        tiempoparada:
          body.tiempoparada !== null &&
          body.tiempoparada !== undefined &&
          body.tiempoparada !== ''
            ? String(
                body.tiempoparada
              )
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
          .in('estado', ['PROGRAMADO', 'VENCIDO'])

        if (actualizarProgramacionError) {
          return NextResponse.json(
            {
              status: 'failed',
              code: 'MANTENIMIENTO_GUARDADO_PROGRAMACION_NO_ACTUALIZADA',
              message: `El mantenimiento fue guardado, pero no se pudo actualizar su programación: ${actualizarProgramacionError.message}`,
              mantenimiento: data,
            },
            { status: 500 }
          )
        }

        const fechaEjecucion = String(payload.fecha_registro || '')
        const mesEjecucion = fechaEjecucion ? Number(fechaEjecucion.slice(5, 7)) : null
        const vigenciaEjecucion = fechaEjecucion ? Number(fechaEjecucion.slice(0, 4)) : null
        const anticipada =
          Number.isInteger(mesEjecucion) &&
          Number.isInteger(vigenciaEjecucion) &&
          (vigenciaEjecucion < Number(programacionPreventiva.vigencia) ||
            (vigenciaEjecucion === Number(programacionPreventiva.vigencia) &&
              mesEjecucion < Number(programacionPreventiva.mes_programado)))

        if (anticipada) {
          await supabase
            .from('programacion_mantenimiento_novedades')
            .insert({
              programacion_mantenimiento_id: programacionPreventiva.id,
              tipo_novedad: 'EJECUCION_ANTICIPADA',
              estado_anterior: programacionPreventiva.estado,
              estado_nuevo: 'EJECUTADO',
              motivo: 'Mantenimiento preventivo ejecutado antes del mes formalmente programado.',
              km_registrado: kilometraje,
              fecha_km: payload.fecha_registro,
              responsable: payload.responsable,
              documento_responsable: payload.documento_responsable,
            })
        }
      }

      return NextResponse.json(
        {
          status: 'success',
          message:
            'Mantenimiento registrado correctamente.',
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