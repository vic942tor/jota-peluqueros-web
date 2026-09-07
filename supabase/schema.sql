-- Jota Peluqueros — esquema inicial de base de datos (Fase 1)
-- Ejecutar completo, de una vez, en Supabase: SQL Editor > New query > pegar todo > Run

-- ============================================================
-- 1. NEGOCIO (multi-tenant: preparado para reutilizar la plantilla
--    en otros negocios en el futuro sin cambiar el modelo de datos)
-- ============================================================
create table businesses (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    direccion text,
    telefono text,
    created_at timestamptz not null default now()
);

-- ============================================================
-- 2. EMPLEADOS (incluye al dueño, con rol 'admin')
-- ============================================================
create table staff (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    nombre text not null,
    rol text not null check (rol in ('admin', 'peluquero')),
    activo boolean not null default true,
    created_at timestamptz not null default now()
);

-- Turnos por peluquero y día (editable día a día)
create table shifts (
    id uuid primary key default gen_random_uuid(),
    staff_id uuid not null references staff(id) on delete cascade,
    fecha date not null,
    hora_inicio time not null,
    hora_fin time not null,
    created_at timestamptz not null default now()
);

-- Baja/vacaciones puntual: NO borra al peluquero ni su historial,
-- solo lo oculta como reservable en ese rango de fechas
create table staff_status_overrides (
    id uuid primary key default gen_random_uuid(),
    staff_id uuid not null references staff(id) on delete cascade,
    fecha_inicio date not null,
    fecha_fin date not null,
    motivo text,
    created_at timestamptz not null default now()
);

-- ============================================================
-- 3. SERVICIOS Y CITAS
-- ============================================================
create table services (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    nombre text not null,
    categoria text,
    precio numeric(10,2),
    duracion_min integer not null default 30,
    activo boolean not null default true,
    created_at timestamptz not null default now()
);

create table appointments (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    staff_id uuid not null references staff(id),
    servicio_id uuid references services(id),
    client_id uuid,
    cliente_nombre text not null,
    cliente_telefono text not null,
    fecha date not null,
    hora_inicio time not null,
    hora_fin time not null,
    estado text not null default 'reservada'
        check (estado in ('reservada', 'completada', 'cancelada', 'no_show')),
    precio_cobrado numeric(10,2),
    creado_por text not null default 'cliente_web'
        check (creado_por in ('cliente_web', 'admin', 'peluquero')),
    created_at timestamptz not null default now(),
    -- evita que dos citas se solapen exactamente en el mismo hueco del mismo peluquero
    unique (staff_id, fecha, hora_inicio)
);

-- Ficha de cliente: junta todas las citas de la misma persona (por teléfono),
-- cuenta cuántas veces no se ha presentado, y sirve de base para limitar
-- reservas abusivas. Se enlaza sola con cada cita nueva (ver sección 6).
create table clients (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    nombre text not null,
    telefono text not null,
    no_show_count integer not null default 0,
    -- El peluquero lo activa a mano cuando pasa algo raro con el cliente
    -- (no solo no presentarse — grosero, problema al pagar, lo que sea).
    -- No bloquea nada por sí solo, solo avisa en el panel para la próxima vez.
    aviso boolean not null default false,
    notas text,
    created_at timestamptz not null default now(),
    unique (business_id, telefono)
);

alter table appointments add constraint appointments_client_id_fkey
    foreign key (client_id) references clients(id);

-- ============================================================
-- 4. STOCK / PRODUCTOS
-- ============================================================
-- El dueño escribe nombre/descripción una sola vez, en español (columnas
-- "_en"/"_de"/"_it" nulas hasta ese momento). El Panel Jota, al guardar,
-- llama a una API de traducción (DeepL o Google Cloud Translation, ambas
-- con nivel gratuito de sobra para este volumen) y rellena esas columnas
-- automáticamente — así la web no traduce nada al vuelo por cada visita.
create table products (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    nombre text not null,
    nombre_en text,
    nombre_de text,
    nombre_it text,
    descripcion text,
    descripcion_en text,
    descripcion_de text,
    descripcion_it text,
    categoria text,
    precio_venta numeric(10,2),
    stock_actual integer not null default 0,
    stock_minimo integer not null default 0,
    created_at timestamptz not null default now()
);

-- ============================================================
-- 5. CONTENIDO / NOTICIAS
-- ============================================================
create table posts (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references businesses(id) on delete cascade,
    titulo text not null,
    titulo_en text,
    titulo_de text,
    titulo_it text,
    cuerpo text,
    cuerpo_en text,
    cuerpo_de text,
    cuerpo_it text,
    publicado_en timestamptz,
    created_at timestamptz not null default now()
);

-- Cada noticia puede llevar varias fotos y/o vídeos, en el orden que se quiera
create table post_media (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references posts(id) on delete cascade,
    tipo text not null check (tipo in ('imagen', 'video')),
    url text not null,
    orden integer not null default 0,
    created_at timestamptz not null default now()
);

-- ============================================================
-- 6. FUNCIONES AUXILIARES PARA PERMISOS (roles)
-- ============================================================
-- security definer: puede leer la tabla staff aunque el que llama
-- no tenga permiso directo, para poder decidir SI tiene permiso.
create function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
    select exists (
        select 1 from staff
        where user_id = auth.uid()
        and rol = 'admin'
        and activo = true
    );
$$;

create function my_staff_id()
returns uuid
language sql
security definer
set search_path = public
as $$
    select id from staff where user_id = auth.uid() limit 1;
$$;

-- Al crear una cita, engancha (o crea) la ficha de cliente por teléfono
-- automáticamente — nadie tiene que gestionar esto a mano.
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

-- Cuenta automáticamente los "no presentado" en la ficha del cliente (el
-- peluquero marca la cita como no_show a mano; esto solo suma el contador
-- para que se vea en el panel — no bloquea nada por sí solo).
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

-- La web pública consulta esto antes de dejar confirmar una reserva: máximo
-- 5 citas por mes natural por teléfono (ajustable aquí). El contador de "no
-- presentado" NO bloquea nada automáticamente — es solo informativo, para
-- que el dueño/peluquero lo vea en el panel y decida él mismo qué hacer.
create function can_client_book(p_business_id uuid, p_telefono text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_citas_este_mes integer;
begin
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

-- ============================================================
-- 7. SEGURIDAD A NIVEL DE FILA (RLS)
-- ============================================================
alter table businesses enable row level security;
alter table staff enable row level security;
alter table shifts enable row level security;
alter table staff_status_overrides enable row level security;
alter table services enable row level security;
alter table appointments enable row level security;
alter table products enable row level security;
alter table posts enable row level security;
alter table post_media enable row level security;
alter table clients enable row level security;

-- Businesses: info pública (nombre, dirección, teléfono), solo admin edita
create policy "businesses_select_public" on businesses for select using (true);
create policy "businesses_update_admin" on businesses for update using (is_admin());

-- Staff: la web pública necesita ver quién es reservable; solo admin gestiona altas/bajas
create policy "staff_select_public" on staff for select using (true);
create policy "staff_write_admin" on staff for insert with check (is_admin());
create policy "staff_update_admin" on staff for update using (is_admin());
create policy "staff_delete_admin" on staff for delete using (is_admin());

-- Shifts: la web pública necesita los turnos para calcular disponibilidad
create policy "shifts_select_public" on shifts for select using (true);
create policy "shifts_write_admin" on shifts for insert with check (is_admin());
create policy "shifts_update_admin" on shifts for update using (is_admin());
create policy "shifts_delete_admin" on shifts for delete using (is_admin());

-- Bajas/vacaciones: público para calcular disponibilidad, solo admin las gestiona
create policy "overrides_select_public" on staff_status_overrides for select using (true);
create policy "overrides_write_admin" on staff_status_overrides for insert with check (is_admin());
create policy "overrides_update_admin" on staff_status_overrides for update using (is_admin());
create policy "overrides_delete_admin" on staff_status_overrides for delete using (is_admin());

-- Servicios: catálogo público, solo admin lo edita
create policy "services_select_public" on services for select using (true);
create policy "services_write_admin" on services for insert with check (is_admin());
create policy "services_update_admin" on services for update using (is_admin());
create policy "services_delete_admin" on services for delete using (is_admin());

-- Citas: cualquiera puede CREAR una reserva (cliente en la web),
-- pero solo el admin o el propio peluquero asignado pueden VER/EDITAR sus citas
-- (así ningún cliente puede leer el teléfono de otro cliente)
create policy "appointments_insert_public" on appointments for insert with check (true);
create policy "appointments_select_staff" on appointments for select
    using (is_admin() or staff_id = my_staff_id());
create policy "appointments_update_staff" on appointments for update
    using (is_admin() or staff_id = my_staff_id());
create policy "appointments_delete_admin" on appointments for delete using (is_admin());

-- Productos: catálogo visible en la web, solo admin edita stock
create policy "products_select_public" on products for select using (true);
create policy "products_write_admin" on products for insert with check (is_admin());
create policy "products_update_admin" on products for update using (is_admin());
create policy "products_delete_admin" on products for delete using (is_admin());

-- Noticias: público ve solo lo publicado, admin ve y gestiona todo
create policy "posts_select_public" on posts for select
    using (publicado_en is not null or is_admin());
create policy "posts_write_admin" on posts for insert with check (is_admin());
create policy "posts_update_admin" on posts for update using (is_admin());
create policy "posts_delete_admin" on posts for delete using (is_admin());

-- Clientes: son datos personales, nadie anónimo los lee directamente (solo a
-- través de can_client_book(), que solo devuelve un true/false). Cualquier
-- peluquero con sesión (no solo el admin) puede ver y activar el aviso de
-- "cliente con algo raro" — así, cuando esa persona vuelva a reservar, quien
-- vea la cita en el panel lo sabe, sin que tenga que enterarse solo el dueño.
create policy "clients_select_staff" on clients for select using (true);
create policy "clients_write_admin" on clients for insert with check (is_admin());
create policy "clients_update_staff" on clients for update using (true);
create policy "clients_delete_admin" on clients for delete using (is_admin());

-- Fotos/vídeos de noticias: mismas reglas de visibilidad que la noticia a la que pertenecen
create policy "post_media_select_public" on post_media for select
    using (
        exists (
            select 1 from posts
            where posts.id = post_media.post_id
            and (posts.publicado_en is not null or is_admin())
        )
    );
create policy "post_media_write_admin" on post_media for insert with check (is_admin());
create policy "post_media_update_admin" on post_media for update using (is_admin());
create policy "post_media_delete_admin" on post_media for delete using (is_admin());

-- ============================================================
-- 8. DATOS INICIALES
-- ============================================================
-- La dirección actual (San Felipe / La Centinela) es la del local que va a
-- desaparecer, así que no se inserta ningún negocio todavía. En cuanto se
-- confirme la ubicación nueva, se añade con un INSERT o desde el panel.
