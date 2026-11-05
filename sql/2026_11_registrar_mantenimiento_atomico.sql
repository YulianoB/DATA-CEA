-- DATA-CEA · Registro completo de mantenimiento en una sola transacción
-- Preparado para instalación manual en la base de cada CEA.
-- No crea triggers ni altera datos históricos.
-- IMPORTANTE: instalar y verificar antes de cambiar la API al modo RPC.
CREATE OR REPLACE FUNCTION public.registrar_mantenimiento_atomico(
  p_mantenimiento jsonb,
  p_actividades jsonb DEFAULT '[]'::jsonb,
  p_pendientes jsonb DEFAULT '[]'::jsonb,
  p_adicionales jsonb DEFAULT '[]'::jsonb,
  p_plan jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  m public.mantenimientos%ROWTYPE;
  nuevo_id integer;
  programacion_id bigint;
  vehiculo_id integer;
  ciclo_num integer;
  config_aceite_id bigint;
  frecuencia_base numeric;
  servicio_adicional boolean;
  normalizacion_p1 boolean;
  estado_programacion text;
  km_aceite numeric;
  mantenimiento_base integer;
  item jsonb;
  config_id bigint;
  actividad_id bigint;
  nombre_actividad text;
  n integer;
  ahora timestamptz := clock_timestamp();
BEGIN
  IF p_mantenimiento IS NULL OR jsonb_typeof(p_mantenimiento) <> 'object'
     OR jsonb_typeof(p_actividades) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_pendientes) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_adicionales) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_plan) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Estructura inválida del registro de mantenimiento.';
  END IF;

  m := jsonb_populate_record(NULL::public.mantenimientos, p_mantenimiento);
  IF m.placa IS NULL OR btrim(m.placa) = ''
     OR m.fecha_registro IS NULL OR m.kilometraje IS NULL
     OR m.kilometraje < 0 OR m.tipo_mantenimiento NOT IN ('PREVENTIVO','CORRECTIVO')
     OR m.proveedor_id IS NULL OR m.tecnico_id IS NULL
     OR m.actividad_realizada IS NULL OR btrim(m.actividad_realizada) = ''
     OR m.repuestos_utilizados IS NULL OR btrim(m.repuestos_utilizados) = ''
     OR m.factura IS NULL OR btrim(m.factura) = ''
     OR m.observaciones IS NULL OR btrim(m.observaciones) = ''
     OR m.tiempoparada IS NULL
     OR m.valor_repuestos IS NULL OR m.valor_mano_obra IS NULL
     OR m.valor_repuestos < 0 OR m.valor_mano_obra < 0 THEN
    RAISE EXCEPTION 'Faltan campos obligatorios: registro rechazado sin guardar datos.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tecnicos t
    WHERE t.id = m.tecnico_id AND t.proveedor_id = m.proveedor_id AND t.activo IS DISTINCT FROM false
  ) OR NOT EXISTS (
    SELECT 1 FROM public.proveedores p
    WHERE p.id = m.proveedor_id AND p.activo IS DISTINCT FROM false
  ) THEN
    RAISE EXCEPTION 'El proveedor y el técnico no son válidos o no están asociados.';
  END IF;

  IF m.tipo_mantenimiento = 'PREVENTIVO' THEN
    vehiculo_id := (p_plan->>'vehiculo_id')::integer;
    ciclo_num := (p_plan->>'ciclo')::integer;
    config_aceite_id := (p_plan->>'configuracion_aceite_id')::bigint;
    frecuencia_base := (p_plan->>'frecuencia_base')::numeric;
    servicio_adicional := COALESCE((p_plan->>'servicio_adicional_punto')::boolean,false);
    normalizacion_p1 := COALESCE((p_plan->>'normalizacion_p1')::boolean,false);

    IF vehiculo_id IS NULL OR vehiculo_id <= 0 OR ciclo_num IS NULL OR ciclo_num <= 0
       OR config_aceite_id IS NULL OR frecuencia_base IS NULL OR frecuencia_base <= 0 THEN
      RAISE EXCEPTION 'Configuración del punto preventivo incompleta.';
    END IF;

    -- Bloqueo por vehículo: dos instructores no pueden ejecutar el mismo P1 a la vez.
    PERFORM pg_advisory_xact_lock(20261104, vehiculo_id);

    IF NOT EXISTS (SELECT 1 FROM public.vehiculos v WHERE v.id = vehiculo_id AND v.placa = m.placa)
       OR NOT EXISTS (
         SELECT 1 FROM public.vehiculo_mantenimiento_config c
         WHERE c.id = config_aceite_id AND c.vehiculo_id = vehiculo_id
       ) THEN
      RAISE EXCEPTION 'Vehículo o configuración base no corresponden al servicio.';
    END IF;

    SELECT pm.id, pm.estado, pm.km_ejecucion, pm.mantenimiento_id
      INTO programacion_id, estado_programacion, km_aceite, mantenimiento_base
    FROM public.programacion_mantenimiento pm
    WHERE pm.vehiculo_id = vehiculo_id AND pm.ciclo = ciclo_num
    FOR UPDATE;

    IF programacion_id IS NULL THEN
      IF servicio_adicional THEN
        RAISE EXCEPTION 'No existe un punto ejecutado para asociar este servicio.';
      END IF;
      INSERT INTO public.programacion_mantenimiento
        (vehiculo_id,ciclo,km_limite,estado,vigencia,mes_programado,observaciones)
      VALUES
        (vehiculo_id,ciclo_num,(p_plan->>'km_objetivo')::numeric,'PROGRAMADO',
         EXTRACT(YEAR FROM m.fecha_registro)::integer,
         EXTRACT(MONTH FROM m.fecha_registro)::integer,
         'Punto materializado al registrar el cambio de aceite.')
      RETURNING id INTO programacion_id;
      estado_programacion := 'PROGRAMADO';
    ELSIF servicio_adicional THEN
      IF UPPER(COALESCE(estado_programacion,'')) <> 'EJECUTADO'
         OR mantenimiento_base IS NULL OR km_aceite IS NULL
         OR abs(m.kilometraje - km_aceite) > 500 THEN
        RAISE EXCEPTION 'El servicio adicional no está dentro de ±500 km de un punto ejecutado.';
      END IF;
    ELSE
      IF UPPER(COALESCE(estado_programacion,'')) = 'EJECUTADO' THEN
        RAISE EXCEPTION 'El punto ya está ejecutado. Registre un servicio adicional.';
      END IF;
    END IF;

    IF NOT servicio_adicional AND ciclo_num = 1 THEN
      IF NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_actividades) x
        WHERE (x.value->>'vehiculo_mantenimiento_config_id')::bigint = config_aceite_id
      ) THEN
        RAISE EXCEPTION 'P1 requiere acreditar realmente el cambio de aceite.';
      END IF;
    END IF;

    IF servicio_adicional AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_actividades) x
      WHERE (x.value->>'vehiculo_mantenimiento_config_id')::bigint = config_aceite_id
    ) THEN
      RAISE EXCEPTION 'No se puede volver a acreditar el aceite del punto ejecutado.';
    END IF;

    -- Cada actividad debe corresponder a una configuración del mismo vehículo.
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_actividades) x
      LEFT JOIN public.vehiculo_mantenimiento_config cfg
        ON cfg.id = (x.value->>'vehiculo_mantenimiento_config_id')::bigint
      WHERE cfg.id IS NULL OR cfg.vehiculo_id <> vehiculo_id
        OR cfg.actividad_id <> (x.value->>'actividad_id')::bigint
    ) THEN
      RAISE EXCEPTION 'Una actividad no pertenece a la configuración del vehículo.';
    END IF;
    m.programacion_mantenimiento_id := programacion_id;
  ELSE
    IF jsonb_array_length(p_actividades) > 0 OR jsonb_array_length(p_pendientes) > 0
       OR jsonb_array_length(p_adicionales) > 0 THEN
      RAISE EXCEPTION 'El mantenimiento correctivo no puede alterar puntos preventivos.';
    END IF;
    m.programacion_mantenimiento_id := NULL;
  END IF;

  -- UNA SOLA TRANSACCIÓN: cualquier excepción posterior revierte todo,
  -- incluida la programación materializada y sus actividades.
  INSERT INTO public.mantenimientos (
    timestamp_registro,fecha_registro,placa,kilometraje,tipo_mantenimiento,
    actividad_realizada,plan_mantenimiento_id,programacion_mantenimiento_id,
    nivel_mantenimiento,repuestos_utilizados,proveedor_id,tecnico_id,
    empresa,nit,direccion,telefono_empresa,nombres_tecnico,telefono_tecnico,
    documento_tecnico,tiempoparada,factura,valor_repuestos,valor_mano_obra,
    costo_total,responsable,documento_responsable,cargo,observaciones,origen_registro
  ) VALUES (
    COALESCE(m.timestamp_registro,ahora),m.fecha_registro,m.placa,m.kilometraje,m.tipo_mantenimiento,
    m.actividad_realizada,m.plan_mantenimiento_id,m.programacion_mantenimiento_id,
    m.nivel_mantenimiento,m.repuestos_utilizados,m.proveedor_id,m.tecnico_id,
    m.empresa,m.nit,m.direccion,m.telefono_empresa,m.nombres_tecnico,m.telefono_tecnico,
    m.documento_tecnico,m.tiempoparada,m.factura,m.valor_repuestos,m.valor_mano_obra,
    m.costo_total,m.responsable,m.documento_responsable,m.cargo,m.observaciones,
    COALESCE(m.origen_registro,'REGISTRO_MANUAL')
  ) RETURNING id INTO nuevo_id;

  IF m.tipo_mantenimiento = 'PREVENTIVO' THEN
    FOR item IN SELECT value FROM jsonb_array_elements(p_actividades)
    LOOP
      INSERT INTO public.mantenimiento_actividades_ejecutadas
        (mantenimiento_id,vehiculo_mantenimiento_config_id,actividad_id,fecha_ejecucion,km_ejecucion)
      VALUES
        (nuevo_id,(item->>'vehiculo_mantenimiento_config_id')::bigint,
         (item->>'actividad_id')::bigint,m.fecha_registro,m.kilometraje);
    END LOOP;

    -- Si el taller completó una pendiente previa, actualizar la evidencia;
    -- la descripción anterior permanece en su mantenimiento original.
    UPDATE public.mantenimiento_actividades_seguimiento s
       SET estado = 'EJECUTADA',fecha_ejecucion = m.fecha_registro,
           km_ejecucion = m.kilometraje,
           observaciones = 'Pendiente resuelta mediante mantenimiento #' || nuevo_id,
           updated_at = ahora
     WHERE s.estado = 'PENDIENTE'
       AND s.vehiculo_mantenimiento_config_id IN (
         SELECT (x.value->>'vehiculo_mantenimiento_config_id')::bigint
         FROM jsonb_array_elements(p_actividades) x
       );

    FOR item IN SELECT value FROM jsonb_array_elements(p_pendientes)
    LOOP
      config_id := (item->>'vehiculo_mantenimiento_config_id')::bigint;
      actividad_id := (item->>'actividad_id')::bigint;
      nombre_actividad := btrim(item->>'actividad_nombre');
      IF config_id IS NULL OR actividad_id IS NULL OR nombre_actividad = ''
         OR length(btrim(COALESCE(item->>'motivo',''))) = 0
         OR NOT EXISTS (
           SELECT 1 FROM public.vehiculo_mantenimiento_config c
           WHERE c.id = config_id AND c.vehiculo_id = vehiculo_id AND c.actividad_id = actividad_id
         ) THEN
        RAISE EXCEPTION 'Actividad pendiente inválida o sin justificación.';
      END IF;
      INSERT INTO public.mantenimiento_actividades_seguimiento
        (mantenimiento_id,vehiculo_mantenimiento_config_id,actividad_id,
         actividad_nombre,origen,estado,motivo,registrado_por)
      VALUES
        (nuevo_id,config_id,actividad_id,nombre_actividad,'PLAN','PENDIENTE',
         btrim(item->>'motivo'),m.responsable);
    END LOOP;

    FOR item IN SELECT value FROM jsonb_array_elements(p_adicionales)
    LOOP
      nombre_actividad := btrim(item #>> '{}');
      IF nombre_actividad = '' OR length(nombre_actividad) > 250 THEN
        RAISE EXCEPTION 'Nombre de actividad adicional inválido.';
      END IF;
      INSERT INTO public.mantenimiento_actividades_seguimiento
        (mantenimiento_id,actividad_nombre,origen,estado,
         fecha_ejecucion,km_ejecucion,registrado_por)
      VALUES
        (nuevo_id,nombre_actividad,'ADICIONAL','EJECUTADA',
         m.fecha_registro,m.kilometraje,m.responsable);
    END LOOP;

    IF NOT servicio_adicional AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_actividades) x
      WHERE (x.value->>'vehiculo_mantenimiento_config_id')::bigint = config_aceite_id
    ) THEN
      UPDATE public.programacion_mantenimiento
      SET estado='EJECUTADO',mantenimiento_id=nuevo_id,
          fecha_ejecucion=m.fecha_registro,km_ejecucion=m.kilometraje,
          updated_at=ahora
      WHERE id=programacion_id;
      GET DIAGNOSTICS n = ROW_COUNT;
      IF n <> 1 THEN RAISE EXCEPTION 'No se pudo acreditar el punto base.'; END IF;

      IF normalizacion_p1 AND ciclo_num=1 THEN
        UPDATE public.vehiculo_mantenimiento_plan_estado
           SET numero_punto_actual=1,km_referencia=m.kilometraje,
               fecha_referencia=m.fecha_registro,frecuencia_base_km=frecuencia_base,
               updated_at=ahora
         WHERE vehiculo_id=vehiculo_id AND estado='FINALIZADO';
        GET DIAGNOSTICS n=ROW_COUNT;
        IF n<>1 THEN RAISE EXCEPTION 'No se pudo fijar la referencia real de P1.'; END IF;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('id',nuevo_id,
    'programacion_mantenimiento_id',programacion_id,
    'tipo_mantenimiento',m.tipo_mantenimiento,
    'fecha_registro',m.fecha_registro,'placa',m.placa,'kilometraje',m.kilometraje);
END;
$function$;

-- Evitar acceso directo a esta operación privilegiada desde el navegador.
REVOKE ALL ON FUNCTION public.registrar_mantenimiento_atomico(jsonb,jsonb,jsonb,jsonb,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_mantenimiento_atomico(jsonb,jsonb,jsonb,jsonb,jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.registrar_mantenimiento_atomico(jsonb,jsonb,jsonb,jsonb,jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_mantenimiento_atomico(jsonb,jsonb,jsonb,jsonb,jsonb) TO service_role;
