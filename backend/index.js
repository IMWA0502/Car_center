// Importa il framework Express per creare API e gestire routing
import 'dotenv/config';
import express from 'express';
// Importa la funzione fetch per effettuare richieste HTTP (API esterne)
import fetch from 'node-fetch';
// Importa il modulo HTTP di Node.js per creare il server
import http from 'http';
// Importa la classe Server di socket.io per la comunicazione in tempo reale (WebSocket)
import { Server } from 'socket.io';
// Importa il middleware CORS per abilitare richieste da origini diverse
import cors from 'cors';

// Crea un'applicazione Express per gestire le API
const app = express();
// Applica il middleware CORS per permettere richieste da altri domini ed esporre header custom
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['x-autotrader-sandbox-id']
}));
// Imposta la porta su cui il server ascolterà (di default 3000)
const PORT = process.env.PORT || 3000;
// Crea il server HTTP utilizzando l'app Express
const server = http.createServer(app);
// Inizializza il server WebSocket con socket.io, abilitando CORS per tutte le origini
const io = new Server(server, {
  cors: {
    origin: '*', // Permette richieste da qualsiasi origine
    methods: ['GET', 'POST'] // Permette solo i metodi GET e POST
  }
});

// Helper: fetch con timeout
const fetchWithTimeout = async (url, options = {}, timeoutMs = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

// Nuova rotta: ottieni lo stock dal sandbox Autotrader usando Stock API
app.get('/api/vehicles', async (req, res) => {
  try {

    // --- CONFIGURAZIONE CREDENZIALI API AUTOTRADER ---
    // Queste variabili sono fornite da Autotrader per accedere al sandbox (obbligatorie)
    const key = process.env.AUTOTRADER_KEY; // API key sandbox
    const secret = process.env.AUTOTRADER_SECRET; // API secret sandbox
    const sandboxId = process.env.AUTOTRADER_SANDBOX_ID; // advertiser/forecourt ID

    if (!key || !secret) {
      return res.status(400).json({
        error: 'Configurazione mancante',
        details: 'Imposta AUTOTRADER_KEY e AUTOTRADER_SECRET nel file .env'
      });
    }

    // --- AUTENTICAZIONE: OTTIENI IL BEARER TOKEN ---
    // Prima di chiamare qualsiasi endpoint, bisogna autenticarsi per ottenere il token
    const authResponse = await fetchWithTimeout('https://api-sandbox.autotrader.co.uk/authenticate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        key,
        secret
      })
    });
    // Se la richiesta di autenticazione fallisce, restituisco errore 401
    if (!authResponse.ok) {
      const err = await authResponse.text();
      console.error('Errore autenticazione:', err);
      return res.status(401).json({ error: 'Autenticazione fallita', details: err });
    }
    // Estraggo il token dalla risposta JSON
    const authData = await authResponse.json();
    const token = authData.access_token;
    if (!token) {
      console.error('Token non trovato nella risposta:', authData);
      return res.status(401).json({ error: 'Token non trovato', details: authData });
    }

    // --- CHIAMATA DATI: RICHIESTA STOCK API ---
    // Risposta AutoTrader: "You would use the Stock API to pull back the Stock that would be listed on the respected Advertiser ID"
    // Per dealer websites si usa Stock API, non Vehicles API
    const templateFromEnv = process.env.AUTOTRADER_STOCK_ENDPOINT || '';
    const pageSize = process.env.AUTOTRADER_PAGE_SIZE || '50';

    // Helper per aggiungere parametri di paginazione se l'endpoint li supporta
    const withPaging = (url) => {
      // Aggiungi parametri standard, non romperà gli endpoint che li ignorano
      const hasQuery = url.includes('?');
      const sep = hasQuery ? '&' : '?';
      // Non duplicare se già presenti
      if (/([?&])page(=|&|$)/i.test(url) || /([?&])page_size(=|&|$)/i.test(url)) return url;
      return `${url}${sep}page=1&page_size=${encodeURIComponent(pageSize)}`;
    };

    // Costruisci una lista di URL-candidati da provare in ordine - Stock API endpoints
    const baseCandidates = [
      // Stock API endpoints come indicato dal supporto AutoTrader
      'https://api-sandbox.autotrader.co.uk/stock?advertiser_id={advertiserId}',
      'https://api-sandbox.autotrader.co.uk/stock?advertiserId={advertiserId}',
      'https://api-sandbox.autotrader.co.uk/stock'
    ];

    const tryTemplates = [
      ...(templateFromEnv ? [templateFromEnv] : []),
      ...baseCandidates
    ];

    const attempts = [];
    let success = null;
    for (const tpl of tryTemplates) {
      // Rimpiazza placeholder id e aggiungi paginazione dove ha senso
      let url = tpl
        .replace('{advertiserId}', encodeURIComponent(sandboxId || ''));
      if (!/\/forecourts\//i.test(url)) {
        url = withPaging(url);
      }
      try {
        const resp = await fetchWithTimeout(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        if (resp.ok) {
          success = { url, resp };
          break;
        } else {
          const text = await resp.text();
          const preview = (text || '').slice(0, 300);
          attempts.push({ url, status: resp.status, statusText: resp.statusText, body: preview });
          console.warn(`Tentativo fallito: ${url} -> ${resp.status} ${resp.statusText} | Body: ${preview}`);
        }
      } catch (e) {
        attempts.push({ url, error: String(e) });
        console.warn(`Tentativo errore: ${url} ->`, e);
      }
    }

    if (!success) {
      // Se tutti o parte dei tentativi restituiscono 403 con messaggio esplicito,
      // ritorna un 403 strutturato per mostrare un errore chiaro al frontend
      const hasForbiddenStock = attempts.some(a =>
        a && a.status === 403 && typeof a.body === 'string' && /not allowed to access endpoint:\s*\[?(stock|vehicles)\]?/i.test(a.body)
      );
      if (hasForbiddenStock) {
        // Espone anche l'header con l'ID sandbox per coerenza
        res.setHeader('x-autotrader-sandbox-id', sandboxId || '');
        return res.status(403).json({
          error: 'Accesso negato alla Stock API',
          code: 'AUTOTRADER_FORBIDDEN',
          message: 'Il token sandbox non ha i permessi per accedere all\'endpoint /stock. Contatta il provider per abilitare l\'accesso alla Stock API.',
          advertiserId: sandboxId || undefined,
          attempts
        });
      }
      return res.status(502).json({
        error: 'Nessun endpoint Autotrader ha risposto con successo',
        attempts
      });
    }

    const data = await success.resp.json();
    console.log('Risultato GET /api/vehicles (Stock API) da:', success.url);
    // Includo l'ID sandbox nella risposta e anche in un header dedicato
    res.setHeader('x-autotrader-sandbox-id', sandboxId);
    res.json({ sandboxId, source: success.url, vehicles: data });
  } catch (error) {
    // Gestione errori generici (es. problemi di rete, token, ecc.)
    console.error('Errore nel recupero stock:', error);
    res.status(500).json({ error: 'Impossibile recuperare lo stock', details: error });
  }
});

// Endpoint semplice per ottenere solo l'ID del sandbox Autotrader
app.get('/api/autotrader-id', (req, res) => {
  const sandboxId = process.env.AUTOTRADER_SANDBOX_ID || 'YOUR_SANDBOX_ID';
  res.json({ sandboxId });
});

// Endpoint diagnostico: restituisce info non sensibili sull'autenticazione (senza token)
app.get('/api/autotrader-auth-info', async (req, res) => {
  try {
    const key = process.env.AUTOTRADER_KEY;
    const secret = process.env.AUTOTRADER_SECRET;
    if (!key || !secret) {
      return res.status(400).json({ error: 'AUTOTRADER_KEY/SECRET mancano nelle variabili di ambiente' });
    }
    const authResponse = await fetchWithTimeout('https://api-sandbox.autotrader.co.uk/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ key, secret })
    });
    const text = await authResponse.text();
    let json = {};
    try { json = JSON.parse(text); } catch { /* non-json */ }
    // Rimuovi token se presente
    if (json && json.access_token) {
      delete json.access_token;
    }
    res.status(authResponse.ok ? 200 : 401).json({ ok: authResponse.ok, auth: json || text });
  } catch (e) {
    res.status(500).json({ error: 'autotrader-auth-info failed', details: String(e) });
  }
});

// Endpoint webhook per notifiche da Autotrader
app.put('/webhook/autotrader', express.json({ type: '*/*' }), (req, res) => {
  console.log('Webhook ricevuto da Autotrader:', req.body);
  io.emit('autotrader-update', req.body);
  res.status(200).send('Webhook ricevuto');
});

// Avvia il server su una porta custom (esempio 3000)
server.listen(PORT, () => {
  console.log(`Backend in ascolto su http://localhost:${PORT}`);
});
