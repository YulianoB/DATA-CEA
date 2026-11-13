// Entidades permitidas en el formulario de Caja.
// No utilizar referencia_pago para almacenar nombres de entidades.
export const ENTIDADES_FINANCIERAS_CAJA = [
  'BANCOLOMBIA',
  'DAVIVIENDA',
  'NEQUI',
  'DAVIPLATA',
  'BANCO DE BOGOTÁ',
  'BBVA',
  'BANCO DE OCCIDENTE',
  'BANCO POPULAR',
  'BANCO CAJA SOCIAL',
  'BANCO AGRARIO',
  'SCOTIABANK COLPATRIA',
  'ITAÚ',
  'NU',
  'PSE',
  'OTRA ENTIDAD',
]
export const esEntidadFinancieraValida = valor =>
  !valor || ENTIDADES_FINANCIERAS_CAJA.includes(String(valor).trim().toUpperCase())
