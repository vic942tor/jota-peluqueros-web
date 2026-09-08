import { supabase } from './supabaseClient.js';

function formatFecha(iso) {
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

function mediaElement(m) {
    if (m.tipo === 'video') {
        const video = document.createElement('video');
        video.src = m.url;
        video.controls = true;
        video.className = 'post-media-item';
        return video;
    }
    const img = document.createElement('img');
    img.src = m.url;
    img.alt = '';
    img.loading = 'lazy';
    img.className = 'post-media-item';
    return img;
}

function postCard(p) {
    const card = document.createElement('article');
    card.className = 'post-card';

    const date = document.createElement('span');
    date.className = 'post-date';
    date.textContent = formatFecha(p.publicado_en);

    const title = document.createElement('h3');
    title.className = 'post-title';
    title.textContent = p.titulo;

    const body = document.createElement('p');
    body.className = 'post-body';
    body.textContent = p.cuerpo || '';

    card.append(date, title, body);

    const media = (p.post_media || []).slice().sort((a, b) => a.orden - b.orden);
    if (media.length > 0) {
        const grid = document.createElement('div');
        grid.className = 'post-media-grid';
        media.forEach((m) => grid.appendChild(mediaElement(m)));
        card.appendChild(grid);
    }

    return card;
}

export async function initNoticias() {
    const container = document.getElementById('postsContainer');
    if (!container) return; // partial/página distinta, no aplica

    const { data, error } = await supabase
        .from('posts')
        .select('id, titulo, cuerpo, publicado_en, post_media(id, tipo, url, orden)')
        .not('publicado_en', 'is', null)
        .order('publicado_en', { ascending: false });

    if (error || !data || data.length === 0) {
        container.innerHTML = '<p class="section-lead">Todavía no hay noticias publicadas — vuelve pronto.</p>';
        return;
    }

    container.innerHTML = '';
    const list = document.createElement('div');
    list.className = 'posts-list';
    data.forEach((p) => list.appendChild(postCard(p)));
    container.appendChild(list);
}
