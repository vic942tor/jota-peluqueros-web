// Animación sutil de aparición al hacer scroll para elementos con [data-reveal].
// Progressive enhancement: sin JS (o con "movimiento reducido" activado) el contenido
// se queda siempre visible, nunca depende de que esto se ejecute.
export function initReveal() {
    const els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    els.forEach(el => el.classList.add('reveal-init'));

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    els.forEach(el => observer.observe(el));
}
