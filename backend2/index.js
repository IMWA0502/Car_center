import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';

import mysql from 'mysql2/promise';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' })); 

// Variabili d'ambiente
const PORT = process.env.PORT || 4000;
const SECRET = process.env.WEBHOOK_SECRET || 'MadMan';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'srv661.hstgr.io',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});


// Socket.IO setup
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

// Eventi recenti (solo per debug)
const recentEvents = [];
const MAX_EVENTS = 100;

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);
  socket.emit('recentEvents', recentEvents);
});

// Endpoint di test
app.get('/', (req, res) => res.send('<h3>✅ Backend Webhook Receiver Attivo</h3>'));
app.get('/health', (req, res) => res.json({ ok: true, now: new Date().toISOString() }));

// ✅ Converte valori in JSON valido per PostgreSQL
function toJsonString(value) {
  if (value === null || value === undefined) return null;
  try {
    return JSON.stringify(value);
  } catch {
    console.warn('⚠️ Errore nella serializzazione JSON:', value);
    return null;
  }
}

// ✅ Conversione numeri
function toNumberOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
}

function toIntOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

// ===============================
// Webhook principale
// ===============================
app.post('/webhook', async (req, res) => {
  try {
    // Controllo secret
    const incomingSecret =
      req.header('x-webhook-secret') || req.header('x-hub-signature') || '';
    if (SECRET && incomingSecret !== SECRET) {
      console.warn('❌ Webhook ricevuto con secret non valido');
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }

    const event = req.body;

    // ===========================
    // Estrazione dati
    // ===========================
    const advertiserId = event?.data?.advertiser?.advertiserId ?? null;
    const stockId = event?.data?.metadata?.stockId ?? null;
    const searchId = event?.data?.metadata?.searchId ?? null;
    const versionNumber = event?.data?.metadata?.versionNumber ?? null;
    const lifecycleState = event?.data?.metadata?.lifecycleState ?? null;
    const externalStockId = event?.data?.metadata?.externalStockId ?? null;
    const externalStockReference =
      event?.data?.metadata?.externalStockReference ?? null;
    const lastUpdated = event?.data?.metadata?.lastUpdated ?? null;
    const dateOnForecourt = event?.data?.metadata?.dateOnForecourt ?? null;

    // Booleani
    let lastUpdatedByAdvertiser = null;
    const lub = event?.data?.metadata?.lastUpdatedByAdvertiser;
    if (typeof lub === 'boolean') lastUpdatedByAdvertiser = lub;
    else if (typeof lub === 'string') {
      const s = lub.trim().toLowerCase();
      if (['true', '1', 'yes'].includes(s)) lastUpdatedByAdvertiser = true;
      else if (['false', '0', 'no'].includes(s)) lastUpdatedByAdvertiser = false;
    }

    // Dati JSONB
    const vehicleData = event?.data?.vehicle ?? null;
    const mediaData = event?.data?.vehicle?.media ?? event?.data?.media ?? null;
    const changedFields = event?.data?.changedFields ?? null;
    const features = event?.data?.vehicle?.features ?? event?.data?.features ?? null;
    const highlights = event?.data?.vehicle?.highlights ?? event?.data?.highlights ?? null;

    // Altri campi
    const availability =
      event?.data?.metadata?.availability ??
      event?.data?.vehicle?.availability ??
      null;

    const price = toNumberOrNull(event?.data?.vehicle?.price ?? event?.data?.price);
    const currency =
      event?.data?.vehicle?.currency ?? event?.data?.currency ?? null;
    const mileage = toIntOrNull(event?.data?.vehicle?.mileage ?? event?.data?.mileage);
    const firstRegistrationDate =
      event?.data?.vehicle?.firstRegistered ??
      event?.data?.firstRegistrationDate ??
      null;
    const derivativeId =
      event?.data?.vehicle?.derivativeId ??
      event?.data?.metadata?.derivativeId ??
      null;

    console.log('➡️ mediaData:', mediaData);
    console.log('➡️ vehicleData:', vehicleData);

    // ===========================
    // Inserimento nel database
    // ===========================
        const sql = `
      INSERT INTO stock_webhook_events (
        notification_id, integration_id, stock_event_source, event_type,
        advertiser_id, stock_id, search_id, version_number, lifecycle_state,
        external_stock_id, external_stock_reference, last_updated, last_updated_by_advertiser,
        date_on_forecourt, vehicle_data, media_data, changed_fields,
        availability, price, currency, mileage, first_registration_date, derivative_id, features, highlights,
        created_at, updated_at
      ) VALUES (
        ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, NOW(), NOW()
      )
      ON DUPLICATE KEY UPDATE
        integration_id = VALUES(integration_id),
        stock_event_source = VALUES(stock_event_source),
        event_type = VALUES(event_type),
        advertiser_id = VALUES(advertiser_id),
        stock_id = VALUES(stock_id),
        search_id = VALUES(search_id),
        version_number = VALUES(version_number),
        lifecycle_state = VALUES(lifecycle_state),
        external_stock_id = VALUES(external_stock_id),
        external_stock_reference = VALUES(external_stock_reference),
        last_updated = VALUES(last_updated),
        last_updated_by_advertiser = VALUES(last_updated_by_advertiser),
        date_on_forecourt = VALUES(date_on_forecourt),
        vehicle_data = VALUES(vehicle_data),
        media_data = VALUES(media_data),
        changed_fields = VALUES(changed_fields),
        availability = VALUES(availability),
        price = VALUES(price),
        currency = VALUES(currency),
        mileage = VALUES(mileage),
        first_registration_date = VALUES(first_registration_date),
        derivative_id = VALUES(derivative_id),
        features = VALUES(features),
        highlights = VALUES(highlights),
        updated_at = NOW();
    `;

    const params = [
      event.id ?? null,
      event.integrationId ?? null,
      event.stockEventSource ?? null,
      event.type ?? null,
      advertiserId,
      stockId,
      searchId,
      versionNumber,
      lifecycleState,
      externalStockId,
      externalStockReference,
      lastUpdated,
      lastUpdatedByAdvertiser,
      dateOnForecourt,
      toJsonString(vehicleData),
      toJsonString(mediaData),
      toJsonString(changedFields),
      availability,
      price,
      currency,
      mileage,
      firstRegistrationDate,
      derivativeId,
      toJsonString(features),
      toJsonString(highlights),
    ];

    await pool.execute(sql, params);

    // Log e realtime
    recentEvents.unshift({ receivedAt: new Date().toISOString(), body: event });
    if (recentEvents.length > MAX_EVENTS) recentEvents.pop();

    io.emit('webhookEvent', event);

    console.log('✅ Webhook salvato correttamente:', event.id);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('❌ Errore nel salvataggio del webhook:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ===============================
// Endpoint per visualizzare eventi recenti
// ===============================
app.get('/events', (req, res) => res.json({ recentEvents }));

// Avvio server
server.listen(PORT, () =>
  console.log(`✅ Backend listening on http://localhost:${PORT}`)
);