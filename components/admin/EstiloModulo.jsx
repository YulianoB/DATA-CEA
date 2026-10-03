'use client'

/*
  ============================================================
  ESTILO VISUAL COMPARTIDO - DATA CEA
  Archivo sugerido:
  components/admin/EstiloModulo.jsx

  IMPORTANTE:
  Los colores principales están concentrados en PALETA.
  Puede probar otros colores cambiando solamente los códigos HEX.

  Ejemplo:
  tituloSeccion: '#082745'

  No es necesario buscar clases Tailwind en cada página para cambiar
  estos colores.
  ============================================================
*/

const PALETA = {
  // Fondo de títulos de secciones, por ejemplo "Actividades de formación".
  tituloSeccion: '#3b617d',

  // Color del texto principal dentro del título de sección.
  textoTituloSeccion: '#FFFFFF',

  // Color del subtítulo dentro del título de sección.
  textoSubtituloSeccion: '#DCE6ED',

  // Fondo de encabezados de tablas.
  encabezadoTabla: '#b2cbe2',

  // Texto de encabezados de tablas.
  textoEncabezadoTabla: '#263746',

  // Color ÚNICO de toda la cuadrícula de las tablas:
  // borde exterior, divisiones del encabezado y divisiones de registros.
  bordeTabla: '#CBD5E1',

  // Fondo general de tarjetas o matrices.
  fondoContenido: '#FFFFFF',

  // Botón principal normal.
  botonPrincipal: '#0968b0',
  botonPrincipalHover: '#29465D',

  // Botón para generar PDF. Se deja separado para que destaque.
  botonPdf: '#eb9c58',
  botonPdfHover: '#C96816',

  // Botón claro usado dentro de encabezados oscuros.
  botonClaro: '#FFFFFF',
  textoBotonClaro: '#29465D',
  botonClaroHover: '#F1F5F9',
}


/*
  ============================================================
  TITULO DE SECCIÓN
  Aplica a franjas como:
  "Actividades de formación"
  "Planeación y seguimiento de actividades..."
  ============================================================
*/
export function TituloSeccion({
  titulo,
  subtitulo,
  icono = null,
  acciones = null,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between ${className}`}
      style={{
        backgroundColor: PALETA.tituloSeccion,
        color: PALETA.textoTituloSeccion,
      }}
    >
      <div className="flex items-center gap-2">
        {icono}

        <div>
          <h2 className="text-sm font-semibold">
            {titulo}
          </h2>

          {subtitulo && (
            <p
              className="text-[10px]"
              style={{ color: PALETA.textoSubtituloSeccion }}
            >
              {subtitulo}
            </p>
          )}
        </div>
      </div>

      {acciones && (
        <div className="flex flex-wrap items-center gap-2">
          {acciones}
        </div>
      )}
    </div>
  )
}


/*
  ============================================================
  MARCO DE TABLA / MATRIZ
  Aplica al borde exterior redondeado y a TODA la cuadrícula.

  bordeTabla controla con un solo color:
  - borde exterior
  - líneas de los encabezados
  - líneas de todos los registros
  ============================================================
*/
export function MarcoTabla({
  children,
  className = '',
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl ${className}`}
      style={{
        border: `1px solid ${PALETA.bordeTabla}`,
        backgroundColor: PALETA.fondoContenido,
      }}
    >
      <style jsx>{`
        div :global(table) {
          border-collapse: collapse;
        }

        div :global(table th),
        div :global(table td) {
          border: 1px solid ${PALETA.bordeTabla} !important;
        }

        div :global(table thead) {
          background-color: ${PALETA.encabezadoTabla} !important;
          color: ${PALETA.textoEncabezadoTabla} !important;
        }
      `}</style>

      {children}
    </div>
  )
}


/*
  ============================================================
  BOTÓN GENERAR PDF
  Se mantiene compacto y con un color diferente a los títulos.
  Modifique botonPdf y botonPdfHover en PALETA para probar colores.
  ============================================================
*/
export function BotonPdf({
  children,
  className = '',
  ...props
}) {
  return (
    <button
      {...props}
      className={`inline-flex w-fit items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      style={{ backgroundColor: PALETA.botonPdf }}
      onMouseEnter={(event) => {
        if (!props.disabled) {
          event.currentTarget.style.backgroundColor = PALETA.botonPdfHover
        }
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.backgroundColor = PALETA.botonPdf
      }}
    >
      {children}
    </button>
  )
}


/*
  ============================================================
  BOTÓN CLARO
  Útil para acciones dentro de un título oscuro, por ejemplo:
  "Agregar actividad".
  ============================================================
*/
export function BotonClaro({
  children,
  className = '',
  ...props
}) {
  return (
    <button
      {...props}
      className={`inline-flex w-fit items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{
        backgroundColor: PALETA.botonClaro,
        color: PALETA.textoBotonClaro,
      }}
      onMouseEnter={(event) => {
        if (!props.disabled) {
          event.currentTarget.style.backgroundColor = PALETA.botonClaroHover
        }
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.backgroundColor = PALETA.botonClaro
      }}
    >
      {children}
    </button>
  )
}


/*
  ============================================================
  BOTÓN PRINCIPAL
  Para guardar, crear, actualizar u otras acciones principales.
  ============================================================
*/
export function BotonPrincipal({
  children,
  className = '',
  ...props
}) {
  return (
    <button
      {...props}
      className={`inline-flex w-fit items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{ backgroundColor: PALETA.botonPrincipal }}
      onMouseEnter={(event) => {
        if (!props.disabled) {
          event.currentTarget.style.backgroundColor = PALETA.botonPrincipalHover
        }
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.backgroundColor = PALETA.botonPrincipal
      }}
    >
      {children}
    </button>
  )
}
