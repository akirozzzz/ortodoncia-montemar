# Handoff: Ortodoncia Montemar — Sitio web

## Overview
Sitio web para una clínica de ortodoncia (Ortodoncia Montemar): landing pública con reserva de horas, pago online, portal de pacientes (reseñas, reprogramar/cancelar) y panel de administración (gestión de reservas, precios/descuentos, estadísticas).

## About the Design Files
Los archivos de este paquete son **referencias de diseño hechas en HTML** (Design Component, formato propietario del prototipador) — muestran look & feel e interacciones intencionadas, no código de producción para copiar tal cual. La tarea es **recrear este diseño en el entorno real del proyecto** (React, Vue, lo que corresponda) usando sus propios patrones y librerías, o elegir el framework más adecuado si el proyecto parte de cero.

## Fidelity
**Alta fidelidad (hifi)**: mockup con colores, tipografía, espaciados e interacciones finales. Recrear pixel-perfect usando las librerías/patrones del codebase destino.

## Screens / Views

### 1. Home / Landing
- **Nav** fijo (fixed top), transparente sobre el hero, se vuelve blanco translúcido con blur al hacer scroll (`scrollY > 40`). Logo "Ortodoncia Montemar" en Playfair Display italic 22px. Links: Planes, Nuestro enfoque, Reseñas. Botón "Portal de pacientes".
- **Hero** (100vh, fondo negro `#0a0c10`): imagen de fondo (video-poster) blureada (`blur(6px) brightness(1.35) saturate(0.85)`) + overlay oscuro. Badge "Video institucional · 0:38", botón circular play/pause (76px, animación pulse al reproducir). 4 paneles de "cortina" (imágenes full-bleed) que se abren con rotate(-4deg) + translateY(-115%) escalonado (delay 0.14s c/u, easing `cubic-bezier(.65,0,.35,1)`, 1.15s) al cargar la página, y se cierran de nuevo si el usuario vuelve al tope del scroll. Título H1 Playfair Display 32-58px + párrafo + 2 CTAs ("Ver planes y tarifas", "Reservar por WhatsApp").
- **Parallax de confianza** (`#confianza`, 150vh, sticky inner 100vh): 3 imágenes de fondo (story-1/2/3) que hacen cross-fade según scroll progress (dividido en 3 tercios), con frases superpuestas en Playfair Display italic ~32-58px.
- **Autoridad / Doctor**: grid 2 columnas (0.9fr/1.1fr), retrato redondeado (radius 18, aspect 4:5) + copy de credibilidad + 3 stats (años, certificación Invisalign, cupos limitados).
- **Planes** (`#planes`, fondo `oklch(96% 0.008 240)`): grid auto-fit de tarjetas (min 250px). Cada tarjeta: nombre, descripción, precio (con precio tachado + badge de % descuento si aplica), botón "Reservar y pagar".
- **Reseñas** (`#resenas`): lista de reseñas verificadas (nombre, fecha, estrellas, texto) + estado vacío si no hay reseñas + CTA "Inicia sesión para dejar tu reseña".
- **Footer**: fondo oscuro `oklch(15% 0.015 250)`, columnas Clínica / Acceso (incluye link discreto a Admin).
- **Botón flotante WhatsApp**: fixed bottom-right, ícono + label, deep-link a `https://wa.me/<numero>?text=...`.

### 2. Modal de Login (portal de pacientes)
Overlay con blur, card blanca 400px max-width, inputs correo/contraseña, botón "Ingresar" (mock, no auth real).

### 3. Modal de Reserva + Pago
Flujo de 3 pasos dentro de un mismo modal:
1. **Plan**: nombre del plan, selector de fecha (`<input type=date>`) y hora (`<select>`).
2. **Pago**: badge de cifrado SSL, resumen de plan/precio, formulario de tarjeta (nombre, número, exp, cvc) — mock, sin gateway real conectado.
3. **Éxito**: check circular, mensaje de confirmación.

### 4. Portal de Cliente (full-screen overlay)
Saludo personalizado, próxima hora (servicio/fecha/hora/estado) con botones Reprogramar/Cancelar, y formulario de reseña (selector de 1-5 estrellas + textarea).

### 5. Panel Admin (full-screen overlay, fondo oscuro)
3 tabs:
- **Reservas**: lista de citas con nombre/servicio/fecha/hora, badge de estado (pendiente/confirmada/cancelada), botones Confirmar/Cancelar según estado.
- **Servicios y descuentos**: por servicio, input de precio (CLP), toggle de descuento activo, input de % descuento.
- **Estadísticas**: 4 tarjetas — pendientes, confirmadas, canceladas, ingresos estimados (suma de confirmadas con descuento aplicado).

## Interactions & Behavior
- Scroll listener global: cambia estilo de nav y controla el parallax de la sección "confianza" vía `getBoundingClientRect`.
- Al volver a `scrollY < 10` después de haber hecho scroll, las cortinas del hero se resetean y vuelven a abrirse (replay del video/intro).
- Reserva → pago → éxito agrega una nueva cita al arreglo de `appointments` con estado `pending`.
- Reprogramar desde el portal de cliente reabre el modal de reserva con el plan preseleccionado.
- Cancelar en portal de cliente limpia `clientUpcoming`.
- Admin: confirmar/cancelar cambia el estado de la cita en el arreglo; editar precio/descuento actualiza el servicio en vivo (se refleja en Planes).
- Todo el estado vive en memoria de componente (sin backend real) — es la referencia funcional a implementar contra una API real.

## State Management
Variables clave (nombres tal cual en el prototipo, referencia):
- `services[]` — id, name, price, discount, discountOn, desc
- `appointments[]` — id, name, service, date, time, status (pending/confirmed/cancelled)
- `reviews[]` — name, text, rating, date
- `clientUpcoming` — cita del cliente logueado
- `loginOpen`, `bookingOpen` (+ `bookingStep`: plan/payment/success), `clientOpen`, `adminOpen` (+ `adminTab`)
- `selectedPlanId`, `selectedDate`, `selectedTime`, campos de tarjeta

## Design Tokens
- **Colores** (formato oklch, paleta azul-neutro futurista):
  - Fondo base: `oklch(98% 0.006 240)`
  - Fondo sección planes: `oklch(96% 0.008 240)`
  - Texto oscuro principal: `oklch(20% 0.015 250)`
  - Texto secundario: `oklch(45% 0.02 250)`
  - Acento azul: `oklch(50-60% 0.13 235)`
  - Acento violeta (detalle): `oklch(60% 0.14 290)`
  - Rojo cancelar: `oklch(55% 0.14 25)`
  - Fondo oscuro (hero/footer/admin): `oklch(15% 0.015 250)` / `#0a0c10`
- **Tipografía**: Playfair Display (serif, italic para acentos) para títulos; Inter para todo el resto. Tamaños hero H1: 32-58px clamp; títulos de sección: 28-44px clamp; cuerpo: 14-16px.
- **Radios**: tarjetas 16-22px, inputs 8-12px, botones pill 20-30px.
- **Sombras**: sutiles, solo en botón flotante WhatsApp (`0 8px 24px rgba(0,0,0,0.25)`).

## Assets
Imágenes generadas con MidJourney (subidas por el usuario), ubicadas en `uploads/`:
- 4 paneles de cortina del hero (entrada de clínica, retrato de paciente, macro de alineador, manos de dentista)
- Video poster (equipo consultando con paciente)
- 3 imágenes de parallax (consulta con pantalla digital, macro de sonrisa, lounge VIP)
- Retrato del doctor

Todas cargadas vía el componente `<image-slot>` (`image-slot.js`), que soporta drag-and-drop de reemplazo en el editor.

## Screenshots
Ver carpeta `screenshots/` — 01 hero, 02 parallax de confianza, 03 planes, 04 reseñas, 05 modal de login.

## Files
- `Centro Dental Dr. García.dc.html` — archivo principal del diseño (todo el sitio en un solo componente)
- `image-slot.js` — web component de placeholder de imagen usado en el diseño
- `uploads/` — imágenes ya cargadas
