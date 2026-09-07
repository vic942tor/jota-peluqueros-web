-- Uso puntual: borra las citas y fichas de cliente de prueba creadas durante
-- el desarrollo. No forma parte del esquema, ejecutar solo una vez.
delete from appointments
where cliente_nombre ilike 'test%'
   or cliente_nombre ilike 'cliente prueba%'
   or cliente_nombre ilike 'prueba bandera%';

delete from clients
where nombre ilike 'test%'
   or nombre ilike 'cliente prueba%'
   or nombre ilike 'prueba bandera%';
