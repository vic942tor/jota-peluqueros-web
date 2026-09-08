# Jota Peluqueros — Sistema completo

Sistema de gestión para la peluquería **Jota Peluqueros** (Icod de los Vinos, Tenerife): sitio web público con reservas online propias, panel de gestión para el dueño y los peluqueros, y una base de datos central que conecta todo (reservas, turnos, empleados, stock y contenido). Pensado desde el diseño para poder clonarse como plantilla para otros negocios similares.

**Producción:** desplegado en [Vercel](https://vercel.com) desde este repositorio (auto-deploy en cada push a `main`).

---

## Tecnologías utilizadas

| Capa | Tecnología | Uso |
|---|---|---|
| Sitio público | **HTML5 + CSS3 + JavaScript (ES6+) vanilla** | Sin build, sin bundler, sin frameworks (no React/Vue en el sitio público) — módulos ES nativos del navegador |
| Backend / base de datos | **[Supabase](https://supabase.com)** (Postgres gestionado) | Base de datos central, API REST autogenerada, autenticación y seguridad a nivel de fila |
| Seguridad de datos | **Row Level Security (RLS) de Postgres** | Cada tabla tiene reglas propias: qué puede ver/editar un cliente anónimo, un peluquero o el administrador |
| Reservas | **Sistema propio**, sin proveedor externo | Consulta disponibilidad real (turnos, bajas, citas ya ocupadas) directamente contra Supabase desde el navegador |
| Panel de gestión ("Panel Jota") | **Next.js (React) + Supabase**, desplegado en Vercel, instalable como **PWA** | Un único panel responsive que funciona como app de escritorio (dueño) y app móvil (cada peluquero), sin mantener tres apps distintas |
| Gráficos del dashboard | **Recharts** (sobre React) | Estadísticas visuales: servicios más pedidos, citas por peluquero, evolución del negocio |
| Notificaciones | **Web Push** (integradas en la PWA) para peluqueros/dueño, email para clientes | Sin depender de un plan de pago de terceros |
| Mapa | Google Maps embebido (`<iframe>`, sin API key) | — |
| Hosting | **Vercel** | Sitio público y Panel Jota, ambos desde este mismo repositorio |

El sitio público no requiere `npm install` ni compilación: es HTML/CSS/JS servido tal cual. El Panel Jota sí usa Next.js (ver su propia carpeta cuando esté integrada en este repo).

---

## Arquitectura del sistema

Todo el sistema gira en torno a **una única base de datos en Supabase**, que es la fuente de verdad para citas, empleados, turnos, stock y contenido. De ahí cuelgan dos aplicaciones:

1. **Sitio público** (este repositorio, raíz): información del negocio + sistema de reservas propio. Lee y escribe directamente en Supabase desde el navegador del cliente, usando la clave pública (`anon`) — segura de exponer porque las reglas RLS son las que de verdad deciden qué se puede hacer, no la clave.
2. **Panel Jota**: la aplicación de gestión, con vistas distintas según el rol de quien entra:
   - **Administrador** (el dueño, que también es peluquero activo): ve y controla todas las citas, empleados, turnos, stock y contenido de la web.
   - **Peluquero**: ve y gestiona solo sus propias citas por defecto, con opción de cubrir una cita de un compañero en caso de emergencia.

Multi-tenant desde el modelo de datos (`business_id` en cada tabla): aunque hoy solo gestiona un negocio, la misma base y el mismo código sirven para clonar el sistema a otra peluquería cambiando datos, no código.

---

## Base de datos (Supabase / Postgres)

Esquema completo en `supabase/sql/schema.sql`, dentro del repo privado `jota-peluqueros-app` (no aquí — este repo es público), con seguridad a nivel de fila (RLS) definida junto a cada tabla:

| Tabla | Contenido |
|---|---|
| `businesses` | El negocio: nombre, dirección, teléfono |
| `staff` | Peluqueros (incluido el dueño), con rol (`admin` / `peluquero`) y si está activo |
| `shifts` | Turnos: qué peluquero trabaja qué día y en qué horas — la disponibilidad real de la web sale de aquí |
| `staff_status_overrides` | Bajas/vacaciones puntuales, sin borrar al peluquero ni su historial |
| `services` | Catálogo de servicios y precios |
| `appointments` | Citas: cliente, peluquero, fecha/hora, y qué servicio se cobró realmente (para el dashboard) |
| `products` | Stock de productos a la venta en el local |
| `posts` / `post_media` | Noticias del negocio, con varias fotos y/o vídeos por noticia |

**Reglas de acceso (RLS):** cualquier visitante puede leer horarios/peluqueros/servicios y crear una reserva, pero no puede ver ni editar citas ajenas (ni el teléfono de otro cliente). Solo el administrador puede gestionar empleados, turnos, stock y contenido. Estas reglas se aplican en la propia base de datos, no en el código de la web — no dependen de que nadie manipule el navegador.

Scripts auxiliares (`grants.sql`, `seed_test_data.sql`, migraciones) también en el repo privado, en `supabase/sql/`.

---

## Estructura de archivos

```
.
├── index.html            # Página principal (inicio, conócenos, servicios, galería, ubicación)
├── productos.html        # Página de catálogo de productos
├── partials/
│   ├── header.html        # Header + nav, inyectado por JS en cada página
│   ├── footer.html        # Footer, inyectado por JS en cada página
│   └── booking-modal.html # Modal de reservas, inyectado por JS en cada página
├── css/
│   └── style.css         # Todos los estilos, con custom properties en :root (compartido)
├── js/
│   ├── main.js              # Punto de entrada: orquesta el resto de módulos
│   ├── partials.js          # Carga header/footer/modal de reservas vía fetch() en cada página
│   ├── nav.js                # Menú móvil + resolución de enlaces de ancla entre páginas
│   ├── carousel.js           # Carrusel de la galería
│   ├── reveal.js              # Animación de aparición al hacer scroll (IntersectionObserver)
│   ├── supabaseClient.js     # Cliente de Supabase configurado (URL + clave pública)
│   └── booking.js             # Sistema de reservas propio: disponibilidad, selección y confirmación
├── img/
│   ├── logo.png         # Logo de marca, usado en header, hero y footer
│   └── favicon-*.png
├── ARCHITECTURE.md       # Diseño completo del sistema (backend, roles, fases de construcción)
└── .gitignore
```

No hay carpeta `dist`/`build` para el sitio público: cada `.html` es un punto de entrada servido directamente, y los módulos JS se cargan como ES modules nativos del navegador (`<script type="module">`).

---

## Cómo correrlo en local

Al ser estático, cualquier servidor HTTP local vale:

```bash
# Python (sin dependencias)
python -m http.server 5173

# Node (si tienes npx)
npx serve .
```

Luego abrir `http://localhost:5173`. **`file://` no funciona**: `js/partials.js` usa `fetch()` para cargar los partials, y los navegadores bloquean `fetch` sobre `file://` por CORS. Sin servidor HTTP, la página cargará sin header, footer ni modal de reservas.

---

## Sistema de diseño

Definido en `:root` en `css/style.css`, tema **claro** con acento **gris azulado**, fiel a los colores reales del local renovado (grisáceo azulado, blanco y negro):

```css
--color-bg: #F2F4F6;
--color-bg-alt: #E6EAEE;
--color-card: #FFFFFF;
--color-text: #1C2126;
--color-muted: #5B6672;
--color-border: #D8DEE3;
--color-accent: #3E4C5E;       /* gris azulado — CTA principal, botón "Pide tu cita" */
--color-accent-hover: #2E3946;
--color-brand-accent: #7B8A99; /* gris azulado más claro — acentos secundarios */
--color-brand-dark: #2B3542;   /* franja oscura de header/hero/footer, para que el logo destaque */
--color-text-inverse: #F3F5F7;
--color-muted-inverse: #9AA5B0;
--radius: 12px;
--font-serif: Georgia, 'Times New Roman', Times, serif;
--ease-fine: cubic-bezier(0.22, 1, 0.36, 1);
```

El sitio combina dos superficies a propósito: la mayor parte es clara (blanco/gris azulado muy claro, texto oscuro), y el header, el hero y el footer usan una franja oscura gris azulado (`--color-brand-dark`) para que el logo (con el texto "Jota" en blanco) se lea bien sin necesitar ninguna caja o placa de fondo — el propio logo, con fondo transparente, se apoya directamente sobre esa franja.

Tipografía: fuente del sistema para el cuerpo, serif (`--font-serif`) para titulares — sin fuentes externas cargadas, por rendimiento. El **modal de reservas** es una tarjeta clara (blanco) con horas en píldoras redondeadas y peluqueros como avatares circulares con inicial — el mismo lenguaje visual que usan los widgets de reserva de referencia del sector (Booksy y similares).

---

## Arquitectura de partials y JS (sitio público)

Patrón vanilla deliberadamente simple, sin framework ni SSG:

1. Cada página HTML tiene contenedores vacíos: `#site-header-slot`, `#site-footer-slot`, y el modal de reservas se inyecta directamente en `<body>`.
2. `js/main.js` importa y ejecuta, en orden:
   1. `loadPartials()` — `fetch()` de header, footer y modal de reservas, inyectados en el DOM. `async`/`await`, así que todo lo siguiente espera a que ya existan.
   2. `initNav()` — resuelve los enlaces `[data-anchor]` (ver abajo), engancha el menú móvil, marca la página activa.
   3. `initCarousel()` — no hace nada si la página no tiene `#carouselTrack` (p. ej. `productos.html`).
   4. `initReveal()` — animaciones de scroll.
   5. `initBooking()` — engancha el botón "Pide tu cita" al modal de reservas y toda su lógica de disponibilidad.

### Enlaces de ancla entre páginas (`[data-anchor]`)
Los enlaces del header/footer a secciones (`Conócenos`, `Servicios`...) llevan `data-anchor="servicios"` en vez de un `href` fijo, y `initNav()` decide el destino real: `#servicios` si ya estás en `index.html`, o `index.html#servicios` desde otra página.

### Animaciones de scroll (`[data-reveal]`)
Cualquier elemento con `data-reveal` se anima con *fade + slide-up* la primera vez que entra en el viewport (`IntersectionObserver`). *Progressive enhancement*: por defecto el contenido está siempre visible; solo si el JS corre y el usuario no tiene `prefers-reduced-motion`, se anima.

---

## Sistema de reservas propio

**No depende de ningún proveedor externo** (no Cal.com, no Booksy) — la disponibilidad, la reserva y la seguridad de los datos son propias, resueltas contra Supabase.

**Flujo del cliente** (`js/booking.js`, modal en `partials/booking-modal.html`), inspirado en el orden de pasos de los widgets de reserva de referencia del sector:

1. **Fecha** — selector nativo (`<input type="date">`, se abre al pulsar en cualquier parte del campo, no solo el icono).
2. **Hora** — se calculan en el momento todas las franjas de 30 minutos realmente libres ese día, cruzando `shifts` (turnos), `staff_status_overrides` (bajas) y `appointments` (huecos ya ocupados). Se muestran como píldoras.
3. **Peluquero** — tras elegir hora, se muestran únicamente los peluqueros libres justo en esa franja (avatar con inicial), con "Cualquiera disponible" seleccionado por defecto.
4. **Nombre y teléfono** — el email nunca es obligatorio para el cliente.
5. **Confirmar** — inserta la cita directamente en la tabla `appointments`. Una restricción `unique(staff_id, fecha, hora_inicio)` en la base de datos impide que dos clientes reserven el mismo hueco aunque confirmen a la vez; si eso ocurre, se avisa y se refresca la disponibilidad automáticamente.

El único disparador de reservas en toda la web es el botón **"Pide tu cita"** del header (`#bookingTrigger`, en el partial compartido) — no hay botones duplicados ni redirecciones a una sección aparte.

### Seguridad
La web usa la clave pública (`anon`) de Supabase en `js/supabaseClient.js` — segura de tener visible en el código, porque las reglas RLS (ver sección de base de datos) son las que de verdad deciden qué puede hacer cada petición, no la clave en sí. Un cliente puede crear una reserva pero nunca leer las citas ni los teléfonos de otros clientes.

---

## Panel Jota (gestión)

Aplicación única en **Next.js + Supabase**, desplegada en Vercel, instalable como **PWA** tanto en el ordenador del dueño como en el móvil de cada peluquero — una sola aplicación en vez de mantener una web de escritorio y una app móvil por separado.

- **Rol administrador** (el dueño): altas/bajas de peluqueros, gestión de turnos día a día, gestión de stock, publicación de contenido/noticias (con fotos y vídeos), y visión completa de todas las citas del negocio.
- **Rol peluquero**: agenda propia (día/semana), marcar servicios como completados (lo que alimenta el dashboard con qué se cobró realmente), y cobertura de citas de un compañero en caso de emergencia.
- **Dashboard**: gráficos (no tablas) de servicios más solicitados, citas por peluquero y evolución del negocio en el tiempo, calculados a partir de lo que cada cita registra como cobrado.
- **Turnos**: se editan como una plantilla semanal sencilla (clics, sin fechas ni SQL) que el sistema convierte automáticamente en filas reales día a día en `shifts`, regenerando el horizonte hacia adelante sin que el dueño tenga que volver a tocarlo. Una baja o una cobertura de emergencia se edita como excepción de un solo día, sin romper la plantilla general.

Detalle completo de roles, permisos y fases de construcción en [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## SEO

- `<title>` y `<meta name="description">` específicos con localización y servicios.
- Open Graph (`og:*`) y Twitter Card para previsualización al compartir en redes/WhatsApp.
- **JSON-LD** (`application/ld+json`) tipo `HairSalon` con dirección, teléfono y horario estructurado.
- `<meta name="theme-color">` para la barra de sistema del navegador móvil.

---

## Accesibilidad

- Enlace **"Saltar al contenido principal"** (`.skip-link`), visible solo al recibir foco por teclado.
- `:focus-visible` global con outline visible en color de marca.
- El carrusel respeta `prefers-reduced-motion` y se pausa también al navegar con teclado (`focusin`/`focusout`).
- Las animaciones `data-reveal` tampoco se activan con `prefers-reduced-motion`.
- `aria-label`, `aria-expanded`, `aria-controls`, `aria-modal` donde corresponde (menú móvil, modal de reservas, controles del carrusel).
- Imágenes con `alt` descriptivo; elementos decorativos marcados con `aria-hidden="true"`.

---

## Rendimiento

- Sin fuentes externas, sin frameworks CSS/JS, sin build para el sitio público.
- `width`/`height` explícitos en las imágenes del logo para evitar *layout shift*.
- `logo.png` optimizado con compresión PNG sin pérdida y fondo transparente (se funde con el header).
- `loading="lazy"` en el `<iframe>` de Google Maps.

---

## Responsive

Un único breakpoint (`max-width: 768px`) cubre el cambio a menú hamburguesa, grids a una columna y ajustes de tamaño. Probado en viewport móvil (375×812) y escritorio.

---

## Contenido pendiente de datos reales

Marcado explícitamente en el HTML con texto tipo "— próximamente" mientras el dueño confirma catálogo, precios y fotos tras la renovación del local: imagen de fondo del hero, foto del equipo, fotos de la galería, precios de servicios, catálogo completo de `productos.html`, y dirección definitiva del negocio (la ubicación actual va a cambiar).
