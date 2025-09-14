// Importa il framework Express per creare API e gestire routing
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
// Applica il middleware CORS per permettere richieste da altri domini
app.use(cors());
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


// Nuova rotta: ottieni tutte le auto dal sandbox Autotrader
app.get('/api/vehicles', async (req, res) => {
  try {
    // --- CONFIGURAZIONE CREDENZIALI API AUTOTRADER ---
    // Queste variabili sono fornite da Autotrader per accedere al sandbox
    const key = 'DripStudioMedia-Sandbox-04-09-25'; // API key sandbox
    const secret = 'C9cZ0tmOQ4HpGy4PNDKQfjAeJluOUfRn'; // API secret sandbox

    // --- AUTENTICAZIONE: OTTIENI IL BEARER TOKEN ---
    // Prima di chiamare qualsiasi endpoint, bisogna autenticarsi per ottenere il token
    const authResponse = await fetch('https://api-sandbox.autotrader.co.uk/authenticate', {
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

    // --- CHIAMATA DATI: RICHIESTA AI VEICOLI ---
    // Uso il token per chiamare l'endpoint /vehicles del sandbox
    
    const vehiclesResponse = await fetch(`https://api-sandbox.autotrader.co.uk/vehicles`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    // Se la richiesta ai veicoli fallisce, restituisco errore 500 con dettagli
    if (!vehiclesResponse.ok) {
      const status = vehiclesResponse.status;
      const statusText = vehiclesResponse.statusText;
      const errBody = await vehiclesResponse.text();
      console.error(`Errore richiesta vehicles: status=${status} ${statusText}, body=${errBody}`);
      return res.status(500).json({ error: 'Impossibile recuperare veicoli', status, statusText, details: errBody });
    }
    // Estraggo i dati JSON dalla risposta e li invio al frontend
    const data = await vehiclesResponse.json();
    console.log('Risultato GET /api/vehicles (vehicles):', data);
    res.json(data);
  } catch (error) {
    // Gestione errori generici (es. problemi di rete, token, ecc.)
    console.error('Errore nel recupero auto:', error);
    res.status(500).json({ error: 'Impossibile recuperare le auto', details: error });
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
