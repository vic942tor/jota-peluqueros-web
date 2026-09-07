-- Vuelve a crear la ficha de José como peluquero (la anterior pasó a ser la
-- cuenta genérica "admin admin"). Sin usuario de acceso enlazado todavía —
-- se enlaza más adelante cuando José tenga su propio email/contraseña.
insert into staff (business_id, nombre, rol, activo)
select id, 'José', 'peluquero', true
from businesses
limit 1;
