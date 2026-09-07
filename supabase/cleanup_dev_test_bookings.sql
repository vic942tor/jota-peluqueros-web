-- Uso puntual: borra las citas de prueba creadas durante el desarrollo
-- (nombres que empiezan por "Test" o "Cliente Prueba"). No forma parte
-- del esquema, ejecutar solo una vez para limpiar datos de prueba.
delete from appointments
where cliente_nombre ilike 'test%' or cliente_nombre ilike 'cliente prueba%';
