# Arquitectura del sistema Jota Peluqueros (v2)

Este documento define cómo se construye el sistema completo: web pública + gestión para el dueño + gestión para cada peluquero + backend/BD central. Sustituye al software antiguo "Steel Wing".

No hay código de esto todavía — es la base para empezar a construir. Nada aquí está commiteado/pusheado (regla del proyecto: eso lo hace el dueño del repo).

---

## 1. Decisión clave: UNA sola app, no tres

El pedido original habla de "web pública + app de escritorio + app móvil". Construir tres aplicaciones nativas separadas (una web, una de escritorio tipo Electron, una móvil tipo iOS/Android nativa) triplica el mantenimiento para un negocio que:

- No tiene perfil técnico (cada app nueva es una superficie más para que algo se rompa y nadie sepa arreglarlo).
- Quiere reutilizar esto como plantilla para otros negocios (tres codebases = tres veces el trabajo de adaptar).
- No tiene servidor propio (pagar hosting para tres despliegues distintos es más caro y más complejo de explicar).

**Decisión: construir una única aplicación web de gestión ("Panel Jota"), responsive, que funciona como PWA (Progressive Web App).**

Una PWA es una web normal que el navegador permite "instalar" — se abre como una app con su propio icono, sin barra de direcciones, tanto en el móvil (Android y iOS) como en el ordenador (Windows/Mac vía Chrome/Edge). Para el dueño y los peluqueros es indistinguible de una app de verdad, pero es **un solo código fuente**, un solo despliegue, y las actualizaciones llegan solas (no hay que "instalar una versión nueva" desde ninguna tienda).

Esto cubre los puntos 2 y 3 del pedido (app de escritorio + app móvil) con una sola pieza. Notificaciones push funcionan igual vía Web Push (Android sin problema; iOS 16.4+ también lo soporta ya).

Resultado: **dos aplicaciones, no tres**:
1. **Sitio público** (`jotapeluqueros.com`) — lo que ya existe hoy, ampliado con reservas reales.
2. **Panel Jota** (`panel.jotapeluqueros.com` o subcarpeta `/panel`) — la app de gestión, con vistas distintas según el rol (dueño/administrador vs peluquero), instalable como PWA en el móvil de cada peluquero y en el ordenador del dueño.

Ambas comparten el mismo backend.

---

## 2. Stack elegido

| Pieza | Elección | Por qué |
|---|---|---|
| Base de datos + backend | **Supabase** (Postgres gestionado + Auth + Storage + Realtime) | No hay servidor que mantener — es hosting externo tal como se necesita. Tiene plan gratuito generoso y de pago barato cuando crezca. Auth con roles y seguridad a nivel de fila (RLS) resuelve el sistema de permisos sin escribir un backend de autenticación desde cero. Realtime resuelve "otro peluquero ve la cita liberada al instante" sin trabajo extra. |
| Sitio público | Seguir con **HTML/CSS/JS estático** (lo que ya hay) + llamadas directas a Supabase desde el navegador para el buscador de disponibilidad y la reserva | No hace falta reescribir el sitio ya construido. Se le añade un módulo de reservas propio que sustituye a Cal.com. |
| Panel Jota (gestión) | **Next.js** (React) desplegado en Vercel, con soporte PWA | Mismo hosting que ya usan (Vercel), un solo framework para dashboard + formularios + gráficos, con buen soporte de PWA y de componentes ricos (calendarios, gráficos) que en HTML/JS plano sería mucho más trabajo mantener a mano. |
| Gráficos del dashboard | **Recharts** o similar sobre React | Gráficos simples y visuales (barras, líneas) — nada de tablas crudas, tal como pide el dueño. |
| Notificaciones | **Web Push** (integrado en la PWA) para peluqueros/dueño; email para clientes (ya en marcha); SMS/WhatsApp para clientes: pendiente de decidir, no bloquea el resto | Evita depender de plan de pago de Cal.com u otro proveedor solo para esto. |

**Multi-tenant desde el primer día:** cada tabla de la base de datos lleva una columna `business_id`. Hoy solo existirá una fila en `businesses` (Jota Peluqueros), pero esto es lo que permite clonar el sistema para otro negocio cambiando datos, no código — cumple el "objetivo técnico adicional" de reutilización sin rehacer nada.

---

## 3. Modelo de datos (entidades principales)

```
businesses
  id, nombre, dirección, teléfono, horario_apertura...

staff (peluqueros, incluye al dueño)
  id, business_id, nombre, rol ('admin' | 'peluquero'),
  activo (bool), user_id (vínculo a Supabase Auth)

shifts (turnos por peluquero y día — editable día a día)
  id, staff_id, fecha, hora_inicio, hora_fin

staff_status_overrides (baja/vacaciones puntual)
  id, staff_id, fecha_inicio, fecha_fin, motivo
  → si hay un override activo, ese peluquero no aparece como reservable
    en la web ESE rango de fechas, sin tocar su ficha ni su historial

services (catálogo, precios)
  id, business_id, nombre, categoría, precio, duración_min

appointments (citas)
  id, business_id, staff_id, cliente_nombre, cliente_teléfono,
  fecha, hora_inicio, hora_fin, estado ('reservada'|'completada'|'cancelada'|'no_show'),
  servicio_id (el que se cobró realmente, puede diferir del reservado),
  precio_cobrado, creado_por ('cliente_web'|'admin'|'peluquero')

products (stock)
  id, business_id, nombre, categoría, precio_venta, stock_actual, stock_mínimo

posts (noticias/contenido web)
  id, business_id, título, cuerpo, imagen, publicado_en
```

Puntos importantes que ya estaban en el pedido y quedan resueltos con este modelo:
- **"Qué servicio se cobró y qué peluquero atendió"** → van directamente en `appointments` (`servicio_id`, `precio_cobrado`, `staff_id`), no se infiere después. El dashboard lee de aquí directamente.
- **Disponibilidad real en la web** → se calcula cruzando `shifts` (turno de ese día) menos `staff_status_overrides` (de baja) menos huecos ya ocupados en `appointments`.
- **Baja/vacaciones sin borrar historial** → `staff_status_overrides` es una tabla aparte, nunca se toca ni se borra la fila de `staff` ni sus `appointments` pasadas.

---

## 4. Roles y permisos

Con Supabase Auth + Row Level Security (RLS), las reglas de negocio se aplican directamente en la base de datos, no solo en la app — así un peluquero nunca puede ver ni editar lo que no le toca, ni siquiera manipulando la app:

- **Admin (dueño):** acceso total — todas las citas, altas/bajas de empleados, turnos, stock, contenido web, sus propias citas como peluquero activo.
- **Peluquero:** por defecto solo ve/edita sus propias citas (`staff_id = su propio id`). Marca sus servicios como completados desde el móvil.
- **Cobertura de emergencia:** un peluquero puede ver las citas de sus compañeros marcadas como "necesita cobertura" y asignárselas. **Pendiente de confirmar con el dueño:** ¿libre entre peluqueros o requiere aprobación del admin? — el modelo de datos soporta ambos (se puede añadir un estado intermedio `cobertura_pendiente_aprobación` sin cambiar nada más), así que no bloquea empezar a construir.

---

## 5. Migración desde Steel Wing

Antes de dar de baja Steel Wing hace falta:
1. Confirmar en qué formato exporta datos (¿CSV? ¿una base de datos local tipo Access/SQLite? ¿no exporta nada y hay que pedirlo por soporte?).
2. Revisar sus pantallas/flujos (aunque sea con capturas o una sesión compartida) para no dejar fuera algo que el dueño usa a diario y da por hecho.
3. Si hay datos históricos de clientes/citas migrables, escribir un script de importación puntual (no se integra Steel Wing en marcha, es una migración de una sola vez).

Esto no bloquea empezar a construir — se puede avanzar en paralelo y hacer la importación al final, justo antes de apagar Steel Wing.

---

## 6. Fases de construcción propuestas

1. **Backend**: crear el proyecto Supabase, definir las tablas de la sección 3, activar RLS con los roles de la sección 4.
2. **Panel Jota — gestión de empleados y turnos**: la pieza de la que depende todo lo demás (disponibilidad real).
3. **Sitio público — módulo de reservas propio**: sustituye a Cal.com, lee turnos/disponibilidad reales de Supabase, cliente elige peluquero + hora.
4. **Panel Jota — agenda del peluquero y del admin, marcar citas completadas** (aquí ya se empieza a registrar `servicio_id` + `precio_cobrado` por cita).
5. **Panel Jota — dashboard con gráficos** (una vez hay datos reales de citas completadas).
6. **Stock/productos** — vincula con la página `productos.html` ya existente.
7. **Contenido/noticias** desde el panel.
8. **PWA + notificaciones push**, instalación en los móviles de cada peluquero.
9. **Migración de datos de Steel Wing** (en paralelo, cuando el dueño consiga los datos/acceso).

---

## 7. Pendiente de confirmar con el dueño (sin bloquear el inicio)

Datos legales, ubicación, contenido y pagos (8 puntos que hay que preguntarle en persona):
- NIF/CIF del negocio, email de contacto oficial y forma jurídica (¿"Jota Peluqueros" tal cual, autónomo a su nombre, u otra razón social?) — necesarios para terminar el aviso legal y la política de privacidad.
- Dirección definitiva del local (la actual, San Felipe/La Centinela, va a cambiar).
- Precios definitivos de sus servicios.
- Fotos reales: local, equipo, trabajos realizados.
- Redes sociales, si tiene, para enlazarlas en el footer.
- Cómo funciona exactamente el datáfono (standalone o con alguna integración) — de momento se asume standalone, sin integración de pagos en el sistema.

Tarea aparte del desarrollador (no es pregunta para el dueño):
- Revisar en persona el propio Steel Wing para ver si permite exportar el histórico de clientes/citas, y en qué formato.

Decisiones ya tomadas (no hace falta volver a preguntarlas):
- **Catálogo de productos: sin venta online**, solo informativo. Lo carga el desarrollador y luego el propio dueño desde el Panel Jota, a mano, según va habiendo productos nuevos.
- **Reasignación de citas de emergencia entre peluqueros**: el propio dueño la configura desde el Panel Jota cuando lo use — no es una pregunta a hacer ahora, es un ajuste operativo suyo del día a día.
- **Notificaciones por WhatsApp/SMS para clientes**: sí, se activará más adelante (aplazado solo por el coste del plan de pago necesario, no por falta de interés).
- **Analítica de visitas a la web**: hecho — **Cloudflare Web Analytics** (gratis siempre, sin cookies, sin banner de consentimiento necesario), script instalado en todas las páginas del sitio. En el Panel Jota, en vez de que el dueño tenga que entrar a la web de Cloudflare aparte, el dashboard puede traer esos mismos datos (visitas, países, páginas más vistas) mediante la **GraphQL Analytics API de Cloudflare** (necesita un token — la llamada se hace desde el backend del Panel Jota, no desde el navegador, igual que con las traducciones) y mostrarlos integrados junto a las citas y los beneficios.
- **Cálculo de beneficios semanales**: pendiente de detallar la fórmula exacta con el desarrollador (quien ya tiene claro el criterio del dueño), no requiere pregunta adicional en la reunión.

---

## 8. Qué NO cambia del sitio actual

`index.html`, `productos.html`, partials, `css/style.css` y los módulos en `js/` siguen siendo la base del sitio público — no se reescribe desde cero. Se les añade un módulo de reservas propio (sección 6, fase 3) que sustituirá al `<script>` de Cal.com. El resto del sitio (diseño, textos, estructura) no se toca por este cambio de arquitectura.

---

## 9. Idiomas (i18n)

El sitio tiene dos tipos de contenido, y cada uno se traduce de una forma distinta:

- **Texto fijo de la interfaz** (menú, botones, títulos de sección, el propio modal de reservas): vive en diccionarios estáticos `i18n/es.json`, `en.json`, `de.json`, `it.json`, aplicados por `js/i18n.js` mediante atributos `data-i18n` en el HTML. Esto ya está construido y funcionando — español por defecto, con selector ES/EN/DE/IT en el header (recuerda la elección en `localStorage`).
- **Contenido que escribe el dueño** (productos y noticias — lo único que no es texto fijo del diseño): se traduce automáticamente una sola vez, en el momento en que él lo guarda desde el Panel Jota, llamando a una API de traducción (DeepL o Google Cloud Translation — ambas con nivel gratuito de sobra para el volumen de un negocio así, ver cálculo más abajo). El resultado se guarda ya traducido en columnas `_en`/`_de`/`_it` de las tablas `products` y `posts` (ver `supabase/migration_2_i18n_content.sql`), así la web pública nunca traduce nada al vuelo por cada visita — solo lee lo que ya está guardado.

**Por qué en el momento de guardar y no al mostrar la página:** traducir cada vez que alguien visita la web sería más lento (una llamada a una API externa por cada carga) y multiplicaría el gasto por cada visita repetida al mismo producto. Traduciendo una vez al guardar, el coste es prácticamente cero y la web sigue siendo tan rápida como ahora.

**Cálculo de consumo (para no preocuparse por el límite gratis):** un producto con una descripción de 4 líneas (~280 caracteres) traducido a 3 idiomas consume ~800-900 caracteres — con el límite gratis de ambas APIs (500.000 caracteres/mes) caben más de 500 productos nuevos en el mismo mes. Una noticia con un párrafo (~500 caracteres) consume ~1.500 caracteres traducida a los 3 idiomas. Con el volumen real de la peluquería (unos pocos productos fijos, alguna noticia puntual), esto se queda en un pequeño porcentaje del límite gratis, de forma permanente.

Pendiente para cuando se construya esa parte del Panel Jota: decidir DeepL vs Google Cloud Translation (DeepL da mejor calidad en estos 4 idiomas europeos) y dónde vive la llamada a la API (tiene que ser en un sitio con backend, porque la clave de la API es secreta — no puede ir en el navegador).
