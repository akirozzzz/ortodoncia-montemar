# Integración Kapso + Fintoc — Ortodoncia Montemar (v2, stack real)

Después de revisar el repo real confirmé que es un **sitio 100% estático**:
`index.html` + `script.js` + `style.css`, sin build, sin framework, sin
backend de ningún tipo. Todo — reservas, precios, reseñas — vive en un
objeto `state` en memoria del navegador (`script.js`), y se pierde al
recargar la página. El "Confirmar y pagar" del modal de reserva es un
formulario de tarjeta falso: no está conectado a ningún procesador de pago
real.

Este código agrega, por primera vez, un backend real (Vercel Serverless
Functions, sin necesidad de migrar a ningún framework) para: el bot de
WhatsApp (Kapso) y el cobro real (Fintoc).

## 1. Qué cambia respecto al sitio actual

| Hoy | Con esta integración |
|---|---|
| "Reservar por WhatsApp" abre un chat a un número de prueba sin bot detrás | Ese número pasa a ser tu número real conectado a Kapso, con un bot que responde |
| El bot no existe | `api/whatsapp/webhook.js` recibe los mensajes y `lib/bot-flow.js` conduce la conversación (FAQ, catálogo, agendar) |
| El pago es un formulario de tarjeta falso, no cobra nada | El bot manda un link real de pago (Fintoc) y confirma la hora sola cuando Fintoc avisa que se pagó |
| Las reservas viven en memoria del navegador y se pierden al recargar | Las reservas hechas por WhatsApp se guardan en Vercel KV (persisten) |

**Importante:** esta integración cubre el flujo por WhatsApp. El modal de
reserva de la web sigue siendo un mock por ahora — no lo toqué. Si querés
que ese botón también cobre de verdad con Fintoc, es un paso aparte y
chico (reusa `lib/fintoc-client.js`); avisame y lo armamos.

## 2. Arquitectura

```
Paciente en WhatsApp
      │
      ▼
Kapso (tu número) ──webhook──▶ POST /api/whatsapp/webhook
                                        │
                                lib/bot-flow.js
                             (menú, FAQ, agendar)
                                        │
                                        ▼
                          Fintoc: crea Checkout Session
                                        │
      ◀── manda link de pago por WhatsApp ─┘
      │
Paciente paga en la página de Fintoc
      │
      ▼
Fintoc ──webhook──▶ POST /api/payments/fintoc-webhook
                              │
                      marca la reserva "paid" (Vercel KV)
                              │
                              ▼
                Kapso manda WhatsApp de confirmación
```
## 3. Estructura de archivos agregados

```
ortodoncia-montemar/
├── package.json              ← declara las 4 dependencias de /api
├── .env.example               ← referencia, no se sube con valores reales
├── index.html                 (ya existe, sin cambios)
├── script.js                  (ya existe — solo cambiar WHATSAPP_NUMBER)
├── style.css                  (ya existe, sin cambios)
├── lib/
│   ├── kapso-client.js
│   ├── fintoc-client.js
│   ├── services-catalog.js    ← copia de state.services de script.js
│   ├── store.js
│   └── bot-flow.js
└── api/
    ├── whatsapp/webhook.js          → /api/whatsapp/webhook
    └── payments/fintoc-webhook.js   → /api/payments/fintoc-webhook
```

Todo es JavaScript plano (CommonJS), nada de TypeScript ni paso de build:
Vercel detecta la carpeta `api/` y corre esos archivos como funciones
serverless automáticamente, sin importar que el resto del sitio sea
estático. Al agregar `package.json`, Vercel va a instalar esas
dependencias en cada deploy. No hace falta definir ningún script de
`build`.

## 4. Variables de entorno

Copiá `.env.example`, completá los valores reales y cargalos en Vercel →
Project Settings → Environment Variables (no los subas al repo).

| Variable | De dónde sale |
|---|---|
| `KAPSO_API_KEY` | Kapso dashboard → Integrations → API keys |
| `KAPSO_PHONE_NUMBER_ID` | Kapso dashboard → WhatsApp → Phone numbers |
| `KAPSO_WEBHOOK_SECRET` | Se genera al crear el webhook (paso 5) |
| `FINTOC_SECRET_KEY` | Fintoc dashboard → API Keys (empezá con la de test) |
| `FINTOC_WEBHOOK_SECRET` | Se genera al crear el Webhook Endpoint (paso 6) |
| `APP_BASE_URL` | `https://ortodoncia-montemar.vercel.app` |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Vercel → Storage → crear una KV database |
## 5. Setup en Kapso

1. Conectá el número de WhatsApp real del negocio (WhatsApp > Phone
   numbers > Connect). Copiá el `phone_number_id`.
2. Creá una API key (Integrations > API keys) → `KAPSO_API_KEY`.
3. En ese número, andá a Webhooks > creá uno nuevo:
   - URL: `https://TU-DOMINIO/api/whatsapp/webhook`
   - Evento: `whatsapp.message.received`
   - Copiá el secret (se muestra una sola vez) → `KAPSO_WEBHOOK_SECRET`
4. Probá primero en el **Sandbox de Kapso** antes de anunciar el número
   públicamente.

## 6. Setup en Fintoc

1. Sacá tu Secret Key de **test** (Developers > API Keys) → `FINTOC_SECRET_KEY`.
2. Creá un Webhook Endpoint (Developers > Webhooks):
   - URL: `https://TU-DOMINIO/api/payments/fintoc-webhook`
   - Evento: `checkout_session.finished`
   - Copiá el secret → `FINTOC_WEBHOOK_SECRET`
3. Probá con el botón "Send test event" del dashboard antes de activarlo.
4. Cuando todo funcione en modo test, repetí 1-3 con las keys de
   **producción**.

## 7. Cambio mínimo en el sitio actual

En `script.js`, línea 5:

```js
const WHATSAPP_NUMBER = '56912345678'; // cambiar por tu número real conectado a Kapso
```

Es lo único que hay que tocar del sitio existente para que el botón
"Reservar por WhatsApp" abra un chat con el número correcto.
## 8. Precios y catálogo

`lib/services-catalog.js` es una copia exacta de `state.services` en
`script.js` (Ortodoncia Infantil $180.000, Invisalign Expert $1.450.000
-15%, Brackets Estéticos $890.000, Plan VIP Integral $2.100.000 -10%). El
bot cobra el precio final ya con descuento, igual que se ve en la web.

El panel admin del sitio deja "editar" estos precios, pero ese cambio
solo vive en la memoria del navegador de quien lo edita. Si cambiás un
precio en el panel admin, actualizá también `lib/services-catalog.js` a
mano.

## 9. Horarios

Los mismos 4 horarios que ya están en el `<select>` del modal de reserva
(09:00, 10:30, 14:00, 16:00), hardcodeados en `lib/bot-flow.js`. Como el
sitio no valida disponibilidad real en ningún lado, tampoco lo hace el bot
por ahora.

## 10. Probar de punta a punta

1. Deployá con las env vars de test cargadas.
2. Escribile "hola" al número de WhatsApp conectado a Kapso.
3. "Agendar una hora" > un tratamiento > un horario.
4. Debería llegar un botón "Pagar y confirmar" con link pay.fintoc.com.
5. En modo test, Fintoc deja simular pagos sin mover plata real.
6. Al completar el pago de prueba, la confirmación por WhatsApp debería
   llegar unos segundos después.

## 11. Checklist antes de producción

- [ ] `WHATSAPP_NUMBER` en `script.js` actualizado al número real
- [ ] Precios de `services-catalog.js` verificados contra los reales
- [ ] Keys de Fintoc en modo producción
- [ ] Webhook de Fintoc activado en producción
- [ ] Revisar el Go-Live Checklist de Fintoc
- [ ] WhatsApp Business verificado en Meta
- [ ] Secrets cargados como env vars en Vercel, no en el código
