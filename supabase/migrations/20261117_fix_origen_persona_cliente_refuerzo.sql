-- DATA CEA · Ajuste de procedencia de persona en programación
-- Ejecutar en la base Supabase de cada CEA, NO en MASTER.
-- Requiere 20261117_clientes_refuerzo_sin_recibo.sql.
-- No altera datos existentes ni crea obligaciones financieras.
BEGIN;

DO $$
DECLARE
  existe_tabla boolean;
  existe_columna boolean;
BEGIN
  SELECT to_regclass('public.clientes_refuerzo') IS NOT NULL INTO existe_tabla;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='programacion_clases'
      AND column_name='cliente_refuerzo_id'
  ) INTO existe_columna;

  IF NOT existe_tabla OR NOT existe_columna THEN
    RAISE EXCEPTION 'Primero ejecute 20261117_clientes_refuerzo_sin_recibo.sql en esta base CEA';
  END IF;
END $$;

-- Mantener combinaciones históricas admitidas:
--  · Aprendiz matriculado, con o sin recibo asociado.
--  · Externo por recibo, sin matrícula.
-- Añadir nuevo origen:
--  · Cliente externo identificado, sin matrícula ni recibo.
-- El nuevo origen debe ser exclusivo para no asociar una clase
-- simultáneamente a personas distintas.
ALTER TABLE public.programacion_clases
  DROP CONSTRAINT IF EXISTS programacion_clases_origen_persona_check;

ALTER TABLE public.programacion_clases
  ADD CONSTRAINT programacion_clases_origen_persona_check
  CHECK (
    (
      cliente_refuerzo_id IS NULL
      AND (matricula_id IS NOT NULL OR recibo_refuerzo_id IS NOT NULL)
    )
    OR
    (
      cliente_refuerzo_id IS NOT NULL
      AND matricula_id IS NULL
      AND recibo_refuerzo_id IS NULL
    )
  );

NOTIFY pgrst, 'reload schema';
COMMIT;

-- Verificación opcional:
-- SELECT conname, pg_get_constraintdef(oid) AS definicion
-- FROM pg_constraint
-- WHERE conrelid='public.programacion_clases'::regclass
--   AND conname='programacion_clases_origen_persona_check';
