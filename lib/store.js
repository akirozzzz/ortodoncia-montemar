const { kv } = require('@vercel/kv');

/**
 * ⚠️ El sitio hoy NO tiene backend ni base de datos: el arreglo
 * state.appointments de script.js vive en memoria del navegador y
 * desaparece al recargar la página. Este archivo es la primera persistencia
 * real que tiene el proyecto (vía Vercel KV), pero por ahora solo la usa el
 * flujo de WhatsApp — las reservas hechas desde la web (el modal de
 * "Reservar y pagar") siguen sin guardarse en ningún lado.
 */

const CONV_TTL_SECONDS = 60 * 60 * 24; // 1 día de inactividad y se resetea el estado
const WEBHOOK_DEDUPE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 días

async function getConversationState(phone) {
  return (await kv.get(`conv:${phone}`)) || null;
}

async function setConversationState(phone, state) {
  await kv.set(`conv:${phone}`, state, { ex: CONV_TTL_SECONDS });
}

async function createBooking(booking) {
  await kv.set(`booking:${booking.id}`, booking);
  return booking;
}

async function getBooking(id) {
  return (await kv.get(`booking:${id}`)) || null;
}

async function updateBookingStatus(id, status) {
  const booking = await getBooking(id);
  if (!booking) return null;
  booking.status = status;
  await kv.set(`booking:${id}`, booking);
  return booking;
}

// --- Idempotencia de webhooks (Kapso y Fintoc reintentan si no respondés 200 a tiempo) ---

async function wasProcessed(key) {
  if (!key) return false;
  const seen = await kv.get(`webhook:${key}`);
  return !!seen;
}

async function markProcessed(key) {
  if (!key) return;
  await kv.set(`webhook:${key}`, true, { ex: WEBHOOK_DEDUPE_TTL_SECONDS });
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
