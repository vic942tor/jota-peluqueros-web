import { supabase } from './supabaseClient.js';

// Mismo orden de categorías que en Panel Jota (Stock), para que las secciones
// salgan siempre en el mismo orden aunque los productos se añadan sin orden.
const CATEGORIA_ORDEN = [
    'Cuidado capilar',
    'Estilizado',
    'Barba',
    'Afeitado',
    'Colonias y perfumes',
    'Herramientas y accesorios',
    'Otros',
];

function formatPrecio(precio) {
    return precio == null ? '— €' : `${Number(precio).toFixed(2)} €`;
}

function productCard(p) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const img = document.createElement('div');
    if (p.imagen_url) {
        img.className = 'product-img';
        const el = document.createElement('img');
        el.src = p.imagen_url;
        el.alt = p.nombre;
        el.loading = 'lazy';
        img.appendChild(el);
    } else {
        img.className = 'product-img placeholder-media';
        img.setAttribute('aria-hidden', 'true');
        const span = document.createElement('span');
        span.textContent = 'Foto próximamente';
        img.appendChild(span);
    }

    const info = document.createElement('div');
    info.className = 'product-card-info';

    const h4 = document.createElement('h4');
    h4.textContent = p.nombre;

    const desc = document.createElement('p');
    desc.textContent = p.descripcion || '';

    const price = document.createElement('span');
    price.className = 'price';
    price.textContent = formatPrecio(p.precio_venta);

    info.append(h4, desc, price);
    card.append(img, info);
    return card;
}

export async function initProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return; // partial/página distinta, no aplica

    const { data, error } = await supabase
        .from('products')
        .select('id, nombre, descripcion, categoria, precio_venta, imagen_url')
        .eq('visible_web', true)
        .order('nombre', { ascending: true });

    if (error || !data || data.length === 0) {
        container.innerHTML = '<p class="section-lead">Catálogo en preparación — vuelve pronto.</p>';
        return;
    }

    const grupos = new Map();
    data.forEach((p) => {
        const cat = p.categoria || 'Otros';
        if (!grupos.has(cat)) grupos.set(cat, []);
        grupos.get(cat).push(p);
    });

    const categoriasOrdenadas = [
        ...CATEGORIA_ORDEN.filter((c) => grupos.has(c)),
        ...[...grupos.keys()].filter((c) => !CATEGORIA_ORDEN.includes(c)),
    ];

    container.innerHTML = '';
    categoriasOrdenadas.forEach((cat) => {
        const section = document.createElement('div');
        section.className = 'service-category';

        const title = document.createElement('h3');
        title.className = 'service-category-title';
        title.textContent = cat;

        const grid = document.createElement('div');
        grid.className = 'products-grid';
        grupos.get(cat).forEach((p) => grid.appendChild(productCard(p)));

        section.append(title, grid);
        container.appendChild(section);
    });
}
