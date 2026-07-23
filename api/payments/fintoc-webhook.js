const { WebhookSignature, WebhookSignatureError } = require('fintoc');
const getRawBody = require('raw-body');
const { getKapsoClient, KAPSO_PHONE_NUMBER_ID } = require('../../lib/kapso-client');
const { getBooking, updateBookingStatus, wasProcessed, markProcessed } = require('../../lib/store');
const { getService } = require('../../lib/services-catalog');

/**
 * Webhook de Fintoc: confirma cuando se pagó (o falló) una reserva hecha
 * por WhatsApp. Queda expuesto en:
 *   https://TU-DOMINIO/api/payments/fintoc-webhook
 *
 * Configurar en el dashboard de Fintoc (Webhooks > Create your Webhook
 * Endpoint):
 *   URL: https://TU-DOMINIO/api/payments/fintoc-webhook
 *   Evento: checkout_session.finished
 *
 * Usamos `checkout_session.finished` porque trae de vuelta el
 * `metadata.bookingId` que le pasamos al crear la Checkout Session en
 * lib/bot-flow.js.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const rawBody = (await getRawBody(req)).toString('utf8');
  const signature = req.headers['fintoc-signature'];

  try {
    WebhookSignature.verifyHeader(rawBody, signature || '', process.env.FINTOC_WEBHOOK_SECRET);
  } catch (err) {
    if (err instanceof WebhookSignatureError) {
      res.status(400).json({ error: 'invalid signature' });
      return;
    }
    throw err;
  }

  const event = JSON.parse(rawBody);

  if (event && event.id && (await wasProcessed(event.id))) {
    res.status(200).json({ ok: true, deduped: true });
    return;
  }

  if (event.type === 'checkout_session.finished') {
    await handleCheckoutFinished(event.data);
  }

  if (event && event.id) await markProcessed(event.id);

  res.status(200).json({ ok: true });
};

module.exports.config = {
  api: { bodyParser: false },
};
async function handleCheckoutFinished(session) {
  const bookingId = session && session.metadata && session.metadata.bookingId;
  const intent = session && session.payment_resource && session.payment_resource.payment_intent;
  if (!bookingId || !intent) return;

  if (intent.status === 'succeeded') {
    const booking = await updateBookingStatus(bookingId, 'paid');
    if (booking) await notifyConfirmed(booking);
  } else if (intent.status === 'failed') {
    await notifyFailed(bookingId);
  }
  // Si el status es "requires_action" (transferencia empresarial pendiente
  // de aprobación), no hacemos nada todavía: esperamos el próximo evento.
}

async function notifyConfirmed(booking) {
  const service = getService(booking.serviceId);
  await getKapsoClient().messages.sendText({
    phoneNumberId: KAPSO_PHONE_NUMBER_ID,
    to: booking.phone,
    body: `¡Listo, ${booking.patientName}! Tu hora del ${booking.slot} para ${
      service ? service.name : booking.serviceId
    } quedó confirmada. Te esperamos 🦷✨`,
  });
}

async function notifyFailed(bookingId) {
  const booking = await getBooking(bookingId);
  if (!booking) return;
  await getKapsoClient().messages.sendText({
    phoneNumberId: KAPSO_PHONE_NUMBER_ID,
    to: booking.phone,
    body: 'El pago no se pudo procesar. Escribí "agendar" para intentar de nuevo cuando quieras.',
  });
}
