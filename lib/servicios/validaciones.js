import { supabase } from "../supabaseClient";

/**
 * Valida si ya existe una inspección registrada para la misma placa en la misma fecha.
 * @param {string} placa - Placa del vehículo
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {Promise<{existe: boolean, mensaje: string}>}
 */
export async function validarInspeccionDuplicada(placa, fecha) {
  const { data, error } = await supabase
    .from("preoperacionales")
    .select("id")
    .eq("placa", placa)
    .eq("fecha_registro", fecha);

  if (error) {
    return { existe: true, mensaje: "Error al validar duplicado: " + error.message };
  }

  if (data && data.length > 0) {
    return { existe: true, mensaje: `Ya existe una inspección registrada hoy para la placa ${placa}.` };
  }

  return { existe: false, mensaje: "No existe inspección para esta placa en la fecha indicada, puede continuar." };
}

/**
 * Valida el kilometraje comparando contra los últimos registros en varias tablas.
 * @param {string} placa - Placa del vehículo
 * @param {number} km - Kilometraje actual ingresado
 * @returns {Promise<{estado: string, mensaje: string, maxKm?: number, diferencia?: number, fuente?: string, campo?: string}>}
 */
export async function validarKilometraje(placa, km) {
  const consultas = [
    { tabla: "preoperacionales", campo: "km_registro" },
    { tabla: "horarios", campo: "km_inicial" },
    { tabla: "horarios", campo: "km_final" },
    { tabla: "mantenimientos", campo: "kilometraje" },
    { tabla: "reporte_fallas", campo: "kilometraje" }
  ];

  let maxKm = 0;
  let fuente = "";
  let campo = "";

  for (const q of consultas) {
    const { data, error } = await supabase
      .from(q.tabla)
      .select(q.campo)
      .eq("placa", placa)
      .order(q.campo, { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      const valor = data[0][q.campo];
      if (valor !== null && valor > maxKm) {
        maxKm = valor;
        fuente = q.tabla;
        campo = q.campo;
      }
    }
  }

  if (maxKm === 0) {
    return { estado: "ok", mensaje: "No existen registros previos de kilometraje." };
  }

  if (km < maxKm) {
    return {
      estado: "error",
      mensaje: `El kilometraje ingresado (${km}) es menor al último registrado (${maxKm}) en la tabla ${fuente}.`,
      maxKm,
      fuente,
      campo
    };
  }

  const diferencia = km - maxKm;
  if (diferencia > 300) {
    return {
      estado: "advertencia",
      mensaje: `La diferencia de kilometraje (${diferencia} km) supera el límite de 300 km respecto al último registrado (${maxKm}).`,
      maxKm,
      diferencia,
      fuente,
      campo
    };
  }

  return { estado: "ok", mensaje: "Kilometraje válido." };
}
