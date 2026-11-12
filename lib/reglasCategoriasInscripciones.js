// Reglas compartidas de categorías para Inscripciones (cliente y servidor).
// Mantener la misma validación en la UI y en la API.
export const ORDEN_CATEGORIAS = ['A2', 'B1', 'C1', 'RC1', 'B2', 'C2', 'B3', 'C3']

export const CATEGORIAS_POR_NIVEL = {
  'NIVEL I': ['A2', 'B1', 'C1', 'RC1'],
  'NIVEL II': ['A2', 'B1', 'C1', 'RC1', 'B2', 'C2'],
  'NIVEL III': [...ORDEN_CATEGORIAS],
}

const normalizar = valor => String(valor ?? '').trim().toUpperCase()

export function extraerCategoriasHistorial(registros = []) {
  const categorias = new Set()
  for (const registro of Array.isArray(registros) ? registros : []) {
    const datos = Array.isArray(registro?.categorias)
      ? registro.categorias
      : registro?.categoria ? [registro.categoria] : []
    for (const valor of datos) {
      const categoria = normalizar(valor)
      if (ORDEN_CATEGORIAS.includes(categoria)) categorias.add(categoria)
    }
  }
  return [...categorias]
}

// Matriz explícita del flujo acordado; RC1 permanece como categoría propia.
// No se interpreta un curso histórico como prueba de licencia expedida.
export function categoriasPosteriores(historial = []) {
  const h = new Set(historial.map(normalizar))
  if (h.size === 0) return [...ORDEN_CATEGORIAS]
  if (h.has('B3') || h.has('C3')) return []
  if (h.has('C2')) return ['B3', 'C3']
  if (h.has('B2')) return ['B3']
  if (h.has('C1')) return ['B2', 'C2']
  if (h.has('RC1')) return ['C2'] // B1 → RC1 → C2, sujeto a certificación previa.
  if (h.has('B1')) return ['RC1']
  if (h.has('A2')) return ORDEN_CATEGORIAS.filter(cat => cat !== 'A2')
  return []
}

export function validarSeleccionCategorias({
  seleccion = [], historial = [], habilitadas = [], edad = null,
} = {}) {
  const seleccionadas = seleccion.map(normalizar)
  const previas = historial.map(normalizar)
  const autorizadas = habilitadas.map(normalizar)
  if (!seleccionadas.length || seleccionadas.length > 2 ||
      new Set(seleccionadas).size !== seleccionadas.length) {
    return { ok: false, message: 'Seleccione una o máximo dos categorías distintas.' }
  }
  if (seleccionadas.some(cat => !ORDEN_CATEGORIAS.includes(cat) || !autorizadas.includes(cat))) {
    return { ok: false, message: 'Una categoría seleccionada no está habilitada para este CEA.' }
  }
  if (seleccionadas.some(cat => previas.includes(cat))) {
    return { ok: false, message: 'La categoría ya figura en el historial; consulte la matrícula original para una continuación.' }
  }
  const posibles = categoriasPosteriores(previas)
  if (seleccionadas.some(cat => !posibles.includes(cat))) {
    return { ok: false, message: 'La categoría no está permitida según el historial del aprendiz.' }
  }
  // Con historial se matricula solo una categoría nueva a la vez.
  if (previas.length && seleccionadas.length > 1) {
    return { ok: false, message: 'Con matrículas anteriores solo puede inscribir una categoría nueva por proceso.' }
  }
  if (seleccionadas.length === 2 && !seleccionadas.includes('A2')) {
    return { ok: false, message: 'Dos categorías nuevas solo pueden combinarse cuando una es A2.' }
  }
  if (edad !== null && Number.isFinite(Number(edad))) {
    if (Number(edad) < 16) return { ok: false, message: 'Debe tener al menos 16 años.' }
    if (Number(edad) < 18 && seleccionadas.some(cat => !['A2', 'B1'].includes(cat))) {
      return { ok: false, message: 'Con 16 o 17 años solo puede inscribir A2 o B1.' }
    }
  }
  return { ok: true, message: '' }
}

export function puedeSeleccionarCategoria({ categoria, seleccion = [], historial = [], habilitadas = [], edad = null }) {
  const cat = normalizar(categoria)
  if (seleccion.includes(cat)) return true // permite desmarcar
  return validarSeleccionCategorias({
    seleccion: [...seleccion, cat], historial, habilitadas, edad,
  }).ok
}
