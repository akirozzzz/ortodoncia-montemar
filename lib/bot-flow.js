const { getKapsoClient, KAPSO_PHONE_NUMBER_ID } = require('./kapso-client');
const { SERVICES, getService, finalPrice } = require('./services-catalog');
const { createCheckoutSession } = require('./fintoc-client');
const { getConversationState, setConversationState, createBooking } = require('./store');

/**
 * ⚠️ Mismos horarios que aparecen hoy en el <select> del modal de reserva
 * de index.html (09:00, 10:30, 14:00, 16:00). Como el sitio no tiene
 * backend, esos horarios tampoco se validan contra disponibilidad real allá
 * — y acá tampoco. Antes de lanzar esto en serio, conviene que ambos (web y
 * bot) consulten una misma fuente de disponibilidad para no ofrecer una
 * hora que ya está tomada.
 */
const SLOTS = ['09:00', '10:30', '14:00', '16:00'];

const FAQ = {
  kids: 'Ortodoncia Infantil: diagnóstico temprano y guía del desarrollo facial en niños, antes de que un problema de mordida se complique.',
  invisalign: 'Invisalign Expert: alineadores transparentes y removibles, con resultados predecibles y revisiones periódicas.',
  brackets: 'Brackets Estéticos: tratamiento integral con control mensual, discretos y del color del diente.',
  vip: 'Plan VIP Integral: atención prioritaria, chequeos ilimitados y acceso 24/7 al equipo.',
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
      body: 'Un miembro de nuestro equipo te va a escribir por este mismo chat a la brevedad. 🦷',
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
      bodyText: '¿Querés agendar una hora para este tratamiento?',
      buttons: [
        { id: `agendar_${serviceId}`, title: 'Agendar hora' },
        { id: 'menu', title: 'Volver al menú' },
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
    return startCheckout(msg.phone, msg.contactName, state.serviceId, selection);
  }

  return sendMainMenu(msg.phone);
}
async function startCheckout(phone, contactName, serviceId, slot) {
  const service = getService(serviceId);
  if (!service) return sendMainMenu(phone);

  const patientName = contactName || 'Paciente';
  const bookingId = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const amount = finalPrice(service);

  await createBooking({
    id: bookingId,
    phone,
    serviceId,
    slot,
    patientName,
    status: 'pending_payment',
    createdAt: new Date().toISOString(),
  });

  const baseUrl = process.env.APP_BASE_URL;
  const session = await createCheckoutSession({
    amount,
    successUrl: `${baseUrl}/?pago=exitoso&booking=${bookingId}`,
    cancelUrl: `${baseUrl}/?pago=cancelado&booking=${bookingId}`,
    productName: `Reserva - ${service.name} (${slot})`,
    customerName: patientName,
    metadata: { bookingId, phone, serviceId },
  });

  await setConversationState(phone, {
    step: 'awaiting_payment',
    serviceId,
    slot,
    bookingId,
    updatedAt: new Date().toISOString(),
  });

  await getKapsoClient().messages.sendInteractiveCtaUrl({
    phoneNumberId: KAPSO_PHONE_NUMBER_ID,
    to: phone,
    bodyText: `Perfecto, dejamos pre-reservada tu hora del ${slot} para ${service.name}. Para confirmarla, pagá $${amount.toLocaleString(
      'es-CL'
    )} CLP:`,
    parameters: { displayText: 'Pagar y confirmar', url: session.redirect_url },
  });
}

function normalize(text) {
  return text.trim().toLowerCase();
}

async function sendMainMenu(phone) {
  await getKapsoClient().messages.sendInteractiveList({
    phoneNumberId: KAPSO_PHONE_NUMBER_ID,
    to: phone,
    bodyText: 'Hola, soy el asistente de Ortodoncia Montemar 👋 ¿En qué te ayudo?',
    buttonText: 'Ver opciones',
    sections: [
      {
        title: 'Tratamientos',
        rows: [
          { id: 'faq_kids', title: 'Ortodoncia Infantil', description: 'Diagnóstico temprano' },
          { id: 'faq_invisalign', title: 'Invisalign Expert', description: 'Alineadores invisibles' },
          { id: 'faq_brackets', title: 'Brackets Estéticos', description: 'Discretos, control mensual' },
          { id: 'faq_vip', title: 'Plan VIP Integral', description: 'Atención prioritaria' },
        ],
      },
      {
        title: 'Otras opciones',
        rows: [
          { id: 'agendar', title: 'Agendar una hora', description: 'Reservar y pagar tu cita' },
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
    bodyText: '¿Para qué tratamiento querés agendar?',
    buttonText: 'Elegir tratamiento',
    sections: [
      {
        title: 'Planes',
        rows: SERVICES.map((s) => ({
          id: s.id,
          title: s.name,
          description: `$${finalPrice(s).toLocaleString('es-CL')} CLP${s.discountPercent ? ` (-${s.discountPercent}%)` : ''}`,
        })),
      },
    ],
  });
}

async function sendSlotList(phone) {
  await getKapsoClient().messages.sendInteractiveList({
    phoneNumberId: KAPSO_PHONE_NUMBER_ID,
    to: phone,
    bodyText: 'Elegí un horario disponible:',
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
