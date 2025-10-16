# backend2 - Webhook receiver for Car Center

This small Express server accepts incoming webhooks and emits them over Socket.IO to connected clients.

Files:
- `index.js` - webhook server
- `.env.example` - example environment variables

Install & run:

1. Copy `.env.example` to `.env` and edit values.
2. Install dependencies:

```powershell
cd backend2
npm install
```

3. Start server:

```powershell
npm start
# or for development with auto-reload (requires nodemon):
npm run dev
```

Endpoints:
- `POST /webhook` - receive webhooks. Use header `x-webhook-secret` if you set `WEBHOOK_SECRET`.
- `GET /events` - returns recent webhook events (in memory)
- `GET /health` - basic health check

Testing example (curl):

```powershell
# without secret
curl -X POST http://localhost:4000/webhook -H "Content-Type: application/json" -d '{"test":true}'

# with secret
curl -X POST http://localhost:4000/webhook -H "Content-Type: application/json" -H "x-webhook-secret: change-me" -d '{"test":true}'
```

Integrations:
- Use this server to receive Autotrader webhooks (if Autotrader supports them), or any other provider.
- You can connect a small Socket.IO client in your frontend to receive `webhookEvent` messages in real-time.