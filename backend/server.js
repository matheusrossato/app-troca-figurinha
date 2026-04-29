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

const BACKS_PROMPT = `Esta foto mostra figurinhas do álbum Panini FIFA World Cup 2026 com o VERSO virado para cima.

LOCALIZAÇÃO DO ID NO VERSO (regra absoluta — onde olhar):
- No CANTO SUPERIOR DIREITO de cada verso há um BADGE/PILL CINZA com este formato:
    "FIFA WORLD CUP 2026 | XXX N"
- Apenas o "XXX N" do final do badge é o ID da figurinha (ex: "AUT 8", "BRA 7", "FWC 3").
- IGNORE o resto do verso: logo da FIFA, texto legal em português/espanhol, "OFFICIAL LICENSED PRODUCT", marca Panini, número de série pequeno na lateral.

CÓDIGOS válidos:
- 3 letras (código FIFA da seleção) + número 1 a 20. Exemplos: BRA1, BRA13, MEX7, QAT20, SCO1, AUT8.
- FWC + número 1 a 9 (introdução, mascote, slogan, troféus).
- FM + número 1 a 11 (FIFA Museum).

DICAS importantes (o usuário tipicamente espalha figurinhas na mesa):
- As figurinhas podem estar em ÂNGULOS ROTACIONADOS (não alinhadas).
- Algumas podem estar PARCIALMENTE SOBREPOSTAS — leia o badge se ele estiver visível, mesmo que parte da figurinha esteja coberta.
- Pode haver DUPLICATAS reais (mesmo ID em duas figurinhas diferentes da mesma foto). Inclua todas — uma entrada por figurinha física.
- Se um badge estiver totalmente coberto/ilegível, NÃO chute; omita.

Liste TODOS os badges visíveis na foto, INCLUINDO DUPLICATAS. Se você vê "AUT 4" em duas figurinhas diferentes, retorne "AUT4" duas vezes no array. O número de entradas no array deve ser igual ao número de figurinhas físicas que você consegue ler o badge.

Retorne APENAS um objeto JSON SEM markdown e SEM comentários:
{
  "ids": [
    {"id": "BRA7"},
    {"id": "BRA7"},
    {"id": "BRA7"},
    {"id": "ARG12"},
    {"id": "AUT8"}
  ]
}

Onde "id" é o código canônico em maiúsculas, SEM espaços ou hífens. Se não tiver certeza absoluta de um código, omita.`

const PAGE_PROMPT = `Analise esta foto de uma página do álbum Panini FIFA World Cup 2026.

ESTRUTURA FIXA do álbum (regra absoluta — memorize):
Cada seleção ocupa 2 páginas consecutivas (esquerda par + direita ímpar) com 20 figurinhas numeradas 1 a 20:
- Slot 1 = ESCUDO da seleção (figurinha metalizada/holográfica). Sempre no topo da página ESQUERDA (par).
- Slots 2 a 10 = jogadores, distribuídos no restante da página ESQUERDA.
- Slots 11 e 12 = jogadores no INÍCIO da página DIREITA (na mesma linha que a foto da equipe, à ESQUERDA dela).
- Slot 13 = FOTO DA EQUIPE / nome do país em VÁRIOS IDIOMAS. Âncora visual da página direita. Pode estar vazio (mostrando só "BRA 13" ou similar) ou colado (mostrando foto da equipe e textos como "Brazil | Brasil | Brésil | Brasilien | Brasile | Brazylia | Бразилия").
- Slots 14 a 20 = jogadores no RESTANTE da página DIREITA (DEPOIS da foto da equipe).

REGRA DE NUMERAÇÃO (para evitar erros comuns):
- Se a foto contém o ESCUDO no canto, é página ESQUERDA → numere 1 a 10.
- Se a foto contém a FOTO DA EQUIPE (ou seu espaço vazio rotulado "XXX 13"), é página DIREITA → os 2 jogadores ANTES dela são 11 e 12, e os DEPOIS são 14 a 20. NUNCA numere a partir de 1 numa página direita.
- Se a foto contém AMBAS, numere 1 a 20.

CÓDIGOS válidos:
- 3 letras (código FIFA da seleção) + número 1 a 20. Exemplos: BRA1, BRA13, MEX7, QAT20, SCO1.
- FWC + número 1 a 9 (introdução, mascote, slogan, troféus, bola).
- FM + número 1 a 11 (FIFA Museum / campeões anteriores).

Quando o espaço estiver vazio, o álbum imprime o código e (em slots de jogador) o nome do jogador.
Quando estiver colado, vê-se a foto da figurinha (jogador, escudo holográfico ou foto da equipe).

Retorne APENAS um objeto JSON SEM markdown e SEM comentário, com este schema exato:
{
  "ids": [
    {"id": "BRA1",  "filled": false},
    {"id": "BRA11", "filled": true},
    {"id": "BRA13", "filled": true}
  ],
  "team": "BRA",
  "page": 25
}

Onde:
- "id": código canônico em maiúsculas, SEM espaços ou hífens.
- "filled": true se a figurinha estiver fisicamente colada (foto visível); false se o espaço estiver vazio.
- "team": código de 3 letras da seleção principal, ou null se for FWC/FIFA Museum.
- "page": número da página impresso no canto da folha (texto pequeno tipo "8" ou "25"), ou null se não visível.

Inclua TODOS os códigos visíveis. Se em dúvida sobre filled, chute false.`

function promptFor(mode) {
  return mode === 'backs' ? BACKS_PROMPT : PAGE_PROMPT
}

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

function parseGeminiJson(text) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim()
  return JSON.parse(cleaned)
}

app.post('/recognize', async (req, res) => {
  if (!checkToken(req, res)) return

  const { imageBase64, mimeType, mode } = req.body || {}
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'imageBase64 (base64 string) required' })
  }
  if (imageBase64.length > 12 * 1024 * 1024) {
    return res.status(413).json({ error: 'image too large' })
  }

  const start = Date.now()
  try {
    const result = await model.generateContent([
      promptFor(mode),
      { inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' } },
    ])
    const text = result.response.text()
    let parsed
    try {
      parsed = parseGeminiJson(text)
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

// Streaming endpoint — devolve chunks de texto crus enquanto Gemini gera,
// terminando com uma linha `__DONE__` seguida do JSON final consolidado.
// Frontend mostra a barra de progresso baseada em bytes recebidos.
app.post('/recognize-stream', async (req, res) => {
  if (!checkToken(req, res)) return

  const { imageBase64, mimeType, mode } = req.body || {}
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'imageBase64 (base64 string) required' })
  }
  if (imageBase64.length > 12 * 1024 * 1024) {
    return res.status(413).json({ error: 'image too large' })
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()

  const start = Date.now()
  let raw = ''
  try {
    const stream = await model.generateContentStream([
      promptFor(mode),
      { inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' } },
    ])
    for await (const chunk of stream.stream) {
      const piece = chunk.text()
      raw += piece
      res.write(piece)
    }
    let parsed = null
    try {
      parsed = parseGeminiJson(raw)
    } catch {
      // Mantém raw para o cliente ver / debugar.
    }
    const trailer = JSON.stringify({
      done: true,
      durationMs: Date.now() - start,
      parsed: parsed
        ? {
            ids: Array.isArray(parsed.ids) ? parsed.ids : [],
            team: parsed.team ?? null,
            page: parsed.page ?? null,
          }
        : null,
    })
    res.write(`\n__DONE__${trailer}\n`)
    res.end()
  } catch (err) {
    console.error('gemini stream error', err)
    const errPayload = JSON.stringify({ done: true, error: err?.message || 'gemini error' })
    res.write(`\n__DONE__${errPayload}\n`)
    res.end()
  }
})

const port = Number(process.env.PORT) || 8080
app.listen(port, () => {
  console.log(`album-backend listening on :${port}`)
})
