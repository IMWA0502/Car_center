# Backend API

Questo backend Node.js con Express espone una API REST che effettua una GET verso un sito esterno e restituisce i dati al frontend.

## Avvio

1. Installa le dipendenze:
   ```bash
   npm install
   ```
2. Avvia il server:
   ```bash
   npm start
   ```

## Endpoint
- `/api/data`: Effettua una GET verso `https://jsonplaceholder.typicode.com/posts` e restituisce i dati JSON.

Sostituisci l'URL esterno con quello che ti serve.
