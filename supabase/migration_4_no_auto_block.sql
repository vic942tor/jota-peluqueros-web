-- Migración 4: quita el bloqueo automático por "no presentado".
-- El contador de no-shows se sigue sumando en la ficha del cliente (el
-- peluquero marca la cita como no_show a mano, eso no cambia), pero ya NO
-- bloquea reservas por sí solo — es solo informativo para el panel. Lo único
-- que sigue limitando reservas online es el máximo de 5 citas por mes.
-- Ejecutar en Supabase SQL Editor después de migration_3_clients.sql.

create or replace function can_client_book(p_business_id uuid, p_telefono text)
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
