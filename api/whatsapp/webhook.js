const crypto = require('crypto');
const getRawBody = require('raw-body');
const { handleInboundMessage } = require('../../lib/bot-flow');
const { wasProcessed, markProcessed } = require('../../lib/store');

/**
 * Webhook de Kapso: recibe mensajes entrantes de WhatsApp.
 * Queda expuesto en: https://TU-DOMINIO/api/whatsapp/webhook
 *
 * Configurar en el dashboard de Kapso (WhatsApp > tu número > Webhooks):
 *   URL: https://TU-DOMINIO/api/whatsapp/webhook
 *   Evento: whatsapp.message.received
 *
 * Este es un Vercel Function "standalone" (no Next.js) — por eso lee el
 * body con raw-body en vez de req.body, y desactiva el bodyParser de
 * Vercel con `module.exports.config` para poder verificar la firma HMAC
 * contra los bytes exactos que mandó Kapso.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const rawBody = (await getRawBody(req)).toString('utf8');
  const signature = req.headers['x-webhook-signature'];
  const idempotencyKey = req.headers['x-idempotency-key'] || '';
  const eventType = req.headers['x-webhook-event'];

  if (!verifySignature(rawBody, signature, process.env.KAPSO_WEBHOOK_SECRET)) {
    res.status(401).json({ error: 'invalid signature' });
    return;
  }

  if (idempotencyKey && (await wasProcessed(idempotencyKey))) {
    res.status(200).json({ ok: true, deduped: true });
    return;
  }

  const payload = JSON.parse(rawBody);

  try {
    if (eventType === 'whatsapp.message.received') {
      await processMessage(payload);
    }
    // Otros eventos (message.sent/delivered/read, conversation.*) se
    // ignoran por ahora.
  } finally {
    if (idempotencyKey) await markProcessed(idempotencyKey);
  }

  res.status(200).json({ ok: true });
};

module.exports.config = {
  api: { bodyParser: false },
};

function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
async function processMessage(payload) {
  const message = payload && payload.message;
  const conversation = payload && payload.conversation;
  if (!message || !message.kapso || message.kapso.direction !== 'inbound') return;

  // BSUID rollout: WhatsApp puede no enviar phone_number en algunos casos.
  // Ver docs.kapso.ai/docs/whatsapp/business-scoped-user-ids si esto pasa seguido.
  const phone = (conversation && conversation.phone_number) || message.from;
  if (!phone) return;

  const contactName = conversation && conversation.kapso && conversation.kapso.contact_name;

  if (message.type === 'text') {
    await handleInboundMessage({
      phone,
      contactName,
      type: 'text',
      text: (message.text && message.text.body) || '',
    });
  } else if (message.type === 'interactive') {
    const reply = message.interactive && (message.interactive.button_reply || message.interactive.list_reply);
    if (reply && reply.id) {
      await handleInboundMessage({ phone, contactName, type: 'interactive', interactiveId: reply.id });
    }
  }
}
