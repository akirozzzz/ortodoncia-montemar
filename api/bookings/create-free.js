const { createBooking } = require('../../lib/store');

// IDs validos = los mismos ids de state.services en script.js.
const VALID_SERVICE_IDS = ['evaluacion', 'kids', 'brackets', 'zafiro', 'vip'];

/**
 * Agenda una hora sin pago online.
 *
 * No usamos Fintoc: la clinica no cumple los requisitos que exige para
 * operar, asi que ningun plan (gratis o pagado) pasa por una pasarela de
 * pago en el sitio. Este endpoint reserva la hora y guarda los datos del
 * paciente; el pago de los planes pagados (Brackets, etc.) se coordina
 * despues, directamente con el paciente (efectivo, transferencia o en
 * la clinica).
 *
 * Nota: el bot de WhatsApp (lib/bot-flow.js) no usa este endpoint, tiene
 * su propio flujo de agendamiento contra la misma base (lib/store.js).
 *
 * POST body (JSON): { serviceId, patientName, patientEmail?, date, time }
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

  if (!VALID_SERVICE_IDS.includes(serviceId)) {
    res.status(400).json({ error: 'serviceId invalido' });
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
    serviceId,
    slot: `${date} ${time}`,
    patientName: String(patientName).trim(),
    status: 'pending', // sin pago que confirmar, el equipo la confirma directo
    createdAt: new Date().toISOString(),
  });

  res.status(200).json({ bookingId });
};
