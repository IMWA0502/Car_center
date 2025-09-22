# Backend API

Backend Node.js (ESM) con Express e Socket.IO che funge da gateway verso l'API AutoTrader Sandbox.

## Avvio

1. Installa le dipendenze:
    ```bash
    npm install
    ```
2. Configura le variabili ambiente creando `.env` (vedi `.env.example`).
3. Avvia il server:
    ```bash
    npm start
    ```

## Variabili ambiente (.env)
- `AUTOTRADER_KEY`, `AUTOTRADER_SECRET`: credenziali sandbox.
- `AUTOTRADER_SANDBOX_ID`: advertiser/forecourt ID del sandbox.
- `AUTOTRADER_VEHICLES_ENDPOINT` (opzionale): endpoint da forzare per la lista veicoli (usa `{advertiserId}` come placeholder).
- `AUTOTRADER_PAGE_SIZE` (opzionale): page size standard per gli endpoint che la supportano.
- `PORT` (opzionale): porta del server (default 3000).

## Endpoint esposti
- `GET /api/vehicles`
   - Autentica su AutoTrader e prova una serie di endpoint supportati (o quello impostato in `AUTOTRADER_VEHICLES_ENDPOINT`).
   - Ritorna `{ sandboxId, source, vehicles }`, dove `vehicles` è il payload JSON dell'endpoint remoto.
- `GET /api/autotrader-id`
   - Ritorna `{ sandboxId }` letto dall'ambiente.
- `GET /api/autotrader-auth-info`
   - Esegue l'autenticazione e ritorna informazioni non sensibili (senza il token).
- `PUT /webhook/autotrader`
   - Endpoint per ricevere notifiche; ritrasmette via Socket.IO (`autotrader-update`).

Nota: le risposte provengono sempre dall'API reale; non sono presenti dati fittizi nel codice di produzione.
