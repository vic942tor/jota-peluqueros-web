// Carga el header y footer compartidos (partials/) en cualquier página que tenga los slots.
export async function loadPartials() {
    const headerSlot = document.getElementById('site-header-slot');
    const footerSlot = document.getElementById('site-footer-slot');

    const tasks = [];
    if (headerSlot) {
        tasks.push(
            fetch('partials/header.html')
                .then(r => r.text())
                .then(html => { headerSlot.innerHTML = html; })
        );
    }
    if (footerSlot) {
        tasks.push(
            fetch('partials/footer.html')
                .then(r => r.text())
                .then(html => { footerSlot.innerHTML = html; })
        );
    }
    await Promise.all(tasks);
}
