const { WhatsAppClient } = require('@kapso/whatsapp-cloud-api');

/**
 * Cliente de WhatsApp vía Kapso.
 * Requiere KAPSO_API_KEY y KAPSO_PHONE_NUMBER_ID (ver .env.example).
 */
let _client = null;

function getKapsoClient() {
  if (!_client) {
    _client = new WhatsAppClient({
      baseUrl: process.env.KAPSO_BASE_URL || 'https://api.kapso.ai/meta/whatsapp',
      kapsoApiKey: process.env.KAPSO_API_KEY,
    });
  }
  return _client;
}

module.exports = {
  getKapsoClient,
  get KAPSO_PHONE_NUMBER_ID() {
    return process.env.KAPSO_PHONE_NUMBER_ID;
  },
};
