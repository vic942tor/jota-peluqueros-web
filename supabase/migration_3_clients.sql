-- Migración 3: ficha de cliente, límite de reservas por mes y bloqueo por
-- no presentarse. Ejecutar en Supabase SQL Editor después de las migraciones
-- anteriores.
--
-- Qué resuelve:
-- - Ficha de cliente que junta todas sus citas (antes cada cita solo guardaba
--   nombre/teléfono sueltos, sin relación entre visitas de la misma persona).
-- - Un cliente no puede reservar más de N citas en el mismo mes (evita que
--   alguien reviente la agenda a base de reservas, "el gracioso de las 500
--   reservas" que se comentó al principio del proyecto).
-- - Cuando un peluquero marca una cita como "no_show" (el cliente no vino y
--   no avisó), se cuenta automáticamente; a partir de cierto número de
--   no-shows, ese teléfono deja de poder reservar solo por la web (tendría
--   que llamar y que se lo gestione el propio negocio).

-- ============================================================
-- 1. TABLA DE CLIENTES
-- ============================================================
create table clients (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    nombre text not null,
    telefono text not null,
    no_show_count integer not null default 0,
    notas text,
    created_at timestamptz not null default now(),
    unique (business_id, telefono)
);

alter table appointments add column if not exists client_id uuid references clients(id);

-- ============================================================
-- 2. ENLAZAR CADA CITA CON SU FICHA DE CLIENTE AUTOMÁTICAMENTE
-- ============================================================
-- Al crear una cita, si ese teléfono ya existe como cliente se reutiliza su
-- ficha (y se actualiza el nombre, por si lo escribió distinto esta vez);
-- si no existe, se crea. El cliente/la web nunca gestionan esto a mano.
create function link_appointment_to_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_client_id uuid;
begin
    insert into clients (business_id, nombre, telefono)
    values (new.business_id, new.cliente_nombre, new.cliente_telefono)
    on conflict (business_id, telefono)
    do update set nombre = excluded.nombre
    returning id into v_client_id;

    new.client_id := v_client_id;
    return new;
end;
$$;

create trigger trg_link_appointment_to_client
    before insert on appointments
    for each row execute function link_appointment_to_client();

-- ============================================================
-- 3. CONTAR AUTOMÁTICAMENTE LOS "NO PRESENTADO"
-- ============================================================
create function bump_no_show_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.estado = 'no_show' and old.estado is distinct from 'no_show' and new.client_id is not null then
        update clients set no_show_count = no_show_count + 1 where id = new.client_id;
    end if;
    return new;
end;
$$;

create trigger trg_bump_no_show_count
    after update on appointments
    for each row execute function bump_no_show_count();

-- ============================================================
-- 4. COMPROBACIÓN QUE LA WEB CONSULTA ANTES DE DEJAR RESERVAR
-- ============================================================
-- security definer: puede consultar clients/appointments aunque quien
-- llama (un visitante anónimo) no tenga permiso de leer esas tablas
-- directamente — solo se le devuelve un true/false, nunca los datos.
--
-- Límites por defecto: máximo 5 citas por mes natural, bloqueado a partir
-- de 2 "no presentado" acumulados. Ajustables aquí si el dueño quiere otros
-- números en el futuro.
create function can_client_book(p_business_id uuid, p_telefono text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_no_shows integer;
    v_citas_este_mes integer;
begin
    select no_show_count into v_no_shows
    from clients
    where business_id = p_business_id and telefono = p_telefono;

    if v_no_shows is not null and v_no_shows >= 2 then
        return false;
    end if;

    select count(*) into v_citas_este_mes
    from appointments
    where business_id = p_business_id
      and cliente_telefono = p_telefono
      and estado in ('reservada', 'completada')
      and date_trunc('month', fecha) = date_trunc('month', current_date);

    if v_citas_este_mes >= 5 then
        return false;
    end if;

    return true;
end;
$$;

grant execute on function can_client_book(uuid, text) to anon, authenticated;

-- ============================================================
-- 5. SEGURIDAD DE LA NUEVA TABLA
-- ============================================================
alter table clients enable row level security;

-- Nadie anónimo puede leer/escribir fichas de cliente directamente (son
-- datos personales) — solo el admin, y solo a través de can_client_book()
-- para la comprobación pública de arriba. Un peluquero normal no necesita
-- ver la ficha completa de clientes para marcar sus propias citas: le basta
-- con el nombre/teléfono que ya lleva cada cita en la tabla appointments.
create policy "clients_select_admin" on clients for select using (is_admin());
create policy "clients_write_admin" on clients for insert with check (is_admin());
create policy "clients_update_admin" on clients for update using (is_admin());
create policy "clients_delete_admin" on clients for delete using (is_admin());

grant select, insert, update, delete on clients to authenticated;
