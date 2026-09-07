// Carga el header y footer compartidos (partials/) en cualquier página que tenga los slots.
// cache: 'no-cache' obliga al navegador a revalidar con el servidor en vez de
// servir a ciegas una copia antigua guardada — si no, tras publicar un cambio,
// un visitante que ya conocía la web puede seguir viendo el header/footer viejo.
export async function loadPartials() {
    const headerSlot = document.getElementById('site-header-slot');
    const footerSlot = document.getElementById('site-footer-slot');

    const tasks = [];
    if (headerSlot) {
        tasks.push(
            fetch('partials/header.html', { cache: 'no-cache' })
                .then(r => r.text())
                .then(html => { headerSlot.innerHTML = html; })
        );
    }
    if (footerSlot) {
        tasks.push(
            fetch('partials/footer.html', { cache: 'no-cache' })
                .then(r => r.text())
                .then(html => { footerSlot.innerHTML = html; })
        );
    }

    tasks.push(
        fetch('partials/booking-modal.html', { cache: 'no-cache' })
            .then(r => r.text())
            .then(html => {
                const container = document.createElement('div');
                container.innerHTML = html;
                document.body.appendChild(container.firstElementChild);
            })
    );

    await Promise.all(tasks);
}
