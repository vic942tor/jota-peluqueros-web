import { loadPartials } from './partials.js';
import { initI18n } from './i18n.js';
import { initNav } from './nav.js';
import { initCarousel } from './carousel.js';
import { initReveal } from './reveal.js';
import { initBooking } from './booking.js';

(async () => {
    await loadPartials();
    await initI18n();
    initNav();
    initCarousel();
    initReveal();
    initBooking();
})();
