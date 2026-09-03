# Jota Peluqueros — Web

Web para la peluquería **Jota Peluqueros** (San Felipe, Icod de los Vinos, Tenerife). Sitio estático multipágina sin build ni frameworks, con reservas online integradas vía **Cal.com**. Header y footer son *partials* compartidos entre páginas, y el JS está dividido en módulos ES por responsabilidad.

**Producción:** desplegado en [Vercel](https://vercel.com) desde este repositorio (auto-deploy en cada push a `main`).

---

## Stack técnico

No hay build step, bundler, ni dependencias de npm. Es HTML/CSS/JS plano, servido tal cual:

| Capa | Tecnología |
|---|---|
| Markup | HTML5 semántico |
| Estilos | CSS3 puro (custom properties, Grid, Flexbox) — sin preprocesador ni framework (no Tailwind/Bootstrap) |
| Interactividad | JavaScript vanilla (ES6+), sin librerías |
| Reservas | [Cal.com](https://cal.com) — embed oficial vía `<script>`, plan gratuito |
| Mapa | Google Maps embebido (`<iframe>`, sin API key) |
| Hosting | Vercel (estático) |

No requiere `npm install` ni proceso de compilación. Cualquier servidor estático sirve el sitio tal cual.

---

## Estructura de archivos

```
.
├── index.html            # Página principal (inicio, conócenos, servicios, galería, ubicación)
├── productos.html        # Página de catálogo de productos
├── partials/
│   ├── header.html        # Header + nav, inyectado por JS en cada página
│   └── footer.html        # Footer, inyectado por JS en cada página
├── css/
│   └── style.css         # Todos los estilos, con custom properties en :root (compartido)
├── js/
│   ├── main.js            # Punto de entrada: orquesta el resto de módulos
│   ├── partials.js        # Carga header.html/footer.html vía fetch() en los slots de cada página
│   ├── nav.js              # Menú móvil + resolución de enlaces de ancla entre páginas
│   ├── carousel.js         # Carrusel de la galería
│   └── reveal.js            # Animación de aparición al hacer scroll (IntersectionObserver)
├── img/
│   ├── logo.png         # Logo de marca (871×334px), usado en header, hero y footer
│   ├── favicon-16.png
│   ├── favicon-32.png
│   ├── favicon-180.png  # apple-touch-icon
│   └── favicon-192.png
└── .gitignore
```

No hay carpeta `dist`/`build`: cada `.html` es un punto de entrada servido directamente. No hay bundler — los módulos JS se cargan como ES modules nativos del navegador (`<script type="module">`), con `import`/`export` normales.

---

## Cómo correrlo en local

Al ser estático, cualquier servidor HTTP local vale. Ejemplos:

```bash
# Python (sin dependencias)
python -m http.server 5173

# Node (si tienes npx)
npx serve .
```

Luego abrir `http://localhost:5173`. **`file://` no funciona** (ni es opcional): `js/partials.js` usa `fetch()` para cargar `partials/header.html` y `partials/footer.html`, y los navegadores bloquean `fetch` sobre el protocolo `file://` por CORS. Sin servidor HTTP, la página cargará sin header ni footer.

---

## Sistema de diseño

Definido en `:root` en `css/style.css`, tema oscuro con acento rojo/dorado (inspirado en el logo de neón del local):

```css
--color-bg: #17181c;         /* fondo base, secciones impares */
--color-bg-alt: #1e2027;     /* fondo alterno, secciones pares */
--color-card: #24262d;       /* tarjetas (servicios, etc.) */
--color-text: #f4f4f5;       /* texto principal */
--color-muted: #a1a1aa;      /* texto secundario */
--color-border: #34363d;
--color-accent: #b91c1c;     /* rojo — CTA principal, botón "Pide tu cita" */
--color-accent-hover: #991b1b;
--color-brand-accent: #d4a373;  /* dorado/melocotón — hovers, iconos, eyebrows */
--color-brand-dark: #101114;    /* header, footer, hero */
--radius: 12px;
--shadow: ...
```

Tipografía: fuente del sistema (`'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`) — sin fuentes externas (no Google Fonts cargadas, por rendimiento).

Los fondos usan `radial-gradient`/`linear-gradient` sutiles en rojo sobre el `--color-bg` para dar profundidad sin recargar.

---

## Arquitectura de partials y JS

No hay ningún framework ni SSG (Astro, 11ty, etc.) montando esto — es un patrón vanilla deliberadamente simple:

1. Cada página HTML tiene dos contenedores vacíos: `<div id="site-header-slot"></div>` y `<div id="site-footer-slot"></div>`.
2. `js/main.js` (cargado con `type="module"` en cada página) importa y ejecuta, en orden:
   1. `loadPartials()` (`js/partials.js`) — hace `fetch('partials/header.html')` y `fetch('partials/footer.html')` y los inyecta (`innerHTML`) en esos slots. Es `async`/`await`, así que todo lo siguiente espera a que el header/footer ya estén en el DOM.
   2. `initNav()` (`js/nav.js`) — una vez el header ya existe: resuelve los `href` de los enlaces `[data-anchor]` (ver abajo), engancha el botón de menú móvil, y marca el enlace de la página actual con `aria-current="page"` leyendo `document.body.dataset.page`.
   3. `initCarousel()` (`js/carousel.js`) — no hace nada si la página no tiene `#carouselTrack` (p. ej. en `productos.html`).
   4. `initReveal()` (`js/reveal.js`) — activa las animaciones de scroll.

**Por qué un solo header/footer compartido:** con dos páginas (y las que vengan), tener el `<nav>` duplicado en cada archivo es la forma más fácil de que un día se edite un enlace en una página y se te olvide en la otra. Con el partial, se edita una vez en `partials/header.html` y ya vale para todas las páginas.

### Enlaces de ancla entre páginas (`[data-anchor]`)
El header/footer son el mismo HTML en todas las páginas, pero los enlaces a secciones (`Conócenos`, `Servicios`...) solo existen como anclas dentro de `index.html`. Para que funcionen bien estés donde estés, en el partial no llevan un `href` fijo, sino `data-anchor="servicios"`, y `initNav()` decide el destino real en tiempo de ejecución:
- Si ya estás en `index.html` (o `/`): `href="#servicios"` (scroll suave en la misma página).
- Si estás en otra página (`productos.html`): `href="index.html#servicios"` (navega a la home y salta a la sección).

### Animaciones de scroll (`[data-reveal]`)
Cualquier elemento con el atributo `data-reveal` se anima con un *fade + slide-up* sutil la primera vez que entra en el viewport (`IntersectionObserver`, en `js/reveal.js`). Es *progressive enhancement* a propósito: por defecto (CSS) el contenido está siempre visible; solo si el JS llega a ejecutarse *y* el usuario no tiene activado "reducir movimiento" (`prefers-reduced-motion`), se añade la clase `.reveal-init` que lo oculta hasta que se revela. Si el JS falla o no carga, nunca se rompe la visibilidad del contenido.

---

## Páginas

### `index.html`
1. **Hero (`#inicio`)** — fondo con patrón + degradado rojo, logo, H1 en texto real (no imagen, para SEO), subtítulo.
2. **Franja de valores (`.value-strip`)** — 4 puntos con iconos SVG inline (reserva online, profesionales, ubicación, atención personalizada). Sin animación de scroll (va en el primer viewport, debe verse al instante).
3. **Conócenos (`#conocenos`)** — texto de presentación + imagen placeholder del equipo/local.
4. **Servicios (`#servicios`)** — agrupados por categoría (`.service-category`): Cortes / Barba y afeitado / Color y peinado. Cada tarjeta tiene nombre, descripción corta y precio.
5. **Galería (`#galeria`)** — carrusel (`.carousel`) con 5 slides placeholder: flechas, puntos de navegación, autoplay cada 5s.
6. **Ubicación (`#ubicacion`)** — dirección (con enlace directo a Google Maps + icono de pin), teléfono (`tel:`), horario, y `<iframe>` de Google Maps.

### `productos.html`
Catálogo de productos, con la misma estética que Servicios: categorías (`.service-category` reutilizada) con tarjetas de producto (`.product-card`) que llevan imagen, nombre, descripción y precio. Ahora mismo todo son placeholders ("Producto próximamente") a la espera del catálogo real — **pendiente de decidir con el dueño si esto acaba siendo solo informativo o con venta online** (ver sección de pendientes).

Header, footer, botón de reserva y estilos son exactamente los mismos que en `index.html` (vía partials + `css/style.css` compartido) — no hay estilos ni componentes duplicados de una página a otra.

### Contenido placeholder pendiente de datos reales
Marcado explícitamente en el HTML con texto tipo "— próximamente":
- Imagen de fondo del hero (`.hero-banner-img`)
- Foto del equipo en "Conócenos" (`.about-img`)
- 5 fotos del carrusel de galería
- Precios de servicios (orientativos, nota visible en el propio `<p class="section-lead">` del apartado Servicios)
- Todo el catálogo de `productos.html` (nombres, fotos, descripciones y precios)

---

## Integración con Cal.com (reservas)

**No hay backend propio.** Toda la lógica de disponibilidad, reservas, confirmaciones y reprogramaciones vive en Cal.com; esta web solo embebe su widget.

- **Cuenta:** `jota-peluqueros` (evento: `corte-de-pelo`) → `cal.com/jota-peluqueros/corte-de-pelo`
- **Tipo de embed:** *popup modal* (no inline) — se dispara solo desde el botón **"Pide tu cita"** del header (`.nav-cta`), que es el único punto de entrada de reservas de toda la web (decisión de producto: nada de botones duplicados ni redirecciones a una sección "Reserva").
- **Snippet de carga:** justo después del slot del header (`#site-header-slot`) en **cada página** que tenga el botón "Pide tu cita" — ahora mismo `index.html` y `productos.html` (el loader oficial de Cal.com + `Cal("init", ...)` + configuración de `ui`). Al no haber build ni includes de HTML del lado servidor, este bloque de `<script>` está duplicado literalmente en ambos archivos; el botón en sí viene del partial compartido, pero el script que lo activa no se pudo mover al partial porque necesita estar en el `<body>` de cada página cargándose pronto.
- **Config del embed** (`Cal.ns["corte-de-pelo"]("ui", {...})`):
  - `theme: "light"` — el propio popup de Cal.com usa tema claro (contrasta a propósito con el resto de la web, que es oscura).
  - `hideEventTypeDetails: false` — se muestra el panel con avatar/nombre del profesional, duración, ubicación y franja horaria dentro del popup.
  - `layout: "month_view"`
  - `styles.branding.brandColor` — color de acento dentro del iframe de Cal.com.
- El botón usa atributos `data-cal-link`, `data-cal-namespace`, `data-cal-config` — es el patrón estándar de Cal.com para triggers declarativos (no hay JS custom para abrir el modal, lo gestiona su propio script).

### Configuración relevante hecha del lado de Cal.com (fuera de este repo)
- Disponibilidad con turno partido: L–V 9:00–13:00 y 15:30–19:30, sábado 9:00–13:00, domingo cerrado (zona horaria `Atlantic/Canary`).
- Ubicación del evento: **In Person (Organizer Address)** con la dirección del local (no pide dirección al cliente).
- Formulario de reserva simplificado: campo **Teléfono obligatorio**, **Email opcional** (el método de "Confirmación" de la cuenta está puesto en *Phone*, no *Email* — así el teléfono es el dato principal y nadie queda bloqueado por no tener correo). Campo "Invitados" oculto.
- Perfil renombrado a "Jota Peluqueros" con el logo como avatar (para que el popup no muestre una cuenta personal).
- **Sin SMS/WhatsApp automático**: requeriría el plan de pago Teams de Cal.com (20$/mes + coste por SMS) — decisión consciente de quedarse en el plan gratuito por ahora.

### Cambiar de cuenta de Cal.com en el futuro
Si se migra a la cuenta definitiva del dueño, hay que cambiar el valor de `data-cal-link` (y el `Cal("init", "corte-de-pelo", ...)` si cambia el slug del evento) en **dos sitios**: `partials/header.html` (el botón, que se comparte) y el bloque `<script>` de Cal.com que va duplicado en `index.html` y `productos.html` (ver arriba).

---

## SEO

- `<title>` y `<meta name="description">` específicos con localización y servicios.
- Open Graph (`og:*`) y Twitter Card para previsualización al compartir en redes/WhatsApp.
- **JSON-LD** (`application/ld+json`) tipo `HairSalon` con dirección, teléfono y horario estructurado — para rich snippets y SEO local de Google.
- `<meta name="theme-color">` para que el navegador móvil pinte la barra de sistema del color de marca.

---

## Accesibilidad

- Enlace **"Saltar al contenido principal"** (`.skip-link`), visible solo al recibir foco por teclado.
- `:focus-visible` global con outline visible en color de marca (no depende del estilo por defecto del navegador).
- El carrusel de galería respeta `prefers-reduced-motion` (no hace autoplay si el usuario lo tiene desactivado) y se pausa también al navegar con teclado (`focusin`/`focusout`), no solo con el ratón.
- Las animaciones de aparición al hacer scroll (`data-reveal`) tampoco se activan con `prefers-reduced-motion` — el contenido se queda visible sin animar.
- `aria-label`, `aria-expanded` y `aria-controls` en el botón de menú móvil; `aria-label` en los controles del carrusel.
- Imágenes con `alt` descriptivo; mapa e imágenes decorativas marcadas con `aria-hidden="true"` donde corresponde.

---

## Rendimiento

- Sin fuentes externas, sin frameworks CSS/JS, sin build — el HTML/CSS/JS se sirve directo, sin JS de terceros salvo el embed de Cal.com (que solo carga su script cuando la página lo necesita).
- `width`/`height` explícitos en las imágenes del logo para evitar *layout shift* mientras cargan.
- `logo.png` optimizado con compresión PNG sin pérdida.
- `loading="lazy"` en el `<iframe>` de Google Maps.

---

## Responsive

Un único breakpoint (`max-width: 768px`) cubre el cambio a menú hamburguesa, grids a una columna (servicios, ubicación, "Conócenos", footer) y ajustes de tamaño (logo, tipografía del hero, franja de valores). Probado en viewport móvil (375×812) y escritorio.

---

## Pendiente / Decisiones abiertas

- [ ] Fotos reales del local, equipo y trabajos (hero, "Conócenos", galería) — a la espera de que termine la renovación.
- [ ] Confirmar precios definitivos de servicios con el dueño.
- [ ] Migrar la cuenta de Cal.com de la de pruebas (`jota-peluqueros`, gestionada por el desarrollador) a una cuenta propiedad del dueño del negocio.
- [ ] Decidir si en algún momento se activa el plan de pago de Cal.com para recordatorios por SMS.
- [ ] Enlaces a redes sociales (Instagram/Facebook) — no incluidos en el footer hasta tener las cuentas reales (para no enlazar a nada roto).
- [ ] **Venta de productos (gominas, etc.)** — la página `productos.html` ya existe como catálogo estático con placeholders, pero falta decidir con el dueño si quiere solo mostrar catálogo/stock (informativo, compra en tienda) o venta online real con cobro y descuento de stock automático. La solución técnica es completamente distinta según la respuesta:
  - Solo catálogo informativo → seguir editando `productos.html` a mano (como ahora) es suficiente si el catálogo cambia poco; si cambia mucho, una hoja de Google Sheets que el dueño edite él mismo, leída por la web, evitaría depender de tocar código cada vez.
  - Venta online real → usar una plataforma de e-commerce ya existente (Fresha con productos, Shopify, WooCommerce) en vez de construir un sistema de pagos/inventario a medida.
