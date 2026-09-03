import { loadPartials } from './partials.js';
import { initNav } from './nav.js';
import { initCarousel } from './carousel.js';
import { initReveal } from './reveal.js';

(async () => {
    await loadPartials();
    initNav();
    initCarousel();
    initReveal();
})();
