# Backend — Reconhecimento de figurinhas via Gemini

Serviço Cloud Run que recebe uma imagem e devolve a lista de IDs de figurinhas detectados na página do álbum.

## Endpoints

`GET /` — health check.

`POST /recognize`
- Headers: `Content-Type: application/json`, `X-Client-Token: <token>`
- Body: `{"imageBase64": "<base64 sem prefixo data:>", "mimeType": "image/jpeg"}`
- Response: `{"ids": [{"id": "BRA1", "filled": false}, ...], "team": "BRA", "page": 24, "durationMs": 1234}`

## Variáveis de ambiente

- `GEMINI_API_KEY` (obrigatório) — chave restrita à `generativelanguage.googleapis.com`.
- `ALLOWED_ORIGIN` — origin permitido por CORS (ex: `https://album-copa-2026-mr.web.app`).
- `CLIENT_TOKEN` — token compartilhado simples; cliente deve mandar em `X-Client-Token`.

## Rodar local

```bash
cd backend
GEMINI_API_KEY=... npm install
GEMINI_API_KEY=... npm run dev
```

## Deploy

```bash
gcloud run deploy album-backend \
  --source=backend \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_API_KEY=...,ALLOWED_ORIGIN=https://album-copa-2026-mr.web.app,CLIENT_TOKEN=..." \
  --project=album-copa-2026-mr
```
