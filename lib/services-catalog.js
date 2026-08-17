/**
 * Mismos planes que state.services en script.js (seccion "Brackets" del
 * sitio). El bot de WhatsApp no cobra estos precios online, ver bot-flow.js:
 * no usamos Fintoc porque la clinica no cumple los requisitos que exige
 * para operar.
 *
 * El panel admin del sitio permite "editar" precio/descuento de cada
 * servicio, pero ese cambio vive solo en la memoria del navegador de quien
 * lo edita, no se guarda en ningun backend, y por lo tanto tampoco se
 * reflejaria aca. Si cambias un precio en la web, actualiza tambien este
 * archivo a mano.
 */

const SERVICES = [
  {
    id: 'evaluacion',
    name: 'Primera Consulta (Evaluacion)',
    description: 'Evaluacion clinica inicial para definir tu plan de tratamiento. Sin costo.',
    priceCLP: 0,
    discountPercent: 0,
  },
  {
    id: 'kids',
    name: 'Ortodoncia Infantil',
    description: 'Diagnostico temprano y guia del desarrollo facial.',
    priceCLP: 180000,
    discountPercent: 0,
  },
  {
    id: 'brackets',
    name: 'Brackets Esteticos',
    description: 'Tratamiento integral con control mensual.',
    priceCLP: 890000,
    discountPercent: 0,
  },
  {
    id: 'zafiro',
    name: 'Brackets de Zafiro',
    description: 'Practicamente transparentes, muy resistentes, con seguimiento de un ortodoncista especialista.',
    priceCLP: 1450000,
    discountPercent: 15,
  },
  {
    id: 'vip',
    name: 'Plan VIP Integral',
    description: 'Atencion prioritaria, chequeos ilimitados, acceso 24/7.',
    priceCLP: 2100000,
    discountPercent: 10,
  },
];

function getService(id) {
  return SERVICES.find((s) => s.id === id);
}

/** Precio final en CLP, con el descuento ya aplicado (mismo calculo que renderPlans() en script.js). */
function finalPrice(service) {
  return Math.round(service.priceCLP * (1 - service.discountPercent / 100));
}

module.exports = { SERVICES, getService, finalPrice };
