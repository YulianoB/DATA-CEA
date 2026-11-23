-- DATA-CEA: migracion de secuencia practica.
-- Instalar en cada Supabase CEA despues de validar su esquema y reparar datos preexistentes.
BEGIN;
CREATE TABLE IF NOT EXISTS public.cea_secuencia_practica_base (
  matricula_id bigint NOT NULL,
  categoria text NOT NULL,
  numero_anterior_data_cea integer NOT NULL CHECK(numero_anterior_data_cea >= 0),
  origen text NOT NULL DEFAULT 'INFERIDO',
  registrado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(matricula_id,categoria)
);
CREATE TABLE IF NOT EXISTS public.cea_auditoria_secuencia_practica (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  operacion_id uuid NOT NULL DEFAULT gen_random_uuid(),
  clase_id bigint NOT NULL,
  matricula_id bigint NOT NULL,
  categoria text NOT NULL,
  estado_anterior text,
  estado_nuevo text,
  numero_anterior integer,
  numero_nuevo integer,
  tipo_cambio text NOT NULL,
  usuario text,
  motivo text,
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cea_auditoria_secuencia_practica_matricula_idx
  ON public.cea_auditoria_secuencia_practica(matricula_id,categoria,creado_en DESC);
ALTER TABLE public.cea_auditoria_secuencia_practica ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.cea_reordenar_practica_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_base integer;
  v_primera integer;
  v_numero integer;
  v_siguiente integer;
  v_fila record;
  v_obs text;
  v_operacion uuid := gen_random_uuid();
  v_usuario text := COALESCE(NEW.usuario_actualiza_estado, NEW.usuario_programa);
BEGIN
  IF NEW.tipo_programacion IS DISTINCT FROM 'CURSO_VIGENTE'
     OR NEW.matricula_id IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.matricula_id::text || ':' || NEW.categoria::text, 0)
  );
  SELECT numero_anterior_data_cea INTO v_base
  FROM public.cea_secuencia_practica_base
  WHERE matricula_id=NEW.matricula_id AND categoria=NEW.categoria;
  IF NOT FOUND THEN
    SELECT substring(observaciones from '\[CEA_CLASE_PRACTICA:([0-9]+)\]')::integer
      INTO v_primera FROM public.programacion_clases
    WHERE matricula_id=NEW.matricula_id AND categoria=NEW.categoria
      AND tipo_programacion='CURSO_VIGENTE'
      AND observaciones ~ '\[CEA_CLASE_PRACTICA:[0-9]+\]'
    ORDER BY fecha, hora_inicio, id LIMIT 1;
    IF v_primera IS NULL OR v_primera < 1 THEN
      RAISE EXCEPTION 'Matrícula % categoría % sin número inicial verificable; configure la base histórica.',
        NEW.matricula_id, NEW.categoria;
    END IF;
    v_base := v_primera-1;
    INSERT INTO public.cea_secuencia_practica_base
      (matricula_id,categoria,numero_anterior_data_cea,origen)
    VALUES (NEW.matricula_id,NEW.categoria,v_base,'INFERIDO');
  END IF;
  IF TG_OP='UPDATE' AND OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO public.cea_auditoria_secuencia_practica
      (operacion_id,clase_id,matricula_id,categoria,estado_anterior,estado_nuevo,
       numero_anterior,numero_nuevo,tipo_cambio,usuario,motivo)
    VALUES (v_operacion,NEW.id,NEW.matricula_id,NEW.categoria,OLD.estado,NEW.estado,
      substring(OLD.observaciones from '\[CEA_CLASE_PRACTICA:([0-9]+)\]')::integer,
      substring(NEW.observaciones from '\[CEA_CLASE_PRACTICA:([0-9]+)\]')::integer,
      'CORRECCION_ESTADO',v_usuario,
      COALESCE(NEW.observacion_no_dictada,OLD.observacion_no_dictada));
  END IF;
  v_siguiente := v_base;
  FOR v_fila IN
    SELECT id,estado,observaciones
    FROM public.programacion_clases
    WHERE matricula_id=NEW.matricula_id AND categoria=NEW.categoria
      AND tipo_programacion='CURSO_VIGENTE'
      AND estado IN ('AGENDADA','PENDIENTE_CARGUE','DICTADA')
    ORDER BY fecha,hora_inicio,id FOR UPDATE
  LOOP
    v_siguiente := v_siguiente+1;
    v_numero := substring(v_fila.observaciones from '\[CEA_CLASE_PRACTICA:([0-9]+)\]')::integer;
    IF v_numero IS NULL THEN
      RAISE EXCEPTION 'Clase % sin número práctico; cambio cancelado.',v_fila.id;
    END IF;
    -- Un nuevo registro debe solicitar el consecutivo siguiente correcto.
    -- Rechazar solicitudes obsoletas en lugar de guardar un número distinto
    -- del que el operador confirmó.
    IF TG_OP='INSERT' AND v_fila.id=NEW.id AND v_numero <> v_siguiente THEN
      RAISE EXCEPTION 'Consecutivo desactualizado: solicitado %, corresponde %. Actualice el progreso y vuelva a programar.',
        v_numero,v_siguiente;
    END IF;
    IF v_fila.estado IN ('DICTADA','PENDIENTE_CARGUE') AND v_numero <> v_siguiente THEN
      RAISE EXCEPTION 'Conflicto histórico en clase %: número %, esperado %. No se alteraron clases dictadas.',
        v_fila.id,v_numero,v_siguiente;
    END IF;
    IF v_fila.estado='AGENDADA' AND v_numero <> v_siguiente THEN
      v_obs := regexp_replace(v_fila.observaciones,
        '\[CEA_CLASE_PRACTICA:[0-9]+\]',
        '[CEA_CLASE_PRACTICA:'||v_siguiente||']');
      UPDATE public.programacion_clases
         SET observaciones=v_obs,updated_at=now() WHERE id=v_fila.id;
      INSERT INTO public.cea_auditoria_secuencia_practica
        (operacion_id,clase_id,matricula_id,categoria,estado_anterior,estado_nuevo,
         numero_anterior,numero_nuevo,tipo_cambio,usuario,motivo)
      VALUES (v_operacion,v_fila.id,NEW.matricula_id,NEW.categoria,
        'AGENDADA','AGENDADA',v_numero,v_siguiente,
        'REASIGNACION_RESERVA',v_usuario,'Reorganización posterior a operación de programación');
    END IF;
  END LOOP;
  RETURN NEW;
END;
$func$;
DROP TRIGGER IF EXISTS cea_reordenar_practica ON public.programacion_clases;
CREATE TRIGGER cea_reordenar_practica
AFTER INSERT OR UPDATE OF estado, fecha, hora_inicio ON public.programacion_clases
FOR EACH ROW EXECUTE FUNCTION public.cea_reordenar_practica_trigger();
REVOKE ALL ON public.cea_secuencia_practica_base FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.cea_auditoria_secuencia_practica FROM PUBLIC,anon,authenticated;
COMMIT;
