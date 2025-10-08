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
    // Estrai parametri di filtro dalla query string
    const { make } = req.query;
    
    console.log('=== API CALL DEBUG ===');
    console.log('Request query params:', req.query);
    console.log('Make parameter:', make);
    console.log('======================');

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
          console.log(`✅ ENDPOINT FUNZIONANTE: ${url}`);
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
      // Se nessun endpoint ha risposto con successo, gestisci l'errore
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

    // --- ELABORAZIONE RISPOSTA E FILTRI ---
    // Leggi i dati JSON dalla risposta dell'endpoint funzionante
    const data = await success.resp.json();
    console.log('Risultato GET /api/vehicles (Stock API) da:', success.url);
    
    console.log('=== DATA STRUCTURE DEBUG ===');
    console.log('Type of data:', typeof data);
    console.log('Is array?', Array.isArray(data));
    if (data) {
      console.log('Data keys:', Object.keys(data));
      if (data.vehicles) console.log('data.vehicles exists, length:', data.vehicles?.length);
      if (data.data) console.log('data.data exists, length:', data.data?.length);
      if (data.stock) console.log('data.stock exists, length:', data.stock?.length);
    }
    console.log('============================');
    
    // Applica filtri ai veicoli se specificati nei parametri query
    let vehicles = data;
    
  
    // Se la risposta contiene un array di veicoli, filtralo
    if (Array.isArray(data)) {
      vehicles = data;
    } else if (data && data.results && Array.isArray(data.results)) {
      vehicles = data.results;
    } else if (data && data.vehicles && Array.isArray(data.vehicles)) {
      vehicles = data.vehicles;
    } else if (data && data.data && Array.isArray(data.data)) {
      vehicles = data.data;
    } else if (data && Array.isArray(data.stock)) {
      vehicles = data.stock;
    }
    
    //sistema il filtro per marca (make)
  
    if (Array.isArray(vehicles) && make) {
      console.log('=== BACKEND FILTER DEBUG ===');
      console.log('Filtering for make:', make);
      console.log('Total vehicles before filter:', vehicles.length);
      
      vehicles = vehicles.filter(vehicle => {
        // Filtro per marca
        const vehicleMake = (
          vehicle?.vehicle?.make || 
          vehicle?.make || 
          vehicle?.brand || 
          vehicle?.manufacturer ||
          ''
        ).toLowerCase();
        
        console.log('Vehicle make found:', vehicleMake);
        const matches = vehicleMake.includes(make.toLowerCase());
        console.log('Matches filter?', matches);
        
        return matches;
      });
      
      console.log('Total vehicles after filter:', vehicles.length);
      console.log('==============================');
    }
    
    // Includo l'ID sandbox nella risposta e anche in un header dedicato
    res.setHeader('x-autotrader-sandbox-id', sandboxId);
    res.json({ 
      sandboxId, 
      source: success.url, 
      vehicles: vehicles,
      filters: { make }
    });
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

//inizio
//serve a me per visualizzare tutti i dati dell'API in formato HTML nel browser

// Endpoint per visualizzare tutti i dati dell'API in formato HTML nel browser
app.get('/api', async (req, res) => {
  try {
    // Ottieni tutti i dati dei veicoli
    const key = process.env.AUTOTRADER_KEY;
    const secret = process.env.AUTOTRADER_SECRET;
    const sandboxId = process.env.AUTOTRADER_SANDBOX_ID;

    if (!key || !secret) {
      return res.send(`
        <html>
          <head><title>API Data - Car Center</title></head>
          <body>
            <h1>🚗 Car Center - API Data</h1>
            <div style="color: red;">
              <h2>❌ Configurazione mancante</h2>
              <p>Imposta AUTOTRADER_KEY e AUTOTRADER_SECRET nel file .env</p>
            </div>
          </body>
        </html>
      `);
    }

    // Autenticazione
    const authResponse = await fetchWithTimeout('https://api-sandbox.autotrader.co.uk/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ key, secret })
    });

    if (!authResponse.ok) {
      return res.send(`
        <html>
          <head><title>API Data - Car Center</title></head>
          <body>
            <h1>🚗 Car Center - API Data</h1>
            <div style="color: red;">
              <h2>❌ Errore di autenticazione</h2>
              <p>Impossibile autenticarsi con l'API Autotrader</p>
            </div>
          </body>
        </html>
      `);
    }

    const authData = await authResponse.json();
    const token = authData.access_token;

    // Ottieni i dati dei veicoli
    const stockResponse = await fetchWithTimeout(`https://api-sandbox.autotrader.co.uk/stock?advertiser_id=${sandboxId}&page=1&page_size=100`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    let vehiclesData = {};
    let vehicles = [];
    
    if (stockResponse.ok) {
      vehiclesData = await stockResponse.json();
      
      // Estrai i veicoli dalla risposta
      if (Array.isArray(vehiclesData)) {
        vehicles = vehiclesData;
      } else if (vehiclesData && vehiclesData.vehicles && Array.isArray(vehiclesData.vehicles)) {
        vehicles = vehiclesData.vehicles;
      } else if (vehiclesData && vehiclesData.data && Array.isArray(vehiclesData.data)) {
        vehicles = vehiclesData.data;
      } else if (vehiclesData && Array.isArray(vehiclesData.stock)) {
        vehicles = vehiclesData.stock;
      }
    }

    // Genera HTML per visualizzare i dati
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>API Data - Car Center</title>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background-color: #f5f5f5; 
          }
          .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
          }
          .header { 
            text-align: center; 
            color: #333; 
            border-bottom: 2px solid #007bff; 
            padding-bottom: 10px; 
            margin-bottom: 20px; 
          }
          .stats { 
            background: #e7f3ff; 
            padding: 15px; 
            border-radius: 5px; 
            margin-bottom: 20px; 
          }
          .vehicle-card { 
            border: 1px solid #ddd; 
            margin: 10px 0; 
            padding: 15px; 
            border-radius: 5px; 
            background: #fafafa; 
          }
          .vehicle-title { 
            color: #007bff; 
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 10px; 
          }
          .data-section { 
            background: #f8f9fa; 
            padding: 10px; 
            margin: 10px 0; 
            border-radius: 3px; 
            border-left: 4px solid #007bff; 
          }
          pre { 
            background: #2d3748; 
            color: #e2e8f0; 
            padding: 15px; 
            border-radius: 5px; 
            overflow-x: auto; 
            font-size: 12px; 
          }
          .refresh-btn { 
            background: #007bff; 
            color: white; 
            padding: 10px 20px; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer; 
            margin: 10px 0; 
          }
          .refresh-btn:hover { 
            background: #0056b3; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚗 Car Center - Tutti i Dati API</h1>
            <p>Visualizzazione completa dei dati Autotrader</p>
          </div>
          
          <button class="refresh-btn" onclick="window.location.reload()">🔄 Aggiorna Dati</button>
          
          <div class="stats">
            <h3>📊 Statistiche</h3>
            <p><strong>Sandbox ID:</strong> ${sandboxId}</p>
            <p><strong>Numero totale veicoli:</strong> ${vehicles.length}</p>
            <p><strong>Data/Ora aggiornamento:</strong> ${new Date().toLocaleString('it-IT')}</p>
            <p><strong>Endpoint utilizzato:</strong> Stock API</p>
          </div>

          <div class="data-section">
            <h3>🔍 Struttura Completa Risposta API</h3>
            <pre>${JSON.stringify(vehiclesData, null, 2)}</pre>
          </div>

          ${vehicles.length > 0 ? `
            <h3>🚙 Lista Veicoli (${vehicles.length} trovati)</h3>
            ${vehicles.map((vehicle, index) => `
              <div class="vehicle-card">
                <div class="vehicle-title">
                  Veicolo #${index + 1}: ${vehicle?.vehicle?.make || vehicle?.make || 'N/A'} ${vehicle?.vehicle?.model || vehicle?.model || 'N/A'}
                </div>
                <div class="data-section">
                  <h4>📋 Dati Completi Veicolo</h4>
                  <pre>${JSON.stringify(vehicle, null, 2)}</pre>
                </div>
              </div>
            `).join('')}
          ` : `
            <div class="data-section">
              <h3>⚠️ Nessun veicolo trovato</h3>
              <p>La risposta API non contiene veicoli o la struttura è diversa da quella attesa.</p>
            </div>
          `}

          <div class="data-section">
            <h3>🔗 Altri Endpoint Disponibili</h3>
            <ul>
              <li><a href="/api/vehicles">/api/vehicles</a> - JSON dei veicoli</li>
              <li><a href="/api/autotrader-id">/api/autotrader-id</a> - ID Sandbox</li>
              <li><a href="/api/autotrader-auth-info">/api/autotrader-auth-info</a> - Info autenticazione</li>
            </ul>
          </div>
        </div>
      </body>
      </html>
    `;

    res.send(html);

  } catch (error) {
    res.send(`
      <html>
        <head><title>API Data - Car Center</title></head>
        <body>
          <h1>🚗 Car Center - API Data</h1>
          <div style="color: red;">
            <h2>❌ Errore</h2>
            <p>Errore nel recupero dei dati: ${error.message}</p>
            <pre>${error.stack}</pre>
          </div>
        </body>
      </html>
    `);
  }
});
//fine

// Avvia il server su una porta custom (esempio 3000)
server.listen(PORT, () => {
  console.log(`Backend in ascolto su http://localhost:${PORT}`);
  // Mostra l'URL per visualizzare i dati API
  console.log(`📊 Visualizza tutti i dati API su: http://localhost:${PORT}/api`);
});
