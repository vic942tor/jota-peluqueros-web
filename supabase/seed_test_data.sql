-- Jota Peluqueros — datos de prueba (Fase 1, provisional)
-- Ejecutar en Supabase DESPUÉS de schema.sql. Solo para poder probar
-- el buscador de disponibilidad mientras no existe el Panel Jota con clics.
-- El tercer peluquero (nombre pendiente) y la dirección real del negocio
-- se añaden más adelante, esto es solo para probar el mecanismo.

-- 1. El negocio (sin dirección/teléfono todavía, la ubicación va a cambiar)
insert into businesses (nombre) values ('Jota Peluqueros');

-- 2. Los dos peluqueros de prueba
insert into staff (business_id, nombre, rol, activo)
select id, 'José', 'admin', true from businesses where nombre = 'Jota Peluqueros';

insert into staff (business_id, nombre, rol, activo)
select id, 'Ale', 'peluquero', true from businesses where nombre = 'Jota Peluqueros';

-- 3. Turnos de las próximas 8 semanas, respetando el horario real:
--    L-V: 9:00-13:00 y 15:30-19:30 · Sábado: solo 9:00-13:00 · Domingo: cerrado
--    (extract(dow): 0=domingo, 1=lunes ... 6=sábado)
with dias as (
    select d::date as fecha, extract(dow from d) as dow
    from generate_series(current_date, current_date + interval '56 days', interval '1 day') as d
),
jose as (
    select id from staff where nombre = 'José'
),
ale as (
    select id from staff where nombre = 'Ale'
)
insert into shifts (staff_id, fecha, hora_inicio, hora_fin)
-- José: mañana, lunes a sábado
select jose.id, dias.fecha, '09:00'::time, '13:00'::time
from dias, jose
where dias.dow between 1 and 6
union all
-- José: tarde, solo lunes a viernes
select jose.id, dias.fecha, '15:30'::time, '19:30'::time
from dias, jose
where dias.dow between 1 and 5
union all
-- Ale: solo tarde, lunes a viernes
select ale.id, dias.fecha, '15:30'::time, '19:30'::time
from dias, ale
where dias.dow between 1 and 5;
