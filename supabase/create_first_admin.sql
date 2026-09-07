-- Crea la ficha "admin admin", enlazada a la cuenta de acceso ya existente
-- en Authentication → Users (creada anteriormente).
insert into staff (business_id, user_id, nombre, rol, activo)
select id, 'dee4d718-db31-49ab-9524-20610c391111', 'admin admin', 'admin', true
from businesses
limit 1;
