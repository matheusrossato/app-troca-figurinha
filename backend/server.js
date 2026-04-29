import express from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error('GEMINI_API_KEY env var is required')
  process.exit(1)
}

const allowedOrigin = process.env.ALLOWED_ORIGIN || '*'
const sharedToken = process.env.CLIENT_TOKEN || ''

const genAI = new GoogleGenerativeAI(apiKey)
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0.1,
  },
})

const PROMPT = `Analise esta foto de uma página do álbum Panini FIFA World Cup 2026.
Identifique TODOS os códigos de figurinha visíveis (em espaços vazios ou em figurinhas coladas).

Formato canônico dos IDs (SEM espaços, SEM hífen):
- 3 letras (código FIFA da seleção) + número 1 a 20. Exemplos: BRA1, BRA13, MEX7, QAT20, SCO1.
- FWC + número 1 a 9 (introdução, mascote, slogan, troféus, bola).
- FM + número 1 a 11 (FIFA Museum, campeões anteriores).

Layout típico de uma página de seleção:
- Slot 1: escudo (figurinha metalizada/holográfica). Quando vazio, mostra apenas "MEX 1" ou similar.
- Slot 13: foto da equipe.
- Slots 2-12 e 14-20: jogadores. Quando vazio, mostra "MEX 7" + nome do jogador.

Retorne APENAS um objeto JSON SEM markdown e SEM comentário, com este schema exato:
{
  "ids": [
    {"id": "BRA1",  "filled": false},
    {"id": "BRA2",  "filled": true}
  ],
  "team": "BRA",
  "page": 24
}

Onde:
- "id": código canônico em maiúsculas, sem espaços ou hífens.
- "filled": true se a figurinha estiver fisicamente colada (com foto/imagem visível); false se o espaço estiver vazio (mostrando só o código e o nome do jogador).
- "team": código de 3 letras da seleção principal da página, ou null se for página de FWC/FIFA Museum.
- "page": número da página impresso no canto da folha, ou null se não visível.

Inclua TODOS os códigos visíveis (esperamos 20 IDs em uma página dupla de seleção, ou menos numa página parcial). Se não tiver certeza absoluta de "filled", chute false.`

const app = express()
app.use(express.json({ limit: '12mb' }))

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Client-Token')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'album-backend', model: 'gemini-2.5-flash' })
})

function checkToken(req, res) {
  if (sharedToken && req.headers['x-client-token'] !== sharedToken) {
    res.status(401).json({ error: 'unauthorized' })
    return false
  }
  return true
}

app.post('/recognize', async (req, res) => {
  if (!checkToken(req, res)) return

  const { imageBase64, mimeType } = req.body || {}
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'imageBase64 (base64 string) required' })
  }
  if (imageBase64.length > 12 * 1024 * 1024) {
    return res.status(413).json({ error: 'image too large' })
  }

  const start = Date.now()
  try {
    const result = await model.generateContent([
      PROMPT,
      { inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' } },
    ])
    const text = result.response.text()
    let parsed
    try {
      const cleaned = text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/, '')
        .trim()
      parsed = JSON.parse(cleaned)
    } catch (parseErr) {
      console.warn('failed to parse gemini output', parseErr.message)
      return res.status(502).json({ error: 'gemini returned non-JSON', rawText: text })
    }
    res.json({
      ids: Array.isArray(parsed?.ids) ? parsed.ids : [],
      team: parsed?.team ?? null,
      page: parsed?.page ?? null,
      durationMs: Date.now() - start,
    })
  } catch (err) {
    console.error('gemini error', err)
    res.status(500).json({ error: err?.message || 'gemini error' })
  }
})

const port = Number(process.env.PORT) || 8080
app.listen(port, () => {
  console.log(`album-backend listening on :${port}`)
})
