const SUPPORTED = ['es', 'en', 'de', 'it'];
const DEFAULT_LANG = 'es';
const STORAGE_KEY = 'jota-lang';

let dict = {};
let currentLang = DEFAULT_LANG;

export function t(key) {
    return dict[key] ?? key;
}

export function getLang() {
    return currentLang;
}

function detectLang() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;

    const browserLang = (navigator.language || 'es').slice(0, 2);
    if (SUPPORTED.includes(browserLang)) return browserLang;

    return DEFAULT_LANG;
}

function applyMeta() {
    document.documentElement.lang = currentLang;

    const page = document.body.dataset.page === 'productos' ? 'productos' : 'index';
    const titleKey = page === 'productos' ? 'meta.productosTitle' : 'meta.indexTitle';
    const descKey = page === 'productos' ? 'meta.productosDescription' : 'meta.indexDescription';

    document.title = t(titleKey);
    const setContent = (selector, value) => {
        const el = document.querySelector(selector);
        if (el) el.setAttribute('content', value);
    };
    setContent('meta[name="description"]', t(descKey));
    setContent('meta[property="og:title"]', t(titleKey));
    setContent('meta[property="og:description"]', t(descKey));
    setContent('meta[name="twitter:title"]', t(titleKey));
    setContent('meta[name="twitter:description"]', t(descKey));
}

function applyDom(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
        el.textContent = t(el.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
        el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
    });
}

async function loadDict(lang) {
    const res = await fetch(`i18n/${lang}.json`);
    return res.json();
}

export async function setLang(lang) {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    dict = await loadDict(lang);
    applyMeta();
    applyDom();
    document.querySelectorAll('[data-lang-switch]').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.langSwitch === lang);
    });
    document.dispatchEvent(new CustomEvent('i18n:changed'));
}

export async function initI18n() {
    await setLang(detectLang());

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-lang-switch]');
        if (btn) setLang(btn.dataset.langSwitch);
    });
}

// Re-traduce cualquier contenido nuevo inyectado después (p. ej. el modal
// de reservas al abrirse), sin tener que recargar la página.
export function translateNode(node) {
    applyDom(node);
}
