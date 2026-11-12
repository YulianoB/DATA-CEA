-- DATA-CEA: continuación por vencimiento RUNT con obligación independiente.
-- Ejecutar en cada base CEA después de revisar copia de seguridad.
-- La transacción íntegra la realiza la función PostgreSQL.
BEGIN;

ALTER TABLE public.matriculas_continuaciones
  ADD COLUMN IF NOT EXISTS control_runt_anterior_id bigint,
  ADD COLUMN IF NOT EXISTS cuenta_id bigint;

CREATE UNIQUE INDEX IF NOT EXISTS matriculas_continuaciones_runt_anterior_uidx
  ON public.matriculas_continuaciones (control_runt_anterior_id)
  WHERE control_runt_anterior_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS matriculas_continuaciones_cuenta_uidx
  ON public.matriculas_continuaciones (cuenta_id)
  WHERE cuenta_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
      WHERE conname = 'matriculas_continuaciones_runt_anterior_fk'
        AND conrelid = 'public.matriculas_continuaciones'::regclass) THEN
    ALTER TABLE public.matriculas_continuaciones ADD CONSTRAINT
      matriculas_continuaciones_runt_anterior_fk
      FOREIGN KEY (control_runt_anterior_id) REFERENCES public.control_runt(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
      WHERE conname = 'matriculas_continuaciones_cuenta_fk'
        AND conrelid = 'public.matriculas_continuaciones'::regclass) THEN
    ALTER TABLE public.matriculas_continuaciones ADD CONSTRAINT
      matriculas_continuaciones_cuenta_fk
      FOREIGN KEY (cuenta_id) REFERENCES public.cuentas_aprendiz(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.registrar_continuacion_con_obligacion(
  p_matricula_id bigint,
  p_fecha_continuacion date,
  p_motivo text,
  p_observaciones text,
  p_registrado_por text,
  p_valor_continuacion numeric
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_matricula public.aprendices%ROWTYPE;
  v_control public.control_runt%ROWTYPE;
  v_continuacion_id bigint;
  v_cuenta_id bigint;
  v_concepto_id bigint;
  v_categoria text;
  v_hoy date := (now() AT TIME ZONE 'America/Bogota')::date;
BEGIN
  IF p_matricula_id IS NULL OR p_fecha_continuacion IS NULL OR
     length(btrim(coalesce(p_motivo,''))) < 8 OR
     length(btrim(coalesce(p_registrado_por,''))) = 0 OR
     p_valor_continuacion IS NULL OR p_valor_continuacion <= 0 OR
     p_valor_continuacion > 999999999999.99 OR
     round(p_valor_continuacion,2) <> p_valor_continuacion THEN
    RAISE EXCEPTION 'Datos inválidos: matrícula, fecha, motivo, responsable y valor positivo son obligatorios.';
  END IF;

  SELECT * INTO v_matricula FROM public.aprendices
   WHERE id = p_matricula_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe la matrícula original.';
  END IF;
  IF p_fecha_continuacion < v_matricula.fecha_matricula OR p_fecha_continuacion > v_hoy THEN
    RAISE EXCEPTION 'La fecha debe estar entre la matrícula original y hoy.';
  END IF;

  SELECT * INTO v_control FROM public.control_runt
   WHERE matricula_id = p_matricula_id
   ORDER BY numero_proceso DESC, created_at DESC, id DESC
   LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR v_control.id IS NULL THEN
    RAISE EXCEPTION 'No existe proceso RUNT para verificar.';
  END IF;
  IF v_control.estado_certificacion = 'CERTIFICADO' OR
     v_control.estado_registro <> 'REGISTRADO' OR
     v_control.fecha_registro IS NULL OR
     v_control.fecha_registro + 90 >= v_hoy THEN
    RAISE EXCEPTION 'Solo se admite continuación cuando el último RUNT está vencido y no certificado.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matriculas_continuaciones mc
    WHERE mc.matricula_id = p_matricula_id
      AND (mc.control_runt_anterior_id = v_control.id
           OR (mc.control_runt_anterior_id IS NULL AND mc.created_at > v_control.created_at))
  ) THEN
    RAISE EXCEPTION 'Ya se registró una continuación para este proceso RUNT.';
  END IF;

  v_categoria := v_control.categoria;
  SELECT id INTO v_concepto_id FROM public.conceptos_caja
    WHERE upper(btrim(nombre)) = 'CURSO' AND activo = true
      AND naturaleza IN ('INGRESO','AMBOS')
    ORDER BY id LIMIT 1;
  IF v_concepto_id IS NULL THEN
    RAISE EXCEPTION 'No existe el concepto activo CURSO en Caja.';
  END IF;

  INSERT INTO public.matriculas_continuaciones(
    matricula_id, fecha_continuacion, motivo, observaciones,
    registrado_por, control_runt_anterior_id
  ) VALUES (
    p_matricula_id, p_fecha_continuacion, btrim(p_motivo),
    nullif(btrim(coalesce(p_observaciones,'')),''), btrim(p_registrado_por),
    v_control.id
  ) RETURNING id INTO v_continuacion_id;

  INSERT INTO public.cuentas_aprendiz(
    documento, convenio_id, descripcion, valor_total, estado, origen_pago,
    observaciones, creado_por, origen_matricula
  ) VALUES (
    v_matricula.documento, v_matricula.convenio_id,
    format('CONTINUACIÓN MATRÍCULA %s - %s - PROCESO RUNT %s',
       v_matricula.consecutivo, v_categoria, v_control.numero_proceso + 1),
    p_valor_continuacion, 'PENDIENTE',
    CASE WHEN v_matricula.origen_matricula = 'CONVENIO' THEN 'CONVENIO' ELSE 'DIRECTO' END,
    format('Continuación #%s. Motivo: %s. %s',
      v_continuacion_id, btrim(p_motivo), coalesce(p_observaciones,'')),
    btrim(p_registrado_por), v_matricula.origen_matricula
  ) RETURNING id INTO v_cuenta_id;

  INSERT INTO public.cuentas_aprendiz_detalle(
    cuenta_id, matricula_id, concepto_id, categorias, descripcion,
    valor, estado, creado_por
  ) VALUES (
    v_cuenta_id, v_matricula.id, v_concepto_id, ARRAY[v_categoria],
    format('CONTINUACIÓN CURSO %s - RUNT PROCESO %s', v_categoria, v_control.numero_proceso + 1),
    p_valor_continuacion, 'ACTIVO', btrim(p_registrado_por)
  );

  UPDATE public.matriculas_continuaciones
    SET cuenta_id = v_cuenta_id WHERE id = v_continuacion_id;

  RETURN jsonb_build_object(
    'id', v_continuacion_id, 'matricula_id', v_matricula.id,
    'consecutivo_original', v_matricula.consecutivo,
    'control_runt_anterior_id', v_control.id, 'cuenta_id', v_cuenta_id,
    'valor_total', p_valor_continuacion, 'categoria', v_categoria
  );
END $$;

REVOKE ALL ON FUNCTION public.registrar_continuacion_con_obligacion(
  bigint,date,text,text,text,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_continuacion_con_obligacion(
  bigint,date,text,text,text,numeric) TO service_role;

COMMIT;
