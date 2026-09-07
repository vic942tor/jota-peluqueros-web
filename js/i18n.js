const SUPPORTED = ['es', 'en', 'de', 'it'];
const DEFAULT_LANG = 'es';
const STORAGE_KEY = 'jota-lang';
const FLAG_CODE = { es: 'es', en: 'gb', de: 'de', it: 'it' };
const NATIVE_NAME = { es: 'Español', en: 'English', de: 'Deutsch', it: 'Italiano' };

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

// Solo estas páginas tienen su título/descripción en los diccionarios de
// idioma. El resto (avisos legales, futuras páginas nuevas...) conservan el
// <title> y meta description que traigan escritos en su propio HTML.
const META_PAGES = { index: ['meta.indexTitle', 'meta.indexDescription'], productos: ['meta.productosTitle', 'meta.productosDescription'] };

function applyMeta() {
    document.documentElement.lang = currentLang;

    const page = document.body.dataset.page || 'index';
    if (!META_PAGES[page]) return;

    const [titleKey, descKey] = META_PAGES[page];
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

function updateSwitchUI(lang) {
    const flagImg = document.getElementById('langSwitchFlag');
    const codeEl = document.getElementById('langSwitchCode');
    if (flagImg) flagImg.src = `https://flagcdn.com/w20/${FLAG_CODE[lang]}.png`;
    if (codeEl) codeEl.textContent = NATIVE_NAME[lang];
    document.querySelectorAll('[data-lang-switch]').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.langSwitch === lang);
    });
}

async function loadDict(lang) {
    const res = await fetch(`i18n/${lang}.json`, { cache: 'no-cache' });
    return res.json();
}

export async function setLang(lang) {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    dict = await loadDict(lang);
    applyMeta();
    applyDom();
    updateSwitchUI(lang);
    document.dispatchEvent(new CustomEvent('i18n:changed'));
}

function closeLangMenu() {
    const menu = document.getElementById('langSwitchMenu');
    const toggle = document.getElementById('langSwitchToggle');
    if (menu) menu.hidden = true;
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

function initLangSwitchUI() {
    const toggle = document.getElementById('langSwitchToggle');
    const menu = document.getElementById('langSwitchMenu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !menu.hidden;
        menu.hidden = isOpen;
        toggle.setAttribute('aria-expanded', String(!isOpen));
    });

    document.addEventListener('click', (e) => {
        if (!menu.hidden && !e.target.closest('#langSwitch')) closeLangMenu();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLangMenu();
    });

    menu.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-lang-switch]');
        if (btn) {
            setLang(btn.dataset.langSwitch);
            closeLangMenu();
        }
    });
}

export async function initI18n() {
    await setLang(detectLang());
    initLangSwitchUI();
}

// Re-traduce cualquier contenido nuevo inyectado después (p. ej. el modal
// de reservas al abrirse), sin tener que recargar la página.
export function translateNode(node) {
    applyDom(node);
}
