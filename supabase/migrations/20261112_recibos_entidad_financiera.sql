-- DATA-CEA: separar entidad financiera del número oficial de recibo.
-- Únicamente estructura. Sin funciones, RPC ni triggers.
-- Ejecutar en las bases de datos de los CEA antes de activar el nuevo formulario.
ALTER TABLE public.recibos_caja
  ADD COLUMN IF NOT EXISTS entidad_financiera text NULL;
COMMENT ON COLUMN public.recibos_caja.referencia_pago IS
  'Número oficial del recibo de Caja (histórico migrado o consecutivo nuevo).';
COMMENT ON COLUMN public.recibos_caja.entidad_financiera IS
  'Banco o plataforma del pago; independiente del número oficial del recibo.';
