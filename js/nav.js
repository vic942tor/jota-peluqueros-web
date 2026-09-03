// Menú móvil y enlaces de ancla que funcionan igual desde cualquier página.
export function initNav() {
    // Los enlaces con data-anchor apuntan a secciones de index.html.
    // Si ya estamos en index.html, basta con "#seccion"; desde otra página, "index.html#seccion".
    const isHome = /(^|\/)(index\.html)?$/.test(location.pathname);
    document.querySelectorAll('[data-anchor]').forEach(link => {
        const anchor = link.getAttribute('data-anchor');
        link.setAttribute('href', isHome ? `#${anchor}` : `index.html#${anchor}`);
    });

    // Resalta el enlace de la página actual (Productos).
    const currentPage = document.body.dataset.page;
    if (currentPage) {
        document.querySelectorAll(`[data-page="${currentPage}"]`).forEach(link => {
            link.setAttribute('aria-current', 'page');
        });
    }

    const navToggle = document.getElementById('navToggle');
    const siteNav = document.getElementById('siteNav');
    if (!navToggle || !siteNav) return;

    navToggle.addEventListener('click', () => {
        const isOpen = siteNav.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', isOpen);
    });

    // Cerrar el menú móvil al elegir una sección
    siteNav.querySelectorAll('a, button').forEach(link => {
        link.addEventListener('click', () => {
            siteNav.classList.remove('open');
            navToggle.setAttribute('aria-expanded', 'false');
        });
    });
}
