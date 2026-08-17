const { getKapsoClient, KAPSO_PHONE_NUMBER_ID } = require('./kapso-client');
const { SERVICES, getService, finalPrice } = require('./services-catalog');
const { getConversationState, setConversationState, createBooking } = require('./store');

/**
 * Mismos horarios que aparecen hoy en el <select> del modal de reserva
 * de index.html (09:00, 10:30, 14:00, 16:00). Como el sitio no tiene
 * backend de disponibilidad real, aca tampoco se valida contra eso.
 */
const SLOTS = ['09:00', '10:30', '14:00', '16:00'];

const FAQ = {
  evaluacion: 'Primera Consulta (Evaluacion): revision clinica inicial para armar tu plan de tratamiento. No tiene costo.',
  kids: 'Ortodoncia Infantil: diagnostico temprano y guia del desarrollo facial en ninos, antes de que un problema de mordida se complique.',
  brackets: 'Brackets Esteticos: tratamiento integral con control mensual, discretos y del color del diente.',
  zafiro: 'Brackets de Zafiro: practicamente transparentes y muy resistentes, con el mismo seguimiento mensual de un ortodoncista especialista.',
  vip: 'Plan VIP Integral: atencion prioritaria, chequeos ilimitados y acceso 24/7 al equipo.',
};

/**
 * @param {object} msg
 * @param {string} msg.phone
 * @param {string} [msg.contactName]
 * @param {'text'|'interactive'} msg.type
 * @param {string} [msg.text]
 * @param {string} [msg.interactiveId]
 */
async function handleInboundMessage(msg) {
  const state = (await getConversationState(msg.phone)) || {
    step: 'menu',
    updatedAt: new Date().toISOString(),
  };

  const selection = (msg.interactiveId || normalize(msg.text || '')).trim();

  if (['menu', 'hola', 'inicio', 'hi', 'buenas'].includes(selection)) {
    await setConversationState(msg.phone, { step: 'menu', updatedAt: new Date().toISOString() });
    return sendMainMenu(msg.phone);
  }

  if (selection === 'asesor') {
    await getKapsoClient().messages.sendText({
      phoneNumberId: KAPSO_PHONE_NUMBER_ID,
      to: msg.phone,
      body: 'Un miembro de nuestro equipo te va a escribir por este mismo chat a la brevedad.',
    });
    return;
  }

  if (selection.startsWith('faq_')) {
    const serviceId = selection.replace('faq_', '');
    const answer = FAQ[serviceId] || 'No tengo esa info a mano, te paso con el equipo.';
    const client = getKapsoClient();
    await client.messages.sendText({ phoneNumberId: KAPSO_PHONE_NUMBER_ID, to: msg.phone, body: answer });
    await client.messages.sendInteractiveButtons({
      phoneNumberId: KAPSO_PHONE_NUMBER_ID,
      to: msg.phone,
      bodyText: 'Queres agendar una hora para este tratamiento?',
      buttons: [
        { id: `agendar_${serviceId}`, title: 'Agendar hora' },
        { id: 'menu', title: 'Volver al menu' },
      ],
    });
    return;
  }

  if (selection === 'agendar' || selection.startsWith('agendar_')) {
    const preselected = selection.startsWith('agendar_') ? selection.replace('agendar_', '') : undefined;
    if (preselected && getService(preselected)) {
      await setConversationState(msg.phone, {
        step: 'choose_slot',
        serviceId: preselected,
        updatedAt: new Date().toISOString(),
      });
      return sendSlotList(msg.phone);
    }
    await setConversationState(msg.phone, { step: 'choose_service', updatedAt: new Date().toISOString() });
    return sendServiceList(msg.phone);
  }

  if (state.step === 'choose_service' && getService(selection)) {
    await setConversationState(msg.phone, {
      step: 'choose_slot',
      serviceId: selection,
      updatedAt: new Date().toISOString(),
    });
    return sendSlotList(msg.phone);
  }

  if (state.step === 'choose_slot' && SLOTS.includes(selection) && state.serviceId) {
    return confirmBooking(msg.phone, msg.contactName, state.serviceId, selection);
  }

  return sendMainMenu(msg.phone);
}

/**
 * Confirma la reserva sin pago online: no usamos Fintoc porque la clinica
 * no cumple los requisitos que exige para operar. Guardamos la reserva y
 * avisamos por WhatsApp; el pago de los planes pagados se coordina
 * despues, directamente con el paciente (efectivo, transferencia o en la
 * clinica).
 */
async function confirmBooking(phone, contactName, serviceId, slot) {
  const service = getService(serviceId);
  if (!service) return sendMainMenu(phone);

  const patientName = contactName || 'Paciente';
  const bookingId = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const isFree = service.priceCLP === 0;

  await createBooking({
    id: bookingId,
    channel: 'whatsapp',
    phone,
    serviceId,
    slot,
    patientName,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  await setConversationState(phone, {
    step: 'menu',
    updatedAt: new Date().toISOString(),
  });

  const body = isFree
    ? `Listo, dejamos agendada tu evaluacion (sin costo) para el ${slot}. Nuestro equipo te contacta para confirmar.`
    : `Listo, dejamos agendada tu hora del ${slot} para ${service.name}. El valor es $${finalPrice(service).toLocaleString('es-CL')} CLP, que coordinamos directamente con vos (efectivo, transferencia o en la clinica) - nuestro equipo te contacta para confirmar.`;

  await getKapsoClient().messages.sendText({
    phoneNumberId: KAPSO_PHONE_NUMBER_ID,
    to: phone,
    body,
  });
}

function normalize(text) {
  return text.trim().toLowerCase();
}

async function sendMainMenu(phone) {
  await getKapsoClient().messages.sendInteractiveList({
    phoneNumberId: KAPSO_PHONE_NUMBER_ID,
    to: phone,
    bodyText: 'Hola, soy el asistente de Ortodoncia Montemar. En que te ayudo?',
    buttonText: 'Ver opciones',
    sections: [
      {
        title: 'Tratamientos',
        rows: [
          { id: 'faq_evaluacion', title: 'Primera Consulta', description: 'Evaluacion sin costo' },
          { id: 'faq_kids', title: 'Ortodoncia Infantil', description: 'Diagnostico temprano' },
          { id: 'faq_brackets', title: 'Brackets Esteticos', description: 'Discretos, control mensual' },
          { id: 'faq_zafiro', title: 'Brackets de Zafiro', description: 'Practicamente transparentes' },
          { id: 'faq_vip', title: 'Plan VIP Integral', description: 'Atencion prioritaria' },
        ],
      },
      {
        title: 'Otras opciones',
        rows: [
          { id: 'agendar', title: 'Agendar una hora', description: 'Reservar sin pago online' },
          { id: 'asesor', title: 'Hablar con un asesor', description: 'Te contacta el equipo' },
        ],
      },
    ],
  });
}
async function sendServiceList(phone) {
  await getKapsoClient().messages.sendInteractiveList({
    phoneNumberId: KAPSO_PHONE_NUMBER_ID,
    to: phone,
    bodyText: 'Para que tratamiento queres agendar?',
    buttonText: 'Elegir tratamiento',
    sections: [
      {
        title: 'Planes',
        rows: SERVICES.map((s) => ({
          id: s.id,
          title: s.name,
          description: s.priceCLP === 0
            ? 'Sin costo'
            : `$${finalPrice(s).toLocaleString('es-CL')} CLP${s.discountPercent ? ` (-${s.discountPercent}%)` : ''}`,
        })),
      },
    ],
  });
}

async function sendSlotList(phone) {
  await getKapsoClient().messages.sendInteractiveList({
    phoneNumberId: KAPSO_PHONE_NUMBER_ID,
    to: phone,
    bodyText: 'Elegi un horario disponible:',
    buttonText: 'Ver horarios',
    sections: [
      {
        title: 'Horarios',
        rows: SLOTS.map((s) => ({ id: s, title: s })),
      },
    ],
  });
}

module.exports = { handleInboundMessage };
