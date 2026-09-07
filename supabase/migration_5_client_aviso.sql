-- Migración 5: aviso manual en la ficha de cliente ("algo raro con este
-- cliente", no solo no presentarse) + permiso para que cualquier peluquero
-- con sesión (no solo el dueño) pueda verlo y activarlo.
-- Ejecutar en Supabase SQL Editor después de las migraciones anteriores.

alter table clients add column if not exists aviso boolean not null default false;

drop policy if exists "clients_select_admin" on clients;
drop policy if exists "clients_update_admin" on clients;

create policy "clients_select_staff" on clients for select using (true);
create policy "clients_update_staff" on clients for update using (true);
