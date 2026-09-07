-- Uso puntual: borra las citas de prueba creadas durante el desarrollo
-- (nombres que empiezan por "Test", "Cliente Prueba" o "Prueba Bandera").
-- No forma parte del esquema, ejecutar solo una vez para limpiar datos de prueba.
delete from appointments
where cliente_nombre ilike 'test%'
   or cliente_nombre ilike 'cliente prueba%'
   or cliente_nombre ilike 'prueba bandera%';
