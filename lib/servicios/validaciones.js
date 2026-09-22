// lib/servicios/validaciones.js

/**
 * Valida si ya existe una inspección preoperacional
 * para la misma placa en la misma fecha.
 *
 * @param {string} nit - NIT del CEA
 * @param {string} placa - Placa del vehículo
 * @param {string} fecha - Fecha YYYY-MM-DD
 * @returns {Promise<{existe: boolean, mensaje: string}>}
 */
export async function validarInspeccionDuplicada(
  nit,
  placa,
  fecha
) {
  try {
    if (!nit) {
      return {
        existe: true,
        mensaje:
          'No se identificó el CEA para realizar la validación.',
      }
    }

    if (!placa || !fecha) {
      return {
        existe: true,
        mensaje:
          'Faltan datos para validar la inspección.',
      }
    }

    const res = await fetch(
      '/api/validaciones/preoperacional',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nit,
          tipo: 'duplicado',
          placa,
          fecha,
        }),
      }
    )

    const json = await res.json()

    if (
      !res.ok ||
      json?.status !== 'success'
    ) {
      return {
        existe: true,
        mensaje:
          json?.message ||
          'No fue posible validar si existe una inspección previa.',
      }
    }

    return {
      existe: Boolean(json.existe),
      mensaje:
        json?.mensaje ||
        '',
    }
  } catch (error) {
    console.error(
      'Error validando inspección duplicada:',
      error
    )

    return {
      existe: true,
      mensaje:
        'No fue posible validar la inspección duplicada.',
    }
  }
}

/**
 * Valida el kilometraje contra los últimos registros
 * operativos del vehículo.
 *
 * La consulta real se realiza desde:
 *
 * /api/validaciones/kilometraje
 *
 * y compara:
 *
 * - preoperacionales.km_registro
 * - horarios.km_inicial
 * - horarios.km_final
 * - mantenimientos.kilometraje
 * - reporte_fallas.kilometraje
 *
 * @param {string} nit - NIT del CEA
 * @param {string} placa - Placa del vehículo
 * @param {number} kilometraje - Kilometraje ingresado
 *
 * @returns {Promise<{
 *   estado: string,
 *   mensaje: string,
 *   maxKm?: number,
 *   diferencia?: number,
 *   fuente?: string,
 *   campo?: string
 * }>}
 */
export async function validarKilometraje(
  nit,
  placa,
  kilometraje
) {
  try {
    if (!nit) {
      return {
        estado: 'error',
        mensaje:
          'No se identificó el CEA para validar el kilometraje.',
      }
    }

    if (!placa) {
      return {
        estado: 'error',
        mensaje:
          'Debe seleccionar una placa.',
      }
    }

    const km =
      Number(kilometraje)

    if (
      !Number.isFinite(km) ||
      km < 0
    ) {
      return {
        estado: 'error',
        mensaje:
          'El kilometraje ingresado no es válido.',
      }
    }

    const res = await fetch(
      '/api/validaciones/kilometraje',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nit,
          placa,
          kilometraje: km,
        }),
      }
    )

    const json = await res.json()

    if (
      !res.ok ||
      json?.status !== 'success'
    ) {
      return {
        estado: 'error',
        mensaje:
          json?.message ||
          'No fue posible validar el kilometraje.',
      }
    }

    if (!json?.resultado) {
      return {
        estado: 'error',
        mensaje:
          'La respuesta de validación de kilometraje no es válida.',
      }
    }

    return json.resultado
  } catch (error) {
    console.error(
      'Error validando kilometraje:',
      error
    )

    return {
      estado: 'error',
      mensaje:
        'No fue posible validar el kilometraje.',
    }
  }
}