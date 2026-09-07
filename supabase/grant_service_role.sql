-- service_role salta las reglas RLS, pero sigue necesitando el permiso base
-- de acceso a cada tabla (igual que tuvimos que dar a "anon" y
-- "authenticated" en grants.sql) — normalmente viene solo, pero al haber
-- desactivado "Automatically expose new tables" al crear el proyecto, no se
-- concedió. Esto es lo que hacía fallar a la Edge Function con "permission
-- denied" incluso usando la clave service_role correcta.
grant usage on schema public to service_role;
grant select, insert, update, delete on
    businesses, staff, shifts, staff_status_overrides, services, appointments,
    products, posts, post_media, clients
to service_role;
grant execute on function is_admin(), my_staff_id(), can_client_book(uuid, text) to service_role;
