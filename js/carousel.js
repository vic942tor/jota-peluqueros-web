// Carrusel de la galería: flechas, puntos, autoplay (respeta prefers-reduced-motion).
export function initCarousel() {
    const track = document.getElementById('carouselTrack');
    if (!track) return;

    const slides = Array.from(track.children);
    const dotsContainer = document.getElementById('carouselDots');
    const prevBtn = document.getElementById('carouselPrev');
    const nextBtn = document.getElementById('carouselNext');
    let current = 0;

    slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Ir a la foto ${i + 1}`);
        dot.addEventListener('click', () => goTo(i));
        dotsContainer.appendChild(dot);
    });
    const dots = Array.from(dotsContainer.children);

    function goTo(index) {
        current = (index + slides.length) % slides.length;
        track.style.transform = `translateX(-${current * 100}%)`;
        dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }

    prevBtn.addEventListener('click', () => goTo(current - 1));
    nextBtn.addEventListener('click', () => goTo(current + 1));

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const carousel = document.getElementById('carousel');

    if (!prefersReducedMotion) {
        let autoplay = setInterval(() => goTo(current + 1), 5000);
        const stop = () => clearInterval(autoplay);
        const start = () => { autoplay = setInterval(() => goTo(current + 1), 5000); };
        carousel.addEventListener('mouseenter', stop);
        carousel.addEventListener('mouseleave', start);
        carousel.addEventListener('focusin', stop);
        carousel.addEventListener('focusout', start);
    }
}
