/**
 * ⚠️ IMPORTANTE: estos son los mismos 4 planes que hoy están hardcodeados en
 * state.services dentro de script.js (los que se ven en la sección
 * "Planes y tarifas" del sitio). Los copié tal cual para que el bot de
 * WhatsApp cobre exactamente lo mismo que se promete en la web.
 *
 * El panel admin del sitio permite "editar" precio/descuento de cada
 * servicio, pero ese cambio vive solo en la memoria del navegador de quien
 * lo edita — no se guarda en ningún backend, se pierde al recargar la
 * página, y por lo tanto tampoco se reflejaría acá. Si en algún momento
 * necesitás que un cambio de precio en el panel admin se refleje también en
 * el bot de WhatsApp (y viceversa), lo que hace falta es un origen de datos
 * único (por ejemplo, un endpoint /api/services respaldado por Redis o
 * tu base de datos) del que lean tanto script.js como este archivo. Por
 * ahora, si cambiás un precio en la web, actualizá también este archivo a
 * mano.
 */

const SERVICES = [
  {
    id: 'kids',
    name: 'Ortodoncia Infantil',
    description: 'Diagnóstico temprano y guía del desarrollo facial.',
    priceCLP: 180000,
    discountPercent: 0,
  },
  {
    id: 'invisalign',
    name: 'Invisalign Expert',
    description: 'Alineadores invisibles, resultados predecibles.',
    priceCLP: 1450000,
    discountPercent: 15,
  },
  {
    id: 'brackets',
    name: 'Brackets Estéticos',
    description: 'Tratamiento integral con control mensual.',
    priceCLP: 890000,
    discountPercent: 0,
  },
  {
    id: 'vip',
    name: 'Plan VIP Integral',
    description: 'Atención prioritaria, chequeos ilimitados, acceso 24/7.',
    priceCLP: 2100000,
    discountPercent: 10,
  },
];

function getService(id) {
  return SERVICES.find((s) => s.id === id);
}

/** Precio final en CLP, con el descuento ya aplicado (mismo cálculo que renderPlans() en script.js). */
function finalPrice(service) {
  return Math.round(service.priceCLP * (1 - service.discountPercent / 100));
}

module.exports = { SERVICES, getService, finalPrice };
