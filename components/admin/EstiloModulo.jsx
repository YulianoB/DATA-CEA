'use client'

// ============================================================
// SISTEMA VISUAL COMPARTIDO - DATA CEA
// PAGINAS DE TRABAJO
// ============================================================

// 1. BLOQUES / TITULOS DE SECCION
export const ESTILO_SECCIONES = {
  fondo: '#24638C',
  texto: '#FFFFFF',
  subtitulo: '#DCE6ED',
  borde: '#24638C',
  grosorBorde: 1,
  radio: 10,
}

// Franjas secundarias dentro de modales, formularios y bloques de detalle.
export const ESTILO_SECCIONES_SECUNDARIAS = {
  fondo: '#34A6F4',
  texto: '#FFFFFF',
  borde: '#34A6F4',
  grosorBorde: 1,
  radio: 8,
}

// 2. TABLAS - ENCABEZADOS
export const ESTILO_ENCABEZADO_TABLA = {
  fondo: '#74D4FF',
  texto: '#263746',
  fondoHover: '#A6C2DB',
  textoHover: '#1E2F3D',
}

// 3. TABLAS - CELDAS Y CUADRICULA
export const ESTILO_CELDAS_TABLA = {
  borde: '#CBD5E1',
  grosorBorde: 1,
  fondo: '#FFFFFF',
  fondoFilaHover: '#F8FAFC',
}

// 4. CONTENEDORES
export const ESTILO_CONTENEDORES = {
  fondo: '#FFFFFF',
  borde: '#D8E0E8',
  grosorBorde: 1,
  radio: 12,
  sombra: '0 2px 8px rgba(15, 23, 42, 0.06)',
}

// 5. TARJETAS
export const ESTILO_TARJETAS = {
  fondo: '#FFFFFF',
  borde: '#D8E0E8',
  bordeHover: '#7A9AB4',
  grosorBorde: 1,
  radio: 12,
  sombra: '0 2px 8px rgba(15, 23, 42, 0.06)',
  sombraHover: '0 8px 20px rgba(15, 23, 42, 0.12)',
  movimientoHover: 'translateY(-3px)',
}

// 6. BOTONES SEGUN SU FUNCION
export const ESTILO_BOTONES = {
  guardar: { fondo: '#0968B0', hover: '#07548E', texto: '#FFFFFF', borde: '#0968B0' },
  agregar: { fondo: '#198754', hover: '#146C43', texto: '#FFFFFF', borde: '#198754' },
  editar: { fondo: '#D98C20', hover: '#B87316', texto: '#FFFFFF', borde: '#D98C20' },
  consultar: { fondo: '#3B617D', hover: '#29465D', texto: '#FFFFFF', borde: '#3B617D' },
  eliminar: { fondo: '#C93C3C', hover: '#A92F2F', texto: '#FFFFFF', borde: '#C93C3C' },
  cancelar: { fondo: '#FFFFFF', hover: '#F1F5F9', texto: '#475569', borde: '#CBD5E1' },
  pdf: { fondo: '#EB9C58', hover: '#C96816', texto: '#FFFFFF', borde: '#EB9C58' },
  excel: { fondo: '#217346', hover: '#185C37', texto: '#FFFFFF', borde: '#217346' },
  secundario: { fondo: '#FFFFFF', hover: '#F1F5F9', texto: '#29465D', borde: '#CBD5E1' },
  limpiar: { fondo: '#6B7280', hover: '#374151', texto: '#FFFFFF', borde: '#6B7280' },

  // Acciones estandarizadas para tablas y documentos
  documentos: { fondo: '#4682B4', hover: '#356A96', texto: '#FFFFFF', borde: '#4682B4' },
  expediente: { fondo: '#5F9EA0', hover: '#4D8587', texto: '#FFFFFF', borde: '#5F9EA0' },
  vistaPrevia: { fondo: '#5F9EA0', hover: '#4D8587', texto: '#FFFFFF', borde: '#5F9EA0' },
  imprimir: { fondo: '#71717B', hover: '#5B5B63', texto: '#FFFFFF', borde: '#71717B' },
  cargarPdf: { fondo: '#7C86FF', hover: '#626DDF', texto: '#FFFFFF', borde: '#7C86FF' },
  editarVehiculo: { fondo: '#3991DB', hover: '#2879BC', texto: '#FFFFFF', borde: '#3991DB' },
  hojaVida: { fondo: '#41659C', hover: '#34517E', texto: '#FFFFFF', borde: '#41659C' },
  inactivar: { fondo: '#FF6467', hover: '#E14F52', texto: '#FFFFFF', borde: '#FF6467' },
  activar: { fondo: '#32A66F', hover: '#27875A', texto: '#FFFFFF', borde: '#32A66F' },
}

// 7. MOVIMIENTO COMUN PARA ELEMENTOS INTERACTIVOS
export const MOVIMIENTO_INTERACTIVO = {
  transformHover: 'translateY(-2px)',
  transformActivo: 'translateY(0)',
  transicion: 'all 180ms ease',
}

function aplicarHoverBoton(event, tipo, activo) {
  const estilo = ESTILO_BOTONES[tipo] || ESTILO_BOTONES.guardar
  event.currentTarget.style.backgroundColor = activo ? estilo.hover : estilo.fondo
  event.currentTarget.style.transform = activo
    ? MOVIMIENTO_INTERACTIVO.transformHover
    : MOVIMIENTO_INTERACTIVO.transformActivo
  event.currentTarget.style.boxShadow = activo
    ? '0 5px 12px rgba(15, 23, 42, 0.14)'
    : '0 1px 3px rgba(15, 23, 42, 0.08)'
}

export function BotonAccion({ tipo = 'guardar', children, className = '', style = {}, ...props }) {
  const estilo = ESTILO_BOTONES[tipo] || ESTILO_BOTONES.guardar
  return (
    <button
      {...props}
      className={`inline-flex w-fit items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{
        backgroundColor: estilo.fondo,
        color: estilo.texto,
        borderColor: estilo.borde,
        transition: MOVIMIENTO_INTERACTIVO.transicion,
        ...style,
      }}
      onMouseEnter={(event) => {
        if (!props.disabled) aplicarHoverBoton(event, tipo, true)
        props.onMouseEnter?.(event)
      }}
      onMouseLeave={(event) => {
        aplicarHoverBoton(event, tipo, false)
        props.onMouseLeave?.(event)
      }}
    >
      {children}
    </button>
  )
}

export const BotonGuardar = (props) => <BotonAccion tipo="guardar" {...props} />
export const BotonAgregar = (props) => <BotonAccion tipo="agregar" {...props} />
export const BotonEditar = (props) => <BotonAccion tipo="editar" {...props} />
export const BotonConsultar = (props) => <BotonAccion tipo="consultar" {...props} />
export const BotonEliminar = (props) => <BotonAccion tipo="eliminar" {...props} />
export const BotonCancelar = (props) => <BotonAccion tipo="cancelar" {...props} />
export const BotonExcel = (props) => <BotonAccion tipo="excel" {...props} />
export const BotonSecundario = (props) => <BotonAccion tipo="secundario" {...props} />
export const BotonLimpiar = (props) => <BotonAccion tipo="limpiar" {...props} />

// Acciones de tablas / documentos
export const BotonDocumentos = (props) => <BotonAccion tipo="documentos" {...props} />
export const BotonExpediente = (props) => <BotonAccion tipo="expediente" {...props} />
export const BotonVistaPrevia = (props) => <BotonAccion tipo="vistaPrevia" {...props} />
export const BotonImprimir = (props) => <BotonAccion tipo="imprimir" {...props} />
export const BotonCargarPdf = (props) => <BotonAccion tipo="cargarPdf" {...props} />

// Compatibilidad con paginas que ya usan estos nombres.
export const BotonPrincipal = BotonGuardar
export const BotonClaro = BotonSecundario
export const BotonPdf = (props) => <BotonAccion tipo="pdf" {...props} />

export function TituloSeccion({ titulo, subtitulo, icono = null, acciones = null, className = '' }) {
  return (
    <div
      className={`flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between ${className}`}
      style={{
        backgroundColor: ESTILO_SECCIONES.fondo,
        color: ESTILO_SECCIONES.texto,
        border: `${ESTILO_SECCIONES.grosorBorde}px solid ${ESTILO_SECCIONES.borde}`,
        borderRadius: `${ESTILO_SECCIONES.radio}px`,
      }}
    >
      <div className="flex items-center gap-2">
        {icono}
        <div>
          <h2 className="text-sm font-semibold">{titulo}</h2>
          {subtitulo && <p className="text-[10px]" style={{ color: ESTILO_SECCIONES.subtitulo }}>{subtitulo}</p>}
        </div>
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  )
}

export function ContenedorModulo({ children, className = '', style = {}, ...props }) {
  return (
    <section
      {...props}
      className={className}
      style={{
        backgroundColor: ESTILO_CONTENEDORES.fondo,
        border: `${ESTILO_CONTENEDORES.grosorBorde}px solid ${ESTILO_CONTENEDORES.borde}`,
        borderRadius: `${ESTILO_CONTENEDORES.radio}px`,
        boxShadow: ESTILO_CONTENEDORES.sombra,
        ...style,
      }}
    >
      {children}
    </section>
  )
}

export function TarjetaModulo({ children, className = '', interactiva = true, style = {}, ...props }) {
  return (
    <div
      {...props}
      className={className}
      style={{
        backgroundColor: ESTILO_TARJETAS.fondo,
        border: `${ESTILO_TARJETAS.grosorBorde}px solid ${ESTILO_TARJETAS.borde}`,
        borderRadius: `${ESTILO_TARJETAS.radio}px`,
        boxShadow: ESTILO_TARJETAS.sombra,
        transition: MOVIMIENTO_INTERACTIVO.transicion,
        ...style,
      }}
      onMouseEnter={(event) => {
        if (interactiva) {
          event.currentTarget.style.borderColor = ESTILO_TARJETAS.bordeHover
          event.currentTarget.style.boxShadow = ESTILO_TARJETAS.sombraHover
          event.currentTarget.style.transform = ESTILO_TARJETAS.movimientoHover
        }
        props.onMouseEnter?.(event)
      }}
      onMouseLeave={(event) => {
        if (interactiva) {
          event.currentTarget.style.borderColor = ESTILO_TARJETAS.borde
          event.currentTarget.style.boxShadow = ESTILO_TARJETAS.sombra
          event.currentTarget.style.transform = 'translateY(0)'
        }
        props.onMouseLeave?.(event)
      }}
    >
      {children}
    </div>
  )
}

export function MarcoTabla({ children, className = '' }) {
  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{
        border: `${ESTILO_CONTENEDORES.grosorBorde}px solid ${ESTILO_CONTENEDORES.borde}`,
        borderRadius: `${ESTILO_CONTENEDORES.radio}px`,
        backgroundColor: ESTILO_CELDAS_TABLA.fondo,
      }}
    >
      <style jsx>{`
        div :global(table) { border-collapse: collapse; width: 100%; }
        div :global(table th),
        div :global(table td) {
          border: ${ESTILO_CELDAS_TABLA.grosorBorde}px solid ${ESTILO_CELDAS_TABLA.borde} !important;
        }
        div :global(table thead) {
          background-color: ${ESTILO_ENCABEZADO_TABLA.fondo} !important;
          color: ${ESTILO_ENCABEZADO_TABLA.texto} !important;
        }
        div :global(table thead th:hover) {
          background-color: ${ESTILO_ENCABEZADO_TABLA.fondoHover} !important;
          color: ${ESTILO_ENCABEZADO_TABLA.textoHover} !important;
        }
        div :global(table tbody tr:hover) {
          background-color: ${ESTILO_CELDAS_TABLA.fondoFilaHover};
        }
      `}</style>
      {children}
    </div>
  )
}
