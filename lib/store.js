const Redis = require('ioredis');

/**
 * WARNING: El sitio hoy NO tiene backend ni base de datos: el arreglo
 * state.appointments de script.js vive en memoria del navegador y
 * desaparece al recargar la pagina. Este archivo es la primera persistencia
 * real que tiene el proyecto (via Redis, conectado desde Vercel > Storage),
 * pero por ahora solo la usa el flujo de WhatsApp - las reservas hechas
 * desde la web (el modal de "Reservar y pagar") siguen sin guardarse en
 * ningun lado.
 *
 * Nota: usamos ioredis contra REDIS_URL (una connection string estandar,
 * tipo redis://...) porque el producto "Redis" que ofrece Vercel Storage
 * hoy (Redis Cloud, integracion oficial) ya no expone el par
 * KV_REST_API_URL/KV_REST_API_TOKEN del viejo "Vercel KV" - por eso este
 * archivo no usa el paquete @vercel/kv.
 */

const CONV_TTL_SECONDS = 60 * 60 * 24; // 1 dia de inactividad y se resetea el estado
const WEBHOOK_DEDUPE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias

let _redis = null;

function getRedis() {
  if (!_redis) {
    if (!process.env.REDIS_URL) {
      throw new Error('Falta la env var REDIS_URL (conecta una base de datos Redis desde Vercel > Storage).');
    }
    _redis = new Redis(process.env.REDIS_URL, {
      // En serverless conviene fallar rapido en vez de reintentar indefinidamente.
      maxRetriesPerRequest: 3,
    });
  }
  return _redis;
}

async function getConversationState(phone) {
  const raw = await getRedis().get(`conv:${phone}`);
  return raw ? JSON.parse(raw) : null;
}

async function setConversationState(phone, state) {
  await getRedis().set(`conv:${phone}`, JSON.stringify(state), 'EX', CONV_TTL_SECONDS);
}

async function createBooking(booking) {
  await getRedis().set(`booking:${booking.id}`, JSON.stringify(booking));
  return booking;
}

async function getBooking(id) {
  const raw = await getRedis().get(`booking:${id}`);
  return raw ? JSON.parse(raw) : null;
}

async function updateBookingStatus(id, status) {
  const booking = await getBooking(id);
  if (!booking) return null;
  booking.status = status;
  await getRedis().set(`booking:${id}`, JSON.stringify(booking));
  return booking;
}

// --- Idempotencia de webhooks (Kapso y Fintoc reintentan si no respondes 200 a tiempo) ---

async function wasProcessed(key) {
  if (!key) return false;
  const seen = await getRedis().get(`webhook:${key}`);
  return !!seen;
}

async function markProcessed(key) {
  if (!key) return;
  await getRedis().set(`webhook:${key}`, '1', 'EX', WEBHOOK_DEDUPE_TTL_SECONDS);
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
