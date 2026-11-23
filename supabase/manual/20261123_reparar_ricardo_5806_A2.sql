-- DATA CEA | Reparación puntual matrícula 5806 / categoría A2.
-- Ejecutar solo en la base Supabase de la empresa correcta.
-- Verifica fecha, hora, estado, consecutivo actual y matrícula antes de escribir.
BEGIN;
DO $reparacion$
DECLARE
  filas integer;
BEGIN
  PERFORM 1 FROM public.programacion_clases
  WHERE id IN (509,510,511,512,513,514,749,750,772)
  FOR UPDATE;

  SELECT count(*) INTO filas
  FROM public.programacion_clases p
  JOIN (VALUES
    (513, '2026-11-23'::date, '14:00:00'::time, 'DICTADA', 1),
    (514, '2026-11-23'::date, '15:00:00'::time, 'DICTADA', 2),
    (749, '2026-11-24'::date, '10:00:00'::time, 'AGENDADA', 3),
    (750, '2026-11-24'::date, '11:00:00'::time, 'AGENDADA', 4),
    (772, '2026-11-24'::date, '12:00:00'::time, 'AGENDADA', 5)
  ) e(id,fecha,hora,estado,n)
  ON p.id=e.id AND p.matricula_id=5806 AND p.categoria='A2'
    AND p.tipo_programacion='CURSO_VIGENTE'
    AND p.fecha=e.fecha AND p.hora_inicio::time=e.hora
    AND p.estado=e.estado
    AND p.observaciones='[CEA_CLASE_PRACTICA:'||e.n||']';
  IF filas<>5 THEN
    RAISE EXCEPTION 'Abortado: solo % de 5 clases coinciden con los valores verificados.',filas;
  END IF;

  SELECT count(*) INTO filas
  FROM public.programacion_clases p
  JOIN (VALUES (509,8),(510,9),(511,10),(512,11)) e(id,n)
  ON p.id=e.id AND p.matricula_id=5806 AND p.categoria='A2'
    AND p.estado='NO_DICTADA'
    AND p.observaciones='[CEA_CLASE_PRACTICA:'||e.n||']';
  IF filas<>4 THEN
    RAISE EXCEPTION 'Abortado: el historial NO_DICTADA ya no coincide con la revisión.';
  END IF;

  UPDATE public.programacion_clases p SET
    observaciones='[CEA_CLASE_PRACTICA:'||e.nuevo||']'
  FROM (VALUES (513,8),(514,9),(749,10),(750,11),(772,12)) e(id,nuevo)
  WHERE p.id=e.id AND p.matricula_id=5806 AND p.categoria='A2';
  GET DIAGNOSTICS filas=ROW_COUNT;
  IF filas<>5 THEN
    RAISE EXCEPTION 'Abortado: se actualizaron % de 5 registros.',filas;
  END IF;
END
$reparacion$;
SELECT id, fecha, hora_inicio, estado, observaciones
FROM public.programacion_clases
WHERE matricula_id=5806 AND categoria='A2'
  AND tipo_programacion='CURSO_VIGENTE'
ORDER BY fecha,hora_inicio,id;
COMMIT;
