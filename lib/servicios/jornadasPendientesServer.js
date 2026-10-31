// Control simple de jornadas abiertas anteriores al día actual (Bogotá).
export function fechaHoyHorariosBogota() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Bogota',
  }).format(new Date())
}

export async function jornadaAnteriorPendiente(supabase, usuario, fechaHoy = fechaHoyHorariosBogota()) {
  const cuenta = String(usuario || '').trim()
  if (!cuenta) return null
  // Se toma el mismo usuario de la jornada, sin mezclar funcionarios.
  const { data, error } = await supabase.from('horarios')
    .select('id, fecha_entrada, estado_registro')
    .eq('usuario', cuenta)
    .eq('estado_registro', 'Abierto')
    .lt('fecha_entrada', fechaHoy)
    .order('fecha_entrada', { ascending: true })
    .limit(1)
  if (error) throw new Error('No fue posible validar las jornadas anteriores: ' + error.message)
  return data?.[0] || null
}

export function respuestaJornadaPendiente(jornada) {
  return {
    status: 'warning',
    codigo: 'JORNADA_ANTERIOR_ABIERTA',
    message: 'No es posible registrar una nueva jornada. Se identificó una jornada anterior que no fue cerrada. Para habilitar un nuevo registro de entrada, comuníquese con el área administrativa del CEA. Allí revisarán la novedad y actualizarán el estado de la jornada pendiente.',
    jornada_pendiente: {
      id: jornada.id,
      fecha_entrada: jornada.fecha_entrada,
      estado_registro: 'Abierto',
    },
  }
}
