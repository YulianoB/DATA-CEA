export function esVehiculoActivo(estado) {
  return String(estado ?? '').trim().toUpperCase() === 'ACTIVO'
}

export function filtrarVehiculosActivos(vehiculos) {
  return (Array.isArray(vehiculos) ? vehiculos : []).filter(
    (vehiculo) => esVehiculoActivo(vehiculo?.estado)
  )
}
