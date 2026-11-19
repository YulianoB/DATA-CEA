-- Ejecutar en cada base CEA que tenga bloqueos_agenda_instructores.
-- Conserva los bloqueos existentes como BLOQUEO.
ALTER TABLE public.bloqueos_agenda_instructores
  ADD COLUMN IF NOT EXISTS tipo_actividad text NOT NULL DEFAULT 'BLOQUEO';
ALTER TABLE public.bloqueos_agenda_instructores
  DROP CONSTRAINT IF EXISTS bloqueos_agenda_tipo_actividad_valido;
ALTER TABLE public.bloqueos_agenda_instructores
  ADD CONSTRAINT bloqueos_agenda_tipo_actividad_valido
  CHECK (tipo_actividad IN ('BLOQUEO','TEORIA'));
COMMENT ON COLUMN public.bloqueos_agenda_instructores.tipo_actividad IS
  'TEORIA reserva la franja del instructor para actividad teórica; no equivale a cargue RUNT de clases.';
