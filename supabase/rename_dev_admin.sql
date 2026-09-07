-- Corrige el nombre de la ficha de admin que se acaba de enlazar: se queda
-- como cuenta de desarrollo/soporte, no como el José real (que se creará
-- más adelante como peluquero de verdad).
update staff
set nombre = 'admin admin'
where user_id = 'dee4d718-db31-49ab-9524-20610c391111';
