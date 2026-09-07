-- Migración 2: columnas de traducción para contenido que escribe el dueño
-- (productos y noticias). El resto de la web (menú, textos fijos, botones)
-- ya se traduce aparte con los diccionarios de i18n/, esto es solo para lo
-- que él va escribiendo con el tiempo.
-- Ejecutar en Supabase SQL Editor después de schema.sql y grants.sql.

alter table products
    add column if not exists nombre_en text,
    add column if not exists nombre_de text,
    add column if not exists nombre_it text,
    add column if not exists descripcion text,
    add column if not exists descripcion_en text,
    add column if not exists descripcion_de text,
    add column if not exists descripcion_it text;

alter table posts
    add column if not exists titulo_en text,
    add column if not exists titulo_de text,
    add column if not exists titulo_it text,
    add column if not exists cuerpo_en text,
    add column if not exists cuerpo_de text,
    add column if not exists cuerpo_it text;
