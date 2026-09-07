-- Vacía la tabla staff y todo lo que depende de ella (turnos, bajas, citas
-- de prueba). Solo datos de desarrollo — nada de esto es real todavía.
-- CASCADE también vacía "appointments" porque tiene una columna que
-- referencia a staff, aunque su relación no sea "on delete cascade".
truncate staff cascade;
