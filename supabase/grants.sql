-- Jota Peluqueros — permisos base de acceso (Fase 1, complemento a schema.sql)
-- Necesario porque al crear el proyecto se desmarcó "Automatically expose new
-- tables" (a propósito, por seguridad) — así que hay que conceder a mano qué
-- puede tocar cada tipo de usuario. Las reglas RLS de schema.sql siguen
-- siendo las que deciden fila por fila; esto solo abre la puerta de entrada.
--
-- Ejecutar en Supabase SQL Editor DESPUÉS de schema.sql (y seed_test_data.sql).

-- "anon" = cualquier visitante de la web pública (sin haber iniciado sesión)
grant select on businesses, staff, shifts, staff_status_overrides, services, products, posts, post_media to anon;
grant select, insert on appointments to anon;

-- "authenticated" = el dueño o un peluquero con sesión iniciada (futuro Panel Jota)
-- Aquí se concede el permiso amplio; las reglas RLS ya existentes son las que
-- de verdad deciden qué puede editar cada uno (solo admin, o solo su propia fila).
grant select, insert, update, delete on
    businesses, staff, shifts, staff_status_overrides, services, appointments, products, posts, post_media
to authenticated;
