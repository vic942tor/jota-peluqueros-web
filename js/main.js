document.addEventListener('DOMContentLoaded', () => {
    const timeButtons = document.querySelectorAll('.time-btn');
    const bookingForm = document.getElementById('bookingForm');
    let selectedTime = null;

    //  Marcar visualmente la hora elegida
    timeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            timeButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            selectedTime = e.target.textContent;
        });
    });

    // Capturar el botón de confirmar reserva
    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!selectedTime) {
            alert('Por favor, selecciona una hora para la cita.');
            return;
        }

        // Empaquetamos los datos que enviaremos a la API después
        const bookingData = {
            date: document.getElementById('date').value,
            time: selectedTime,
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value
        };

        console.log('Datos listos para enviar:', bookingData);
        alert(`Has solicitado cita el ${bookingData.date} a las ${bookingData.time}`);
    });
});