// Borrador orientativo sujeto a revisión jurídica e institucional.
// No constituye autorización vigente ni reemplaza la aceptación del titular.
export const PLANTILLA_AUTORIZACION_DATOS_CEA = {
  nombre_documento: 'AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS PERSONALES',
  codigo: '', version: '', fecha_edicion: '', vigencia: '',
  configuracion: {
    correo_proteccion_datos: '',
    telefono_contacto: '',
    direccion_contacto: '',
    medio_politica: '',
    texto_datos_biometricos: 'Describa aquí los datos biométricos que se requieran, la finalidad específica, su carácter sensible y el consentimiento cuando resulte necesario.',
    texto_menores_edad: 'Describa aquí las medidas de información y autorización aplicables cuando el titular sea menor de edad, según las circunstancias y la normativa vigente.',
    texto_declaracion_final: 'Declaro haber recibido información sobre el responsable, las finalidades y mis derechos. Revise y adapte esta declaración a los consentimientos que legalmente correspondan.',
  },
  secciones: [
    { orden: 1, titulo: 'IDENTIFICACIÓN DEL RESPONSABLE', contenido: 'Indique la razón social, NIT y datos de contacto del CEA responsable del tratamiento.', activo: true },
    { orden: 2, titulo: 'INFORMACIÓN OBJETO DE TRATAMIENTO', contenido: 'Describa las categorías de datos que recopila el CEA en cada proceso, incluidos datos sensibles cuando correspondan.', activo: true },
    { orden: 3, titulo: 'FINALIDADES DEL TRATAMIENTO', contenido: 'Describa las finalidades específicas y necesarias de la recolección, uso, almacenamiento, consulta y comunicación de datos.', activo: true },
    { orden: 4, titulo: 'DERECHOS DEL TITULAR', contenido: 'Informe los derechos del titular y los mecanismos para ejercerlos conforme a la normativa aplicable.', activo: true },
    { orden: 5, titulo: 'CANALES DE ATENCIÓN Y POLÍTICA', contenido: 'Indique los canales de consultas y reclamos y dónde se encuentra la política institucional de tratamiento de datos.', activo: true },
  ],
  // Las finalidades con respuesta independiente deben ser definidas y
  // revisadas por cada CEA antes de publicar; no se autorizan por defecto.
  finalidades: [],
}
