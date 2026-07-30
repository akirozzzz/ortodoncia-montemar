const { createCheckoutSession } = require('../../lib/fintoc-client');
const { createBooking } = require('../../lib/store');
const { getService, finalPrice } = require('../../lib/services-catalog');

/**
 * Crea una reserva "pending_payment" + una Checkout Session real de Fintoc
 * para el modal de reserva de la web (index.html, botón "Pagar con
 * Fintoc"). El frontend llama a este endpoint por POST y redirige el
 * navegador a `checkoutUrl` (la pasarela hospedada de Fintoc).
 *
 * Queda expuesto en: https://TU-DOMINIO/api/payments/create-checkout-session
 *
 * POST body (JSON): { serviceId, patientName, patientEmail?, date, time }
 * Respuesta:         { bookingId, checkoutUrl }
 *
 * El estado final del pago (pagado / fallido) lo confirma el webhook de
 * Fintoc en api/payments/fintoc-webhook.js, no esta respuesta — por eso el
 * frontend consulta /api/bookings/status después de volver de Fintoc.
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
  const service = getService(serviceId);

  if (!service) {
    res.status(400).json({ error: 'serviceId inválido' });
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

  const baseUrl = process.env.APP_BASE_URL;
  if (!baseUrl) {
    res.status(500).json({ error: 'Falta configurar APP_BASE_URL en el servidor' });
    return;
  }

  const bookingId = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const amount = finalPrice(service);
  const name = String(patientName).trim();

  await createBooking({
    id: bookingId,
    channel: 'web',
    phone: null,
    patientEmail: patientEmail ? String(patientEmail).trim() : null,
    serviceId,
    slot: `${date} ${time}`,
    patientName: name,
    status: 'pending_payment',
    createdAt: new Date().toISOString(),
  });

  try {
    const session = await createCheckoutSession({
      amount,
      successUrl: `${baseUrl}/?pago=exitoso&booking=${bookingId}`,
      cancelUrl: `${baseUrl}/?pago=cancelado&booking=${bookingId}`,
      productName: `Reserva - ${service.name} (${date} ${time})`,
      customerName: name,
      customerEmail: patientEmail ? String(patientEmail).trim() : undefined,
      metadata: { bookingId, serviceId },
    });

    res.status(200).json({ bookingId, checkoutUrl: session.redirect_url });
  } catch (err) {
    console.error('Error creando Checkout Session de Fintoc', err);
    res.status(502).json({ error: 'No se pudo iniciar el pago. Intenta nuevamente.' });
  }
};
