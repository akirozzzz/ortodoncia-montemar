const { Fintoc } = require('fintoc');

/**
 * Cliente de Fintoc para crear Checkout Sessions (cobros CLP).
 * Requiere FINTOC_SECRET_KEY (ver .env.example).
 */
let _client = null;

function getFintocClient() {
  if (!_client) {
    _client = new Fintoc(process.env.FINTOC_SECRET_KEY);
  }
  return _client;
}

/**
 * @param {object} opts
 * @param {number} opts.amount - monto en CLP (sin decimales)
 * @param {string} opts.successUrl
 * @param {string} opts.cancelUrl
 * @param {string} opts.productName
 * @param {string} [opts.customerName]
 * @param {string} [opts.customerEmail]
 * @param {Record<string,string>} [opts.metadata]
 */
async function createCheckoutSession(opts) {
  const fintoc = getFintocClient();
  const currency = opts.currency || 'CLP';

  const payload = {
    amount: opts.amount,
    currency,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: opts.amount,
          product_data: { name: opts.productName },
        },
      },
    ],
    metadata: opts.metadata || {},
  };

  if (opts.customerEmail || opts.customerName) {
    payload.customer_data = {
      name: opts.customerName,
      email: opts.customerEmail,
      metadata: {},
    };
  }

  return fintoc.checkoutSessions.create(payload);
}

module.exports = { createCheckoutSession };
