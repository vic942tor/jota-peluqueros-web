import { supabase } from './supabaseClient.js';

const SLOT_MINUTES = 30;

function timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function minutesToTime(mins) {
    const h = String(Math.floor(mins / 60)).padStart(2, '0');
    const m = String(mins % 60).padStart(2, '0');
    return `${h}:${m}`;
}

function slotsInRange(horaInicio, horaFin) {
    const start = timeToMinutes(horaInicio);
    const end = timeToMinutes(horaFin);
    const slots = [];
    for (let t = start; t + SLOT_MINUTES <= end; t += SLOT_MINUTES) {
        slots.push(minutesToTime(t));
    }
    return slots;
}

function isPastToday(fecha, hora) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (fecha !== todayStr) return false;
    return timeToMinutes(hora) <= now.getHours() * 60 + now.getMinutes();
}

// Devuelve { [staffId]: { nombre, slots: [ 'HH:MM', ... ] } } con la disponibilidad real
// de un día: turnos de ese día, menos bajas/vacaciones, menos citas ya reservadas.
async function getAvailability(fecha) {
    const [shiftsRes, staffRes, overridesRes, appointmentsRes] = await Promise.all([
        supabase.from('shifts').select('staff_id, hora_inicio, hora_fin').eq('fecha', fecha),
        supabase.from('staff').select('id, nombre').eq('activo', true),
        supabase.from('staff_status_overrides').select('staff_id').lte('fecha_inicio', fecha).gte('fecha_fin', fecha),
        supabase.from('appointments').select('staff_id, hora_inicio').eq('fecha', fecha).neq('estado', 'cancelada'),
    ]);

    if (shiftsRes.error) throw shiftsRes.error;
    if (staffRes.error) throw staffRes.error;
    if (overridesRes.error) throw overridesRes.error;
    if (appointmentsRes.error) throw appointmentsRes.error;

    const staffNames = new Map(staffRes.data.map((s) => [s.id, s.nombre]));
    const staffOnLeave = new Set(overridesRes.data.map((o) => o.staff_id));
    const takenByStaff = new Map();
    for (const appt of appointmentsRes.data) {
        const hhmm = appt.hora_inicio.slice(0, 5);
        if (!takenByStaff.has(appt.staff_id)) takenByStaff.set(appt.staff_id, new Set());
        takenByStaff.get(appt.staff_id).add(hhmm);
    }

    const availability = {};
    for (const shift of shiftsRes.data) {
        if (staffOnLeave.has(shift.staff_id)) continue;
        if (!staffNames.has(shift.staff_id)) continue; // peluquero inactivo

        const taken = takenByStaff.get(shift.staff_id) || new Set();
        const freeSlots = slotsInRange(shift.hora_inicio, shift.hora_fin)
            .filter((slot) => !taken.has(slot))
            .filter((slot) => !isPastToday(fecha, slot));

        if (freeSlots.length === 0) continue;

        if (!availability[shift.staff_id]) {
            availability[shift.staff_id] = { nombre: staffNames.get(shift.staff_id), slots: new Set() };
        }
        freeSlots.forEach((s) => availability[shift.staff_id].slots.add(s));
    }

    // Set -> array ordenado
    Object.values(availability).forEach((entry) => {
        entry.slots = Array.from(entry.slots).sort();
    });

    return availability;
}

export function initBooking() {
    const overlay = document.getElementById('bookingOverlay');
    if (!overlay) return; // partial no cargado en esta página (no debería pasar, pero por seguridad)

    const trigger = document.getElementById('bookingTrigger');
    const closeBtn = document.getElementById('bookingClose');
    const form = document.getElementById('bookingForm');
    const dateInput = document.getElementById('bookingDate');
    const slotsField = document.getElementById('bookingSlotsField');
    const slotsContainer = document.getElementById('bookingSlots');
    const staffField = document.getElementById('bookingStaffField');
    const staffOptions = document.getElementById('bookingStaffOptions');
    const statusEl = document.getElementById('bookingStatus');
    const contactFields = document.getElementById('bookingContactFields');
    const submitBtn = document.getElementById('bookingSubmit');
    const successEl = document.getElementById('bookingSuccess');
    const newOneBtn = document.getElementById('bookingNewOne');

    let currentAvailability = {}; // { staffId: { nombre, slots: [...] } }
    let selectedSlot = null;
    let selectedStaffId = ''; // '' = cualquiera disponible
    let businessId = null;

    async function getBusinessId() {
        if (businessId) return businessId;
        const { data, error } = await supabase.from('businesses').select('id').limit(1).single();
        if (error) throw error;
        businessId = data.id;
        return businessId;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 56);
    dateInput.min = todayStr;
    dateInput.max = maxDate.toISOString().slice(0, 10);

    function resetForm() {
        form.reset();
        slotsField.hidden = true;
        staffField.hidden = true;
        contactFields.hidden = true;
        submitBtn.hidden = true;
        statusEl.textContent = '';
        successEl.hidden = true;
        form.hidden = false;
        currentAvailability = {};
        selectedSlot = null;
        selectedStaffId = '';
    }

    function openModal() {
        resetForm();
        overlay.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        overlay.hidden = true;
        document.body.style.overflow = '';
    }

    // Peluqueros libres justo en la hora elegida (esto es lo que se muestra
    // DESPUÉS de elegir hora, al estilo Booksy: primero la hora, luego con quién).
    function staffFreeAtSlot(slot) {
        return Object.entries(currentAvailability)
            .filter(([, entry]) => entry.slots.includes(slot))
            .map(([id, entry]) => ({ id, nombre: entry.nombre }));
    }

    function renderStaffOptions() {
        const free = staffFreeAtSlot(selectedSlot);
        staffOptions.innerHTML = '';
        selectedStaffId = '';

        const anyBtn = document.createElement('button');
        anyBtn.type = 'button';
        anyBtn.className = 'booking-slot-btn is-selected';
        anyBtn.textContent = 'Cualquiera disponible';
        anyBtn.addEventListener('click', () => selectStaff('', anyBtn));
        staffOptions.appendChild(anyBtn);

        free.forEach(({ id, nombre }) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'booking-slot-btn';
            btn.textContent = nombre;
            btn.addEventListener('click', () => selectStaff(id, btn));
            staffOptions.appendChild(btn);
        });

        staffField.hidden = false;
        contactFields.hidden = false;
        submitBtn.hidden = false;
    }

    function selectStaff(id, btn) {
        staffOptions.querySelectorAll('.booking-slot-btn').forEach((b) => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        selectedStaffId = id;
    }

    function renderSlots() {
        // Unión de horas libres de todos los peluqueros con turno ese día.
        const all = new Set();
        Object.values(currentAvailability).forEach((e) => e.slots.forEach((s) => all.add(s)));
        const slots = Array.from(all).sort();

        slotsContainer.innerHTML = '';
        selectedSlot = null;
        staffField.hidden = true;
        contactFields.hidden = true;
        submitBtn.hidden = true;

        if (slots.length === 0) {
            slotsField.hidden = true;
            statusEl.textContent = 'No hay disponibilidad ese día. Prueba otra fecha.';
            return;
        }

        statusEl.textContent = '';
        slotsField.hidden = false;

        slots.forEach((slot) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'booking-slot-btn';
            btn.textContent = slot;
            btn.addEventListener('click', () => {
                slotsContainer.querySelectorAll('.booking-slot-btn').forEach((b) => b.classList.remove('is-selected'));
                btn.classList.add('is-selected');
                selectedSlot = slot;
                renderStaffOptions();
            });
            slotsContainer.appendChild(btn);
        });
    }

    async function onDateChange() {
        const fecha = dateInput.value;
        slotsField.hidden = true;
        staffField.hidden = true;
        contactFields.hidden = true;
        submitBtn.hidden = true;
        if (!fecha) return;

        statusEl.textContent = 'Buscando horas libres...';
        try {
            currentAvailability = await getAvailability(fecha);
        } catch (err) {
            statusEl.textContent = 'No se pudo comprobar la disponibilidad. Inténtalo de nuevo.';
            return;
        }

        renderSlots();
    }

    async function onSubmit(e) {
        e.preventDefault();
        const fecha = dateInput.value;
        const nombre = document.getElementById('bookingName').value.trim();
        const telefono = document.getElementById('bookingPhone').value.trim();

        if (!fecha || !selectedSlot || !nombre || !telefono) return;

        // "Cualquiera": elegimos el primer peluquero libre en esa hora.
        let staffId = selectedStaffId;
        if (!staffId) {
            staffId = staffFreeAtSlot(selectedSlot)[0]?.id;
        }
        if (!staffId) {
            statusEl.textContent = 'Esa hora ya no está disponible. Elige otra.';
            await onDateChange();
            return;
        }

        const horaInicio = selectedSlot;
        const [h, m] = horaInicio.split(':').map(Number);
        const horaFin = minutesToTime(h * 60 + m + SLOT_MINUTES);

        submitBtn.disabled = true;
        statusEl.textContent = 'Confirmando...';

        let error;
        try {
            const bId = await getBusinessId();
            ({ error } = await supabase.from('appointments').insert({
                business_id: bId,
                staff_id: staffId,
                fecha,
                hora_inicio: horaInicio,
                hora_fin: horaFin,
                cliente_nombre: nombre,
                cliente_telefono: telefono,
                creado_por: 'cliente_web',
            }));
        } catch (err) {
            error = err;
        }

        submitBtn.disabled = false;

        if (error) {
            if (error.code === '23505') {
                statusEl.textContent = 'Uy, alguien acaba de reservar esa hora. Elige otra.';
                await onDateChange();
            } else {
                statusEl.textContent = 'No se pudo confirmar la cita. Inténtalo de nuevo.';
            }
            return;
        }

        form.hidden = true;
        successEl.hidden = false;
    }

    trigger?.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !overlay.hidden) closeModal();
    });

    dateInput.addEventListener('change', onDateChange);
    form.addEventListener('submit', onSubmit);
    newOneBtn.addEventListener('click', resetForm);
}
