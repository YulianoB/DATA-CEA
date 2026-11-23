-- Ejecutar solo despues de corregir los cinco registros y aplicar la migracion.
-- Base CEA de la matricula 5806 (Ricardo A2).
BEGIN;
DO $control$
BEGIN
  IF (SELECT count(*) FROM public.programacion_clases p
    JOIN (VALUES (513,8),(514,9),(749,10),(750,11),(772,12)) v(id,n)
      ON p.id=v.id AND p.matricula_id=5806 AND p.categoria='A2'
      AND p.observaciones='[CEA_CLASE_PRACTICA:'||v.n||']') <> 5 THEN
    RAISE EXCEPTION 'No se puede configurar: faltan numeros corregidos.';
  END IF;
  IF EXISTS(SELECT 1 FROM public.cea_secuencia_practica_base
            WHERE matricula_id=5806 AND categoria='A2'
            AND numero_anterior_data_cea<>7) THEN
    RAISE EXCEPTION 'La base histórica ya configurada difiere de 7.';
  END IF;
END;
$control$;
INSERT INTO public.cea_secuencia_practica_base
  (matricula_id,categoria,numero_anterior_data_cea,origen)
VALUES (5806,'A2',7,'VERIFICADO_MANUAL')
ON CONFLICT(matricula_id,categoria) DO NOTHING;
INSERT INTO public.cea_auditoria_secuencia_practica
  (clase_id,matricula_id,categoria,estado_anterior,estado_nuevo,
   numero_anterior,numero_nuevo,tipo_cambio,usuario,motivo)
SELECT v.id,5806,'A2',v.estado,v.estado,v.anterior,v.nuevo,
  'REPARACION_INICIAL','MIGRACION_CONTROLADA',
  'Corrección verificada de los consecutivos sobrescritos'
FROM (VALUES
  (513,'DICTADA',1,8),(514,'DICTADA',2,9),
  (749,'AGENDADA',3,10),(750,'AGENDADA',4,11),(772,'AGENDADA',5,12)
) v(id,estado,anterior,nuevo)
WHERE NOT EXISTS (
  SELECT 1 FROM public.cea_auditoria_secuencia_practica a
  WHERE a.clase_id=v.id AND a.tipo_cambio='REPARACION_INICIAL'
);
COMMIT;
