# Álbum Copa 2026

PWA para gerenciar a coleção do álbum Panini FIFA World Cup 2026 (980 figurinhas, 112 páginas).

## O que faz

- Tira foto de uma página do álbum e reconhece os números das figurinhas presentes via OCR (Tesseract.js local; fallback Gemini ainda não implementado).
- Mantém lista de figurinhas tidas, faltantes e repetidas com quantidade, persistido em IndexedDB.
- Backup manual via export/import JSON.
- Trocas via QR Code presencial e link compartilhável (fase 2, ainda não implementado).

## Stack

- **Frontend**: Vite 7 + React 19 + TypeScript + Tailwind v4 + `vite-plugin-pwa`.
- **OCR local**: Tesseract.js (WASM no navegador).
- **Fallback IA**: Gemini 2.5 Flash via backend Cloud Run (a implementar).
- **Persistência**: IndexedDB (`idb`) + export/import JSON.
- **Hospedagem**: Firebase Hosting.

## Estrutura

```
frontend/   PWA (Vite + React)
backend/    Cloud Run (proxy Gemini) — ainda não implementado
firebase.json
.firebaserc
```

## Rodando localmente

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173 (também escuta em 0.0.0.0)
npm run build        # gera frontend/dist
npm run icons        # regenera ícones PWA
```

A câmera só funciona em **HTTPS** ou `localhost`. Para testar no celular antes do deploy:
1. Rode `npm run dev` (já escuta em todas as interfaces).
2. Acesse `http://<IP-DA-SUA-MÁQUINA>:5173` do celular na mesma Wi-Fi.
3. Chrome Android pode bloquear câmera em HTTP — nesse caso, deploya antes (instruções abaixo).

## Deploy no Firebase Hosting

Pré-requisitos: conta Google Cloud / Firebase com projeto criado.

```bash
# uma vez
npm install -g firebase-tools
firebase login

# editar .firebaserc e trocar REPLACE_WITH_YOUR_PROJECT_ID pelo ID do seu projeto
# (Console: https://console.firebase.google.com → Project settings → Project ID)

# build + deploy
cd frontend && npm run build && cd ..
firebase deploy --only hosting
```

A URL final é `https://<project-id>.web.app`. Abra no Chrome do Pixel → menu → "Adicionar à tela inicial" pra instalar como PWA.

## Status do MVP

- [x] Scaffold PWA + manifest + service worker
- [x] Modelo de dados (980 figurinhas, 68 especiais)
- [x] Captura de câmera (foto única, modo página/figurinha)
- [x] OCR local com Tesseract
- [x] Persistência IndexedDB + reativa
- [x] Tela de coleção com filtros e contador ±
- [x] Export/import JSON
- [ ] Backend Cloud Run + fallback Gemini
- [ ] Deploy
- [ ] Trocas via QR Code (fase 2)
- [ ] Link compartilhável (fase 2)
