// Ortodoncia Montemar — lógica del sitio (recreación funcional del handoff de diseño)
(function () {
  'use strict';

  const WHATSAPP_NUMBER = '56912345678';
  const WHATSAPP_TEXT = encodeURIComponent('Hola, quiero reservar una hora en Centro Dental Dr. García');
  const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_TEXT}`;

  function formatCLP(n) {
    return '$' + Math.round(n).toLocaleString('es-CL');
  }

  const state = {
    scrollY: 0,
    heroOpened: false,
    videoPlaying: false,
    loginOpen: false,
    bookingOpen: false,
    bookingStep: 'plan', // plan | payment | success
    selectedPlanId: null,
    selectedDate: '',
    selectedTime: '',
    cardName: '', cardNumber: '', cardExp: '', cardCvc: '',
    clientOpen: false,
    clientName: 'María Fernanda',
    clientUpcoming: { service: 'Invisalign Expert', date: '2026-07-28', time: '11:00', status: 'confirmed' },
    reviews: [
      { name: 'Javiera R.', text: 'Explicaron cada paso del tratamiento con total transparencia. Hoy sonrío distinto.', rating: 5, date: 'Jun 2026' }
    ],
    newReviewText: '',
    newReviewRating: 5,
    services: [
      { id: 'kids', name: 'Ortodoncia Infantil', price: 180000, discount: 0, discountOn: false, desc: 'Diagnóstico temprano y guía del desarrollo facial.' },
      { id: 'invisalign', name: 'Invisalign Expert', price: 1450000, discount: 15, discountOn: true, desc: 'Alineadores invisibles, resultados predecibles.' },
      { id: 'brackets', name: 'Brackets Estéticos', price: 890000, discount: 0, discountOn: false, desc: 'Tratamiento integral con control mensual.' },
      { id: 'vip', name: 'Plan VIP Integral', price: 2100000, discount: 10, discountOn: true, desc: 'Atención prioritaria, chequeos ilimitados, acceso 24/7.' }
    ],
    appointments: [
      { id: 1, name: 'Constanza Ibáñez', service: 'Invisalign Expert', date: '2026-07-22', time: '10:30', status: 'pending' },
      { id: 2, name: 'Tomás Vidal', service: 'Brackets Estéticos', date: '2026-07-23', time: '16:00', status: 'confirmed' },
      { id: 3, name: 'Rocío Salas', service: 'Plan VIP Integral', date: '2026-07-18', time: '09:00', status: 'cancelled' }
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
  const hero = $('hero');
  const heroBgNext = $('hero-bg-next');

  $('hero-wa-link').href = WHATSAPP_LINK;
  $('wa-float-link').href = WHATSAPP_LINK;

  // ---------- NAV scroll + hero replay ----------
  let prevScrolled = false;
  let replaying = false;

  function openHero() {
    hero.classList.add('opened');
  }
  function closeHero() {
    hero.classList.remove('opened');
  }

  function onScroll() {
    const y = window.scrollY;
    state.scrollY = y;
    nav.classList.toggle('scrolled', y > 40);

    const heroFadeStart = window.innerHeight * 0.55;
    const heroFadeEnd = window.innerHeight * 0.95;
    const heroFadeProgress = Math.max(0, Math.min(1, (y - heroFadeStart) / (heroFadeEnd - heroFadeStart)));
    heroBgNext.style.opacity = heroFadeProgress;

    if (y < 10 && prevScrolled && !replaying) {
      replaying = true;
      closeHero();
      setTimeout(() => { openHero(); replaying = false; }, 350);
    }
    prevScrolled = y > 250;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  setTimeout(openHero, 500);

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
    const plan = selectedPlan();
    $('booking-plan-name').textContent = plan ? plan.name : '';
    setBookingStep('plan');
    bookingModal.classList.add('open');
  }

  function closeBookingFn() {
    bookingModal.classList.remove('open');
    setBookingStep('plan');
  }

  $('close-booking').addEventListener('click', closeBookingFn);
  $('close-booking-success').addEventListener('click', closeBookingFn);

  $('booking-date').addEventListener('change', (e) => { state.selectedDate = e.target.value; });
  $('booking-time').addEventListener('change', (e) => { state.selectedTime = e.target.value; });

  $('go-payment').addEventListener('click', () => {
    const plan = selectedPlan();
    $('payment-plan-name').textContent = plan ? plan.name : '';
    $('payment-plan-price').textContent = plan ? plan.finalPriceLabel : '';
    $('submit-payment-price').textContent = plan ? plan.finalPriceLabel : '';
    setBookingStep('payment');
  });

  $('card-name').addEventListener('input', (e) => { state.cardName = e.target.value; });
  $('card-number').addEventListener('input', (e) => { state.cardNumber = e.target.value; });
  $('card-exp').addEventListener('input', (e) => { state.cardExp = e.target.value; });
  $('card-cvc').addEventListener('input', (e) => { state.cardCvc = e.target.value; });

  $('submit-payment').addEventListener('click', () => {
    const plan = selectedPlan();
    state.appointments.push({
      id: state.nextApptId,
      name: state.clientName,
      service: plan ? plan.name : '',
      date: state.selectedDate,
      time: state.selectedTime,
      status: 'pending'
    });
    state.nextApptId += 1;
    state.cardName = state.cardNumber = state.cardExp = state.cardCvc = '';
    $('card-name').value = '';
    $('card-number').value = '';
    $('card-exp').value = '';
    $('card-cvc').value = '';
    setBookingStep('success');
    renderAppointmentsAdmin();
    renderStats();
  });

  // ---------- Plans ----------
  const plansGrid = $('plans-grid');
  function renderPlans() {
    const services = servicesComputed();
    plansGrid.innerHTML = services.map(sv => `
      <div class="plan-card">
        ${sv.effectiveDiscount ? `<div class="plan-discount-badge">-${sv.effectiveDiscount}%</div>` : ''}
        <div class="plan-name">${sv.name}</div>
        <p class="plan-desc">${sv.desc}</p>
        <div class="plan-price-row">
          <div class="plan-price-final">${sv.finalPriceLabel}</div>
          ${sv.effectiveDiscount ? `<div class="plan-price-old">${sv.priceLabel}</div>` : ''}
        </div>
        <button class="plan-reserve-btn" data-plan-id="${sv.id}">Reservar y pagar</button>
      </div>
    `).join('');

    plansGrid.querySelectorAll('.plan-reserve-btn').forEach(btn => {
      btn.addEventListener('click', () => openBooking(btn.dataset.planId));
    });
  }

  // ---------- Reviews ----------
  const reviewsList = $('reviews-list');
  function renderReviews() {
    const stars = (r) => '★'.repeat(r) + '☆'.repeat(5 - r);
    let html = state.reviews.map(r => `
      <div class="review-card">
        <div class="review-top">
          <div class="review-name">${r.name}</div>
          <div class="review-meta">PACIENTE VERIFICADO · ${r.date}</div>
        </div>
        <div class="review-stars">${stars(r.rating)}</div>
        <p class="review-text">${r.text}</p>
      </div>
    `).join('');

    if (state.reviews.length === 0) {
      html += `<div class="no-reviews">Aún no hay reseñas públicas — las reales aparecerán aquí apenas los pacientes las publiquen desde su portal.</div>`;
    }
    html += `<button class="review-login-btn" id="review-open-login">Inicia sesión para dejar tu reseña</button>`;
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
      const statusLabel = up.status === 'confirmed' ? 'Confirmada' : 'Pendiente de confirmación';
      wrap.innerHTML = `
        <div class="upcoming-card">
          <div>
            <div class="upcoming-service">${up.service}</div>
            <div class="upcoming-meta">${up.date} · ${up.time} hrs</div>
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
      wrap.innerHTML = `<div class="no-upcoming">No tienes horas próximas. <a href="#planes" id="no-upcoming-link">Reserva un plan</a>.</div>`;
      $('no-upcoming-link').addEventListener('click', closeClientFn);
    }
  }

  function renderStars() {
    const row = $('star-row');
    row.innerHTML = [1, 2, 3, 4, 5].map(n => `<button class="star-btn ${n <= state.newReviewRating ? 'active' : ''}" data-star="${n}">★</button>`).join('');
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
          <div class="appt-meta">${a.service} · ${a.date} · ${a.time}</div>
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
        renderPlans();
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

  // ---------- init ----------
  renderPlans();
  renderReviews();
  renderStats();
})();
