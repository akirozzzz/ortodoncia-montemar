// Ortodoncia Montemar - logica del sitio (rediseno premium, misma funcionalidad de fondo)
(function () {
  'use strict';

  const WHATSAPP_NUMBER = '56920403095'; // Kapso Sandbox (numero de prueba). Para produccion, cambiar por el numero real de WhatsApp Business verificado en Meta.
  const WHATSAPP_TEXT = encodeURIComponent('Hola, quiero reservar una hora en Ortodoncia Montemar');
  const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_TEXT}`;

  function formatCLP(n) {
    return '$' + Math.round(n).toLocaleString('es-CL');
  }

  const state = {
    loginOpen: false,
    bookingOpen: false,
    bookingStep: 'plan', // plan | payment | success
    selectedPlanId: null,
    selectedDate: '',
    selectedTime: '',
    patientName: '',
    patientEmail: '',
    clientOpen: false,
    clientName: 'Maria Fernanda',
    clientUpcoming: { service: 'Brackets de Zafiro', date: '2026-07-28', time: '11:00', status: 'confirmed' },
    reviews: [
      { name: 'Javiera R.', text: 'Explicaron cada paso del tratamiento con total transparencia. Hoy sonrio distinto.', rating: 5, date: 'Jun 2026' }
    ],
    newReviewText: '',
    newReviewRating: 5,
    services: [
      { id: 'evaluacion', name: 'Primera Consulta (Evaluacion)', price: 0, discount: 0, discountOn: false, desc: 'Evaluacion clinica inicial para definir tu plan de tratamiento. Sin costo.' },
      { id: 'kids', name: 'Ortodoncia Infantil', price: 180000, discount: 0, discountOn: false, desc: 'Diagnostico temprano y guia del desarrollo facial.' },
      { id: 'zafiro', name: 'Brackets de Zafiro', price: 1450000, discount: 15, discountOn: true, desc: 'Practicamente transparentes, muy resistentes, con seguimiento de un ortodoncista especialista.' },
      { id: 'brackets', name: 'Brackets Esteticos', price: 890000, discount: 0, discountOn: false, desc: 'Tratamiento integral con control mensual.' },
      { id: 'vip', name: 'Plan VIP Integral', price: 2100000, discount: 10, discountOn: true, desc: 'Atencion prioritaria, chequeos ilimitados, acceso 24/7.' }
    ],
    appointments: [
      { id: 1, name: 'Constanza Ibanez', service: 'Brackets de Zafiro', date: '2026-07-22', time: '10:30', status: 'pending' },
      { id: 2, name: 'Tomas Vidal', service: 'Brackets Esteticos', date: '2026-07-23', time: '16:00', status: 'confirmed' },
      { id: 3, name: 'Rocio Salas', service: 'Plan VIP Integral', date: '2026-07-18', time: '09:00', status: 'cancelled' }
    ],
    adminOpen: false,
    adminTab: 'reservas',
    nextApptId: 4
  };

  function servicesComputed() {
    return state.services.map(sv => ({
      ...sv,
      priceLabel: formatCLP(sv.price),
      finalPriceLabel: formatCLP(sv.price * (1 - (sv.discountOn ? sv.discount : 0) / 100)),
      effectiveDiscount: sv.discountOn ? sv.discount : 0
    }));
  }

  function selectedPlan() {
    return servicesComputed().find(sv => sv.id === state.selectedPlanId);
  }

  // ---------- DOM refs ----------
  const $ = (id) => document.getElementById(id);
  const nav = $('nav');

  const heroWaTargets = [$('wa-float-link'), $('contacto-wa-link')].filter(Boolean);
  heroWaTargets.forEach(el => { el.href = WHATSAPP_LINK; });

  // ---------- NAV on scroll ----------
  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- Reveal on scroll (fade + pequeno movimiento, sin exagerar) ----------
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  // ---------- Login modal ----------
  const loginModal = $('login-modal');
  function openLogin() { loginModal.classList.add('open'); }
  function closeLoginFn() { loginModal.classList.remove('open'); }
  $('open-login-nav').addEventListener('click', openLogin);
  $('open-login-footer').addEventListener('click', (e) => { e.preventDefault(); openLogin(); });
  $('close-login').addEventListener('click', closeLoginFn);
  $('submit-login').addEventListener('click', () => {
    closeLoginFn();
    openClient();
  });

  // ---------- Booking modal ----------
  const bookingModal = $('booking-modal');
  const stepPlanEl = $('step-plan');
  const stepPaymentEl = $('step-payment');
  const stepSuccessEl = $('step-success');

  function setBookingStep(step) {
    state.bookingStep = step;
    stepPlanEl.classList.toggle('active', step === 'plan');
    stepPaymentEl.classList.toggle('active', step === 'payment');
    stepSuccessEl.classList.toggle('active', step === 'success');
  }

  function openBooking(planId) {
    state.selectedPlanId = planId;
    state.selectedDate = '';
    state.selectedTime = '';
    $('booking-date').value = '';
    $('booking-time').value = '';
    $('patient-name').value = '';
    $('patient-email').value = '';
    const plan = selectedPlan();
    $('booking-plan-name').textContent = plan ? plan.name : 'Evaluacion general';
    $('booking-plan-price-note').textContent = plan && plan.price === 0 ? 'Sin costo' : '';
    $('success-title').textContent = 'Reserva confirmada';
    $('success-text').textContent = 'Te enviamos el detalle a tu correo. Tu hora quedara confirmada por el equipo dentro de 24 horas.';
    setBookingStep('plan');
    bookingModal.classList.add('open');
  }
  window.openBooking = openBooking; // usado por los CTA del chat

  function closeBookingFn() {
    bookingModal.classList.remove('open');
    setBookingStep('plan');
  }

  $('close-booking').addEventListener('click', closeBookingFn);
  $('close-booking-success').addEventListener('click', closeBookingFn);

  $('booking-date').addEventListener('change', (e) => { state.selectedDate = e.target.value; });
  $('booking-time').addEventListener('change', (e) => { state.selectedTime = e.target.value; });

  $('go-payment').addEventListener('click', () => {
    if (!state.selectedDate || !state.selectedTime) return;
    const plan = selectedPlan();
    if (!plan) {
      alert('Elegi un tratamiento en la seccion Brackets antes de agendar.');
      return;
    }
    const isFree = plan.price === 0;
    $('payment-plan-name').textContent = plan.name;
    $('payment-plan-price').textContent = isFree ? 'Sin costo' : plan.finalPriceLabel;
    $('payment-ssl-row').style.display = isFree ? 'none' : '';
    $('submit-payment-label').textContent = isFree ? 'Confirmar hora' : 'Pagar con Fintoc';
    $('submit-payment-price').textContent = isFree ? '' : plan.finalPriceLabel;
    $('payment-fintoc-note').textContent = isFree
      ? 'Es tu primera consulta: no tiene costo. Solo confirmamos tus datos y la hora.'
      : 'Te llevamos a la pasarela segura de Fintoc para completar el pago.';
    setBookingStep('payment');
  });

  $('patient-name').addEventListener('input', (e) => { state.patientName = e.target.value; });
  $('patient-email').addEventListener('input', (e) => { state.patientEmail = e.target.value; });

  // ---------- Pago real con Fintoc ----------
  // Creamos la reserva + una Checkout Session en el servidor
  // (api/payments/create-checkout-session.js) y redirigimos el navegador a
  // la pasarela hospedada de Fintoc. El resultado final lo confirma el
  // webhook de Fintoc; por eso al volver del pago consultamos
  // /api/bookings/status en checkPaymentReturn().
  $('submit-payment').addEventListener('click', async () => {
    const plan = selectedPlan();
    if (!plan) return;
    const name = (state.patientName || '').trim();
    if (!name) {
      $('patient-name').focus();
      return;
    }

    const isFree = plan.price === 0;
    const btn = $('submit-payment');
    const label = $('submit-payment-label');
    btn.disabled = true;
    label.textContent = isFree ? 'Confirmando...' : 'Redirigiendo a Fintoc...';

    // Evaluacion gratuita: no pasa por Fintoc, se confirma directo.
    if (isFree) {
      try {
        const res = await fetch('/api/bookings/create-free', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceId: plan.id,
            patientName: name,
            patientEmail: (state.patientEmail || '').trim() || undefined,
            date: state.selectedDate,
            time: state.selectedTime
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo agendar la hora');
        $('success-title').textContent = 'Evaluacion agendada';
        $('success-text').textContent = 'Te esperamos en tu horario elegido. Es tu primera consulta y no tiene costo - ahi evaluamos tu caso y te damos el plan de tratamiento recomendado.';
        setBookingStep('success');
        btn.disabled = false;
        label.textContent = 'Confirmar hora';
      } catch (err) {
        alert('No se pudo agendar tu hora. Intenta nuevamente o escribenos por WhatsApp.');
        btn.disabled = false;
        label.textContent = 'Confirmar hora';
      }
      return;
    }

    try {
      const res = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: plan.id,
          patientName: name,
          patientEmail: (state.patientEmail || '').trim() || undefined,
          date: state.selectedDate,
          time: state.selectedTime
        })
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) throw new Error(data.error || 'Error al iniciar el pago');
      window.location.href = data.checkoutUrl;
    } catch (err) {
      alert('No se pudo iniciar el pago. Intenta nuevamente o escribenos por WhatsApp.');
      btn.disabled = false;
      label.textContent = 'Pagar con Fintoc';
    }
  });

  // ---------- Regreso desde la pasarela de Fintoc ----------
  async function checkPaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get('booking');
    const pago = params.get('pago');
    if (!bookingId || !pago) return;

    window.history.replaceState({}, '', window.location.pathname);
    bookingModal.classList.add('open');
    setBookingStep('success');

    const titleEl = $('success-title');
    const textEl = $('success-text');

    if (pago === 'cancelado') {
      titleEl.textContent = 'Pago no completado';
      textEl.textContent = 'No alcanzaste a terminar el pago. Podes intentarlo de nuevo cuando quieras desde Brackets.';
      return;
    }

    titleEl.textContent = 'Confirmando tu pago...';
    textEl.textContent = 'Danos un momento mientras confirmamos el pago con Fintoc.';

    for (let i = 0; i < 8; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        const res = await fetch(`/api/bookings/status?id=${encodeURIComponent(bookingId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'paid') {
            titleEl.textContent = 'Reserva confirmada';
            textEl.textContent = 'Te enviamos el detalle a tu correo. Tu hora quedara confirmada por el equipo dentro de 24 horas.';
            return;
          }
          if (data.status === 'failed') {
            titleEl.textContent = 'El pago no se pudo procesar';
            textEl.textContent = 'Intenta nuevamente o escribenos por WhatsApp para ayudarte.';
            return;
          }
        }
      } catch (err) {
        // seguimos intentando
      }
    }
    titleEl.textContent = 'Estamos confirmando tu pago';
    textEl.textContent = 'Puede tardar unos minutos. Te avisaremos por correo apenas quede confirmado.';
  }

  // hero + brackets CTAs
  // El boton del hero lleva a la evaluacion (primera consulta), que es gratis.
  // El de Brackets lleva a cotizar un tratamiento especifico (pago con Fintoc).
  $('hero-cta-agendar').addEventListener('click', () => openBooking('evaluacion'));
  $('brackets-cotizar-btn').addEventListener('click', () => openBooking('brackets'));

  // ---------- Brackets: detalle al hacer clic en cada tarjeta ----------
  const bracketDetailModal = $('bracket-detail-modal');
  function openBracketDetail(ds) {
    $('bracket-detail-img').src = ds.img;
    $('bracket-detail-img').alt = ds.title;
    $('bracket-detail-title').textContent = ds.title;
    $('bracket-detail-desc').textContent = ds.detail;
    $('bracket-detail-cta').onclick = () => {
      closeBracketDetailFn();
      openBooking(ds.plan);
    };
    bracketDetailModal.classList.add('open');
  }
  function closeBracketDetailFn() { bracketDetailModal.classList.remove('open'); }
  $('close-bracket-detail').addEventListener('click', closeBracketDetailFn);
  document.querySelectorAll('.brackets-card').forEach(card => {
    card.addEventListener('click', () => openBracketDetail(card.dataset));
  });

  // ---------- Reviews ----------
  const reviewsList = $('reviews-list');
  function renderReviews() {
    const stars = (r) => '*'.repeat(r) + '-'.repeat(5 - r);
    let html = state.reviews.map(r => `
      <div class="review-card">
        <div class="review-top">
          <div class="review-name">${r.name}</div>
          <div class="review-meta">${r.date}</div>
        </div>
        <div class="review-stars">${stars(r.rating)}</div>
        <p class="review-text">${r.text}</p>
      </div>
    `).join('');

    if (state.reviews.length === 0) {
      html += `<div class="no-reviews">Aun no hay resenas publicas - las reales apareceran aqui apenas los pacientes las publiquen desde su portal.</div>`;
    }
    html += `<button class="review-login-btn" id="review-open-login">Inicia sesion para dejar tu resena</button>`;
    reviewsList.innerHTML = html;
    $('review-open-login').addEventListener('click', openLogin);
  }

  // ---------- Client portal ----------
  const clientOverlay = $('client-overlay');
  function openClient() {
    $('client-name').textContent = state.clientName;
    renderClientUpcoming();
    renderStars();
    clientOverlay.classList.add('open');
  }
  function closeClientFn() { clientOverlay.classList.remove('open'); }
  $('close-client').addEventListener('click', closeClientFn);

  function renderClientUpcoming() {
    const wrap = $('client-upcoming-wrap');
    const up = state.clientUpcoming;
    if (up) {
      const statusLabel = up.status === 'confirmed' ? 'Confirmada' : 'Pendiente de confirmacion';
      wrap.innerHTML = `
        <div class="upcoming-card">
          <div>
            <div class="upcoming-service">${up.service}</div>
            <div class="upcoming-meta">${up.date} - ${up.time} hrs</div>
            <div class="upcoming-status">${statusLabel}</div>
          </div>
          <div class="upcoming-actions">
            <button class="btn-outline-dark" id="reschedule-btn">Reprogramar</button>
            <button class="btn-cancel" id="cancel-upcoming-btn">Cancelar</button>
          </div>
        </div>`;
      $('reschedule-btn').addEventListener('click', () => {
        closeClientFn();
        const plan = state.services.find(sv => sv.name === up.service);
        openBooking(plan ? plan.id : null);
      });
      $('cancel-upcoming-btn').addEventListener('click', () => {
        state.clientUpcoming = null;
        renderClientUpcoming();
      });
    } else {
      wrap.innerHTML = `<div class="no-upcoming">No tienes horas proximas. <a href="#brackets" id="no-upcoming-link">Cotiza un tratamiento</a>.</div>`;
      $('no-upcoming-link').addEventListener('click', closeClientFn);
    }
  }

  function renderStars() {
    const row = $('star-row');
    row.innerHTML = [1, 2, 3, 4, 5].map(n => `<button class="star-btn ${n <= state.newReviewRating ? 'active' : ''}" data-star="${n}">*</button>`).join('');
    row.querySelectorAll('.star-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.newReviewRating = Number(btn.dataset.star);
        renderStars();
      });
    });
  }

  $('review-text').addEventListener('input', (e) => { state.newReviewText = e.target.value; });
  $('submit-review').addEventListener('click', () => {
    if (!state.newReviewText.trim()) return;
    state.reviews.push({ name: state.clientName, text: state.newReviewText.trim(), rating: state.newReviewRating, date: 'Jul 2026' });
    state.newReviewText = '';
    state.newReviewRating = 5;
    $('review-text').value = '';
    renderStars();
    renderReviews();
  });

  // ---------- Admin panel ----------
  const adminOverlay = $('admin-overlay');
  function openAdmin() {
    adminOverlay.classList.add('open');
    renderAppointmentsAdmin();
    renderServicesAdmin();
    renderStats();
  }
  function closeAdminFn() { adminOverlay.classList.remove('open'); }
  $('open-admin-footer').addEventListener('click', (e) => { e.preventDefault(); openAdmin(); });
  $('close-admin').addEventListener('click', closeAdminFn);

  const tabButtons = document.querySelectorAll('.admin-tab-btn');
  const tabPanels = {
    reservas: $('panel-reservas'),
    servicios: $('panel-servicios'),
    estadisticas: $('panel-estadisticas')
  };
  function setAdminTab(tab) {
    state.adminTab = tab;
    tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    Object.keys(tabPanels).forEach(key => tabPanels[key].classList.toggle('active', key === tab));
  }
  tabButtons.forEach(btn => btn.addEventListener('click', () => setAdminTab(btn.dataset.tab)));
  setAdminTab('reservas');

  function renderAppointmentsAdmin() {
    const el = $('appointments-list');
    const statusLabel = (s) => s === 'pending' ? 'Pendiente' : s === 'confirmed' ? 'Confirmada' : 'Cancelada';
    el.innerHTML = state.appointments.map(a => `
      <div class="appt-row">
        <div>
          <div class="appt-name">${a.name}</div>
          <div class="appt-meta">${a.service} - ${a.date} - ${a.time}</div>
        </div>
        <div class="appt-right">
          <div class="appt-badge ${a.status}">${statusLabel(a.status)}</div>
          ${a.status === 'pending' ? `
            <button class="btn-confirm" data-action="confirm" data-id="${a.id}">Confirmar</button>
            <button class="btn-cancel-sm" data-action="cancel" data-id="${a.id}">Cancelar</button>
          ` : ''}
          ${a.status === 'confirmed' ? `
            <button class="btn-cancel-outline" data-action="cancel" data-id="${a.id}">Cancelar</button>
          ` : ''}
        </div>
      </div>
    `).join('');

    el.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const status = btn.dataset.action === 'confirm' ? 'confirmed' : 'cancelled';
        const appt = state.appointments.find(a => a.id === id);
        if (appt) appt.status = status;
        renderAppointmentsAdmin();
        renderStats();
      });
    });
  }

  function renderServicesAdmin() {
    const el = $('services-admin-list');
    el.innerHTML = state.services.map(sv => `
      <div class="service-row">
        <div class="service-row-name">${sv.name}</div>
        <div class="price-field-wrap">
          <span>Precio CLP</span>
          <input type="number" class="price-input" data-id="${sv.id}" data-field="price" value="${sv.price}"/>
        </div>
        <label class="discount-toggle-label">
          <input type="checkbox" data-id="${sv.id}" data-field="discountOn" ${sv.discountOn ? 'checked' : ''}/> Descuento activo
        </label>
        ${sv.discountOn ? `
          <div class="price-field-wrap">
            <input type="number" class="discount-input" data-id="${sv.id}" data-field="discount" value="${sv.discount}"/>
            <span>% off</span>
          </div>
        ` : ''}
      </div>
    `).join('');

    el.querySelectorAll('input').forEach(input => {
      const evt = input.type === 'checkbox' ? 'change' : 'input';
      input.addEventListener(evt, () => {
        const sv = state.services.find(s => s.id === input.dataset.id);
        if (!sv) return;
        if (input.dataset.field === 'price') sv.price = Number(input.value) || 0;
        if (input.dataset.field === 'discount') sv.discount = Number(input.value) || 0;
        if (input.dataset.field === 'discountOn') sv.discountOn = input.checked;
        renderServicesAdmin();
        renderStats();
      });
    });
  }

  function renderStats() {
    const appts = state.appointments;
    const services = servicesComputed();
    const countPending = appts.filter(a => a.status === 'pending').length;
    const countConfirmed = appts.filter(a => a.status === 'confirmed').length;
    const countCancelled = appts.filter(a => a.status === 'cancelled').length;
    const revenue = appts.filter(a => a.status === 'confirmed').reduce((sum, a) => {
      const match = services.find(sv => sv.name === a.service);
      return sum + (match ? match.price * (1 - match.effectiveDiscount / 100) : 0);
    }, 0);
    $('stat-pending').textContent = countPending;
    $('stat-confirmed').textContent = countConfirmed;
    $('stat-cancelled').textContent = countCancelled;
    $('stat-revenue').textContent = formatCLP(revenue);
  }

  // ============================================================
  // CHAT DEL HERO - interfaz lista para conectar a una IA real.
  // Por ahora usa respuestas enlatadas (sin backend) para dejar
  // toda la experiencia armada: burbujas, sugerencias, "escribiendo...".
  // ============================================================
  const chatLog = $('chat-log');
  const chatInput = $('chat-input');
  const chatSend = $('chat-send');
  const chatSuggestions = $('chat-suggestions');
  const chatPrompt = $('chat-prompt');

  function addBubble(text, who, ctaLabel, ctaFn) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${who}`;
    bubble.textContent = text;
    if (ctaLabel && ctaFn) {
      const cta = document.createElement('div');
      cta.className = 'chat-bubble-cta';
      cta.textContent = ctaLabel;
      cta.addEventListener('click', ctaFn);
      bubble.appendChild(document.createElement('br'));
      bubble.appendChild(cta);
    }
    chatLog.appendChild(bubble);
    chatLog.scrollTop = chatLog.scrollHeight;
    return bubble;
  }

  function showTyping() {
    const typing = document.createElement('div');
    typing.className = 'chat-typing';
    typing.id = 'chat-typing-indicator';
    typing.innerHTML = '<span></span><span></span><span></span>';
    chatLog.appendChild(typing);
    chatLog.scrollTop = chatLog.scrollHeight;
    return typing;
  }

  // Respuestas de demostracion - reemplazar por la IA real cuando este conectada.
  // Nota: las respuestas usan conocimiento real de como funciona un tratamiento
  // de ortodoncia (aparato fijo/removible, contencion, microtornillos, etc.)
  // pero sin citar valores del arancel interno - los precios exactos siempre
  // se dan en la evaluacion o estan en las tarjetas de Brackets.
  function canned(question) {
    const q = question.toLowerCase();

    if (q.includes('primera consulta') || q.includes('consulta gratis') || q.includes('evaluacion gratis') || q.includes('evaluacion gratis') || (q.includes('consulta') && (q.includes('cuesta') || q.includes('costo') || q.includes('vale')))) {
      return { text: 'La primera consulta (evaluacion) no tiene costo. Ahi revisamos tu caso, te explicamos el plan de tratamiento recomendado y su valor exacto.', cta: 'Agendar evaluacion gratis', action: () => openBooking('evaluacion') };
    }
    if (q.includes('cotizar') && q.includes('brackets') || q.includes('brackets esteticos')) {
      return { text: 'Los Brackets Esteticos parten en $890.000, tratamiento integral con control mensual incluido. Tu primera consulta para confirmar el valor exacto de tu caso es gratis.', cta: 'Cotizar brackets', action: () => openBooking('brackets') };
    }
    if (q.includes('zafiro')) {
      return { text: 'Los Brackets de Zafiro son practicamente transparentes y muy resistentes, con el mismo seguimiento mensual de un ortodoncista especialista. Parten en $1.450.000 con 15% de descuento.', cta: 'Cotizar brackets de zafiro', action: () => openBooking('zafiro') };
    }
    if (q.includes('cuota') || q.includes('mensualidad') || (q.includes('mensual') && !q.includes('brackets'))) {
      return { text: 'El tratamiento con aparato fijo o removible se paga con una cuota de control mensual mientras dura el tratamiento. El valor exacto segun tu caso te lo confirmamos en la evaluacion inicial, que es gratuita.', cta: 'Agendar evaluacion gratis', action: () => openBooking('evaluacion') };
    }
    if (q.includes('microtornillo')) {
      return { text: 'En algunos casos usamos microtornillos como anclaje esqueletico, para lograr movimientos dentales mas precisos. Se evalua caso a caso con nuestros ortodoncistas especialistas.', cta: 'Agendar evaluacion gratis', action: () => openBooking('evaluacion') };
    }
    if (q.includes('contencion') || q.includes('contencion') || q.includes('retenedor')) {
      return { text: 'Al terminar el tratamiento activo se instala una contencion (fija o removible) para mantener los resultados, con controles periodicos incluidos.', cta: 'Agendar evaluacion gratis', action: () => openBooking('evaluacion') };
    }
    if (q.includes('disyuntor') || q.includes('activador') || q.includes('ortoped') || q.includes('ortoped')) {
      return { text: 'Para casos de crecimiento en ninos usamos aparatos ortopedicos (activadores, disyuntores, entre otros) que ayudan a guiar el desarrollo de los maxilares. Se define en la evaluacion de Ortodoncia Infantil.', cta: 'Cotizar ortodoncia infantil', action: () => openBooking('kids') };
    }
    if (q.includes('prequirurgic') || q.includes('prequirurgic') || q.includes('quirurgic') || q.includes('quirurgia')) {
      return { text: 'En casos que requieren cirugia ortognatica, hacemos ortodoncia prequirurgica: preparamos la posicion de tus dientes antes de la cirugia junto a tu cirujano maxilofacial.', cta: 'Agendar evaluacion gratis', action: () => openBooking('evaluacion') };
    }
    if (q.includes('demora') || q.includes('cuanto tiempo') || q.includes('duracion')) {
      return { text: 'Depende del caso: en promedio va de 8 a 24 meses. Con un diagnostico digital te damos un plazo estimado desde la primera consulta, que es gratuita.', cta: 'Agendar evaluacion gratis', action: () => openBooking('evaluacion') };
    }
    if (q.includes('agendar') || q.includes('evaluacion') || q.includes('evaluacion')) {
      return { text: 'Perfecto - la primera consulta es una evaluacion sin costo. Puedo abrirte el calendario para elegir fecha y hora ahora mismo.', cta: 'Elegir hora', action: () => openBooking('evaluacion') };
    }
    if (q.includes('nino') || q.includes('nina') || q.includes('infantil')) {
      return { text: 'Si - la Ortodoncia Infantil esta pensada para diagnostico temprano y guia del desarrollo facial, desde $180.000. La evaluacion inicial es gratuita.', cta: 'Cotizar ortodoncia infantil', action: () => openBooking('kids') };
    }
    if (q.includes('tipo de brackets') || q.includes('que brackets') || q.includes('que brackets')) {
      return { text: 'Trabajamos con Brackets Esteticos, Brackets de Zafiro y Ortodoncia Infantil, todos guiados por ortodoncistas especialistas certificados. Puedes ver el detalle y precio de cada uno tocando su tarjeta en la seccion Brackets.', cta: 'Ver brackets', action: () => { document.getElementById('brackets').scrollIntoView({ behavior: 'smooth' }); } };
    }
    return { text: 'Buena pregunta - nuestro equipo puede responderte en detalle por WhatsApp ahora mismo.', cta: 'Escribir por WhatsApp', action: () => window.open(WHATSAPP_LINK, '_blank') };
  }

  function sendQuestion(question) {
    if (!question || !question.trim()) return;
    chatSuggestions.style.display = 'none';
    chatPrompt.style.display = 'none';
    addBubble(question.trim(), 'user');
    chatInput.value = '';
    const typing = showTyping();
    setTimeout(() => {
      typing.remove();
      const r = canned(question);
      addBubble(r.text, 'bot', r.cta, r.action);
    }, 650 + Math.random() * 400);
  }

  chatSuggestions.querySelectorAll('.chat-chip').forEach(chip => {
    chip.addEventListener('click', () => sendQuestion(chip.dataset.q));
  });
  chatSend.addEventListener('click', () => sendQuestion(chatInput.value));
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendQuestion(chatInput.value);
  });

  // ---------- init ----------
  renderReviews();
  renderStats();
  checkPaymentReturn();
})();
