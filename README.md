# Jota Peluqueros — Web

Landing page de una sola página para la peluquería **Jota Peluqueros** (San Felipe, Icod de los Vinos, Tenerife). Sitio estático sin build ni frameworks, con reservas online integradas vía **Cal.com**.

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
├── index.html          # Toda la estructura y contenido de la página (una sola página)
├── css/
│   └── style.css       # Todos los estilos, con custom properties en :root
├── js/
│   └── main.js         # Menú móvil, carrusel de galería
├── img/
│   ├── logo.png         # Logo de marca (871×334px), usado en header, hero y footer
│   ├── favicon-16.png
│   ├── favicon-32.png
│   ├── favicon-180.png  # apple-touch-icon
│   └── favicon-192.png
└── .gitignore
```

No hay carpeta `dist`/`build`: `index.html` es el punto de entrada servido directamente.

---

## Cómo correrlo en local

Al ser estático, cualquier servidor HTTP local vale. Ejemplos:

```bash
# Python (sin dependencias)
python -m http.server 5173

# Node (si tienes npx)
npx serve .
```

Luego abrir `http://localhost:5173`. **No usar `file://` directamente** — el embed de Cal.com y el `fetch` de recursos pueden fallar por CORS/protocolo al abrir el HTML como archivo local en vez de servirlo por HTTP.

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

## Secciones de la página (`index.html`)

1. **Header (`.site-header`)** — sticky, logo a la izquierda, nav a la derecha con el CTA `#Pide tu cita` en píldora roja. Menú hamburguesa en móvil (`<768px`).
2. **Hero (`#inicio`)** — fondo con patrón + degradado rojo, logo, H1 en texto real (no imagen, para SEO), subtítulo.
3. **Franja de valores (`.value-strip`)** — 4 puntos con iconos SVG inline (reserva online, profesionales, ubicación, atención personalizada).
4. **Conócenos (`#conocenos`)** — texto de presentación + imagen placeholder del equipo/local.
5. **Servicios (`#servicios`)** — agrupados por categoría (`.service-category`): Cortes / Barba y afeitado / Color y peinado. Cada tarjeta tiene nombre, descripción corta y precio.
6. **Galería (`#galeria`)** — carrusel (`.carousel`) con 5 slides placeholder, controlado por JS (`js/main.js`): flechas, puntos de navegación, autoplay cada 5s.
7. **Ubicación (`#ubicacion`)** — dirección (con enlace directo a Google Maps + icono de pin), teléfono (`tel:`), horario, y `<iframe>` de Google Maps.
8. **Footer** — logo, nav secundaria, contacto, copyright.

### Contenido placeholder pendiente de datos reales
Marcado explícitamente en el HTML con texto tipo "— próximamente":
- Imagen de fondo del hero (`.hero-banner-img`)
- Foto del equipo en "Conócenos" (`.about-img`)
- 5 fotos del carrusel de galería
- Precios de servicios (orientativos, nota visible en el propio `<p class="section-lead">` del apartado Servicios)

---

## Integración con Cal.com (reservas)

**No hay backend propio.** Toda la lógica de disponibilidad, reservas, confirmaciones y reprogramaciones vive en Cal.com; esta web solo embebe su widget.

- **Cuenta:** `jota-peluqueros` (evento: `corte-de-pelo`) → `cal.com/jota-peluqueros/corte-de-pelo`
- **Tipo de embed:** *popup modal* (no inline) — se dispara solo desde el botón **"Pide tu cita"** del header (`.nav-cta`), que es el único punto de entrada de reservas de toda la web (decisión de producto: nada de botones duplicados ni redirecciones a una sección "Reserva").
- **Snippet de carga:** justo después del `<header>` en `index.html` (el loader oficial de Cal.com + `Cal("init", ...)` + configuración de `ui`).
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
Si se migra a la cuenta definitiva del dueño, solo hay que cambiar el valor de `data-cal-link` (y el `Cal("init", "corte-de-pelo", ...)` si cambia el slug del evento) en `index.html`. Es el único sitio donde el usuario/evento de Cal.com está hardcodeado.

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
