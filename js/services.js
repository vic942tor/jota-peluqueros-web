import { supabase } from './supabaseClient.js';

// Mismo espíritu que products.js: un orden preferente para las categorías
// habituales, y cualquier categoría nueva que se añada en Panel Jota se
// pinta igualmente, al final, sin necesidad de tocar este archivo.
const CATEGORIA_ORDEN = ['Corte', 'Barba', 'Afeitado', 'Color', 'Otros'];

function formatPrecio(precio) {
    return precio == null ? 'Consultar' : `${Number(precio).toFixed(2)} €`;
}

function serviceCard(s) {
    const card = document.createElement('div');
    card.className = 'service-card';

    const info = document.createElement('div');
    info.className = 'service-card-info';

    const h4 = document.createElement('h4');
    h4.textContent = s.nombre;
    info.appendChild(h4);

    const price = document.createElement('span');
    price.className = 'price';
    price.textContent = formatPrecio(s.precio);

    card.append(info, price);
    return card;
}

export async function initServices() {
    const container = document.getElementById('serviciosContainer');
    if (!container) return; // partial/página distinta, no aplica

    // Los servicios se gestionan en Panel Jota (Servicios) — cualquiera que
    // se cree o edite ahí, y esté activo, aparece aquí automáticamente.
    const { data, error } = await supabase
        .from('services')
        .select('id, nombre, categoria, precio')
        .eq('activo', true)
        .order('nombre', { ascending: true });

    if (error || !data || data.length === 0) {
        container.innerHTML = '<p class="section-lead">Servicios en preparación — vuelve pronto.</p>';
        return;
    }

    const grupos = new Map();
    data.forEach((s) => {
        const cat = s.categoria || 'Otros';
        if (!grupos.has(cat)) grupos.set(cat, []);
        grupos.get(cat).push(s);
    });

    const categoriasOrdenadas = [
        ...CATEGORIA_ORDEN.filter((c) => grupos.has(c)),
        ...[...grupos.keys()].filter((c) => !CATEGORIA_ORDEN.includes(c)),
    ];

    container.innerHTML = '';
    categoriasOrdenadas.forEach((cat) => {
        const section = document.createElement('div');
        section.className = 'service-category';
        section.setAttribute('data-reveal', '');

        const title = document.createElement('h3');
        title.className = 'service-category-title';
        title.textContent = cat;

        const grid = document.createElement('div');
        grid.className = 'services-grid';
        grupos.get(cat).forEach((s) => grid.appendChild(serviceCard(s)));

        section.append(title, grid);
        container.appendChild(section);
    });
}
