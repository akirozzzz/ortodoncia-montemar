const { createBooking } = require('../../lib/store');

const FREE_SERVICE_ID = 'evaluacion';

/**
 * Agenda la Primera Consulta (Evaluacion), que no tiene costo.
 * No pasa por Fintoc: no tiene sentido crear una Checkout Session de $0.
 * Este endpoint solo existe para el flujo web (index.html); el bot de
 * WhatsApp (lib/bot-flow.js) no lo usa y no conoce este servicio, asi que
 * no aparece en su catalogo (lib/services-catalog.js) a proposito.
 *
 * POST body (JSON): { serviceId: 'evaluacion', patientName, patientEmail?, date, time }
 * Respuesta: { bookingId }
 */
module.exports = async function handler(req, res) {
if (req.method !== 'POST') {
res.status(405).json({ error: 'method not allowed' });
return;
}

let body = req.body;
if (!body || typeof body === 'string') {
try {
body = JSON.parse(body || '{}');
} catch {
body = {};
}
}

const { serviceId, patientName, patientEmail, date, time } = body || {};

if (serviceId !== FREE_SERVICE_ID) {
res.status(400).json({ error: 'serviceId invalido para agendamiento gratuito' });
return;
}
if (!patientName || !String(patientName).trim()) {
res.status(400).json({ error: 'patientName es requerido' });
return;
}
if (!date || !time) {
res.status(400).json({ error: 'date y time son requeridos' });
return;
}

const bookingId = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

await createBooking({
id: bookingId,
channel: 'web',
phone: null,
patientEmail: patientEmail ? String(patientEmail).trim() : null,
serviceId: FREE_SERVICE_ID,
slot: `${date} ${time}`,
patientName: String(patientName).trim(),
status: 'pending', // sin pago que confirmar, el equipo la confirma directo
createdAt: new Date().toISOString(),
});

res.status(200).json({ bookingId });
};
