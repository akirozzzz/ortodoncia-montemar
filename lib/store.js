const Redis = require('ioredis');

/**
 * Persistencia real del proyecto vía Redis (REDIS_URL en las variables de
 * entorno de Vercel). La usan tanto el flujo de reservas por WhatsApp
 * (lib/bot-flow.js) como las reservas hechas desde el modal de la web
 * (api/payments/create-checkout-session.js).
 *
 * Antes este archivo usaba @vercel/kv, que requiere KV_REST_API_URL /
 * KV_REST_API_TOKEN. Como en este proyecto lo que está configurado es
 * REDIS_URL (una URL de conexión Redis estándar, por ejemplo de Upstash),
 * usamos ioredis directamente.
 */

const CONV_TTL_SECONDS = 60 * 60 * 24; // 1 día de inactividad y se resetea el estado
const WEBHOOK_DEDUPE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 días

let _client = null;
function getClient() {
  if (!_client) {
    if (!process.env.REDIS_URL) {
      throw new Error('Falta la variable de entorno REDIS_URL');
    }
    _client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      // Si tu proveedor exige TLS y REDIS_URL empieza con redis:// en vez
      // de rediss://, ioredis no activa TLS solo; en ese caso agregá
      // `tls: {}` acá o cambiá el esquema de la URL a rediss://.
    });
  }
  return _client;
}

async function getConversationState(phone) {
  const raw = await getClient().get(`conv:${phone}`);
  return raw ? JSON.parse(raw) : null;
}

async function setConversationState(phone, state) {
  await getClient().set(`conv:${phone}`, JSON.stringify(state), 'EX', CONV_TTL_SECONDS);
}

async function createBooking(booking) {
  await getClient().set(`booking:${booking.id}`, JSON.stringify(booking));
  return booking;
}

async function getBooking(id) {
  const raw = await getClient().get(`booking:${id}`);
  return raw ? JSON.parse(raw) : null;
}

async function updateBookingStatus(id, status) {
  const booking = await getBooking(id);
  if (!booking) return null;
  booking.status = status;
  await getClient().set(`booking:${id}`, JSON.stringify(booking));
  return booking;
}

// --- Idempotencia de webhooks (Kapso y Fintoc reintentan si no respondés 200 a tiempo) ---

async function wasProcessed(key) {
  if (!key) return false;
  const seen = await getClient().get(`webhook:${key}`);
  return !!seen;
}

async function markProcessed(key) {
  if (!key) return;
  await getClient().set(`webhook:${key}`, '1', 'EX', WEBHOOK_DEDUPE_TTL_SECONDS);
}

module.exports = {
  getConversationState,
  setConversationState,
  createBooking,
  getBooking,
  updateBookingStatus,
  wasProcessed,
  markProcessed,
};
