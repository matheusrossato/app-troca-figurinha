import express from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error('GEMINI_API_KEY env var is required')
  process.exit(1)
}

// ALLOWED_ORIGIN aceita múltiplas origens separadas por vírgula. Durante a
// transição da URL do app, mantemos as duas funcionando.
const allowedOrigins = (process.env.ALLOWED_ORIGIN || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const sharedToken = process.env.CLIENT_TOKEN || ''

const genAI = new GoogleGenerativeAI(apiKey)
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0,
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
- FWC + número 1 a 19 (introdução do álbum + FIFA Museum/History).
- CC + número 1 a 14 (Coca-Cola — jogadores patrocinados).

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

============================================================
🛑 REGRA #1 — VAZIO vs COLADO (LEIA ANTES DE QUALQUER COISA)
============================================================

ANATOMIA DE UM SLOT VAZIO (memorize esse layout vertical):
  ┌─────────────────────┐
  │      ↑   XXX        │  ← sigla de 3 letras (BRA, MAR, RSA, CZE...)
  │      |              │     em cima do slot, FONTE MÉDIA
  │      |    N         │  ← número 1-20, FONTE GIGANTE (ocupa metade
  │      ↓              │     do slot, dominante visualmente)
  │  NOME DO JOGADOR    │  ← nome em fonte pequena embaixo
  └─────────────────────┘
Se você vê esses 3 elementos empilhados (sigla + número grande + nome),
o slot está VAZIO. Cor de fundo do template (verde, laranja, roxo etc.)
é IRRELEVANTE — só design.

ANATOMIA DE UM SLOT COLADO COM FIGURINHA DE JOGADOR (slots 2-12, 14-20):
  ┌─────────────────────┐
  │   👤 (rosto humano) │  ← foto real do jogador (pele, olhos, cabelo)
  │     com camisa      │     ocupando ~70% do slot
  │  ─────────────────  │
  │ ESCUDO  Nome  PUMA  │  ← rodapé com escudo pequeno + nome + Panini/marca
  └─────────────────────┘
NÃO tem mais a sigla "XXX" nem o "N" grande visível — a figurinha cobre.

EXCEÇÕES (slots especiais):
- SLOT 1 (sempre topo da página esquerda): quando colado, mostra o
  ESCUDO METALIZADO da seleção (brasão oficial, holográfico, iridescente
  — ex: CBF do Brasil, FACR da Tchéquia, SAFA da África do Sul). NÃO é
  rosto humano. Quando VAZIO mostra "XXX 1" grande sobre o template.
- SLOT 13 (meio da página direita): quando colado, mostra a FOTO DA
  EQUIPE (grupo de ~22 jogadores em pé/agachados em campo) + nome do
  país em vários idiomas (ex: "Brazil | Brasil | Brésil | Brasilien |
  Brasile | Brazylia | Бразилия"). Quando VAZIO mostra "XXX 13" grande.

ALGORITMO PRA CADA SLOT:
  1. Vejo a TRÍADE "sigla XXX + número N grande + nome de jogador"
     empilhados verticalmente?  → VAZIO (filled=false). Pare.
  2. Vejo um ROSTO HUMANO ocupando o slot?  → COLADO de jogador.
  3. É slot 1 e vejo um BRASÃO METALIZADO iridescente?  → COLADO escudo.
  4. É slot 13 e vejo um GRUPO de jogadores + nomes multilíngues?
     → COLADO foto da equipe.
  5. É FWC/CC e vejo imagem temática com hologram?  → COLADO especial.

❌ ERROS QUE VOCÊ JÁ COMETEU (e não pode repetir):
- BRA1 detectado colado porque o slot tem fundo verde/amarelo. ERRADO.
  Tem "BRA" + "1" gigante + "ALISSON" → VAZIO.
- MAR N detectado colado porque a página é laranja vibrante. ERRADO.
  Cada slot vazio dali tem "MAR" + "N" + nome — VAZIO.
- RSA1, CZE1 detectados colados pela cor de template. ERRADO.

✅ Resumo: cor de fundo NUNCA decide. O que decide é a presença da
   tríade "sigla + número grande + nome" (= vazio) vs foto humana /
   brasão metalizado / foto de equipe / imagem temática FWC/CC (= colado).

============================================================
ESTRUTURA DO ÁLBUM (993 figurinhas, 113 páginas)
============================================================

A. PÁGINAS DE SELEÇÃO (8-104, 48 seleções × 2 páginas)
Cada seleção ocupa 2 páginas consecutivas (esquerda par + direita ímpar) com 20 figurinhas numeradas 1 a 20:
- Slot 1 = ESCUDO da seleção (metalizado/holográfico). Topo da página ESQUERDA (par).
- Slots 2-10 = jogadores, restante da página ESQUERDA.
- Slots 11-12 = jogadores no INÍCIO da página DIREITA (à esquerda da foto da equipe).
- Slot 13 = FOTO DA EQUIPE / nome do país em vários idiomas (âncora visual da página direita).
- Slots 14-20 = jogadores DEPOIS da foto da equipe.

REGRA DE NUMERAÇÃO:
- Foto contém ESCUDO no canto → página ESQUERDA → numere 1 a 10.
- Foto contém FOTO DA EQUIPE (ou slot vazio "XXX 13") → página DIREITA → 2 jogadores ANTES dela são 11 e 12, DEPOIS são 14-20. NUNCA numere a partir de 1 numa página direita.
- Foto contém AMBAS → numere 1 a 20.

B. PÁGINAS FWC — INTRODUÇÃO (págs 1-3, 8 figurinhas)
Layout heterogêneo, MEMORIZE:
- Pág 1: FWC1 + FWC2 (taça da Copa, formando UMA única imagem grande sobre 2 slots) | FWC3 (mascotes oficiais) | FWC4 (slogan oficial)
- Pág 2: FWC5 (Trionda — bola oficial) | FWC6 (taça com fundo vermelho/Canadá)
- Pág 3: FWC7 (taça fundo verde) | FWC8 (taça fundo azul claro)

REGRA CRÍTICA — TAÇA DUPLA: FWC1 e FWC2 NÃO são figurinhas separadas visualmente. São DUAS figurinhas físicas que, coladas lado-a-lado, formam UMA única imagem grande da taça da Copa 2026. Quando você vê esse pôster da taça grande COLADO na pág 1, retorne SEMPRE AMBAS: {"id":"FWC1","filled":true} E {"id":"FWC2","filled":true}. Nunca retorne só FWC1.

C. PÁGINAS FWC — FIFA MUSEUM/HISTORY (págs 106-109, 11 figurinhas: FWC9-FWC19)
Cada uma é a foto da equipe campeã de uma Copa anterior + hologram dourado/colorido.
Layout exato:
- Pág 106: FWC9 (Itália 1934, campeã) | FWC10 (Uruguai 1950, campeã)
- Pág 107: FWC11 (Alemanha Ocidental 1954) | FWC12 (Brasil 1962) | FWC13 (Alemanha Ocidental 1974)
- Pág 108: FWC14 (Argentina 1986) | FWC15 (Brasil 1994)
- Pág 109: FWC16 (Brasil 2002) | FWC17 (Itália 2006) | FWC18 (Alemanha 2014) | FWC19 (Argentina 2022)

ATENÇÃO — DECORAÇÕES vs FIGURINHAS na seção Museum:
Nessas páginas há OUTRAS fotos de equipes campeãs com efeito hologram que NÃO são figurinhas — são impressões fixas decorativas (Uruguai 1930, Itália 1938, Brasil 1958, Inglaterra 1966, Brasil 1970, Argentina 1978, Itália 1982, Alemanha 1990, França 1998, Espanha 2010, França 2018). Essas NÃO devem aparecer no resultado, mesmo que o efeito visual pareça figurinha. Só os FWC9-FWC19 listados acima são figurinhas reais.

D. PÁGINAS COCA-COLA (págs 112-113, 14 figurinhas: CC1-CC14)
Layout (jogadores patrocinados pela Coca-Cola, fundo vermelho com curva branca):
- Pág 112: CC1 (Lamine Yamal/Espanha) | CC2 (Joshua Kimmich/Alemanha) | CC3 (Harry Kane/Inglaterra) | CC4 (Santiago Giménez/México) | CC5 (Joško Gvardiol/Croácia) | CC6 (Federico Valverde/Uruguai)
- Pág 113 (contracapa): CC7 (Jefferson Lerma/Colômbia) | CC8 (Enner Valencia/Equador) | CC9 (Gabriel Magalhães/Brasil) | CC10 (Virgil van Dijk/Holanda) | CC11 (Alphonso Davies/Canadá) | CC12 (Emiliano Martínez/Argentina) | CC13 (Raúl Jiménez/México) | CC14 (Lautaro Martínez/Argentina)

============================================================
CÓDIGOS VÁLIDOS (qualquer outro = inválido, omita)
============================================================
- 3 letras FIFA + número 1-20 (seleções: BRA1, BRA13, MEX7, QAT20, SCO1).
- FWC + número 1-19 (introdução + Museum). NÃO existe FWC ≥ 20.
- CC + número 1-14 (Coca-Cola). NÃO existe CC ≥ 15.
- NÃO EXISTE prefixo "FM" — se ler "FM N" no álbum, ignore (foi convenção antiga).

============================================================
VAZIO vs COLADO — referência (regra completa está no topo)
============================================================
Veja "REGRA #1" no topo deste prompt. Resumo:
- Vê "XXX N" grande → VAZIO (filled=false), independente da cor de fundo.
- Vê foto humana / brasão metalizado → COLADO (filled=true).
- FWC/CC colados sem código: inferir pelo layout + imagem.

============================================================
SCHEMA DE RESPOSTA (JSON puro, sem markdown)
============================================================
{
  "ids": [
    {"id": "FWC1", "filled": true},
    {"id": "FWC2", "filled": true},
    {"id": "FWC3", "filled": false},
    {"id": "FWC4", "filled": false}
  ],
  "team": null,
  "page": 1
}

Campos:
- "id": código canônico em maiúsculas, SEM espaços/hífens.
- "filled": true se a figurinha está fisicamente colada (imagem visível); false se vazio.
- "team": código de 3 letras da seleção principal, OU null para FWC/CC.
- "page": número impresso no canto da página, OU null se não visível.

Inclua TODOS os códigos visíveis. Em dúvida sobre filled, chute false.`

function promptFor(mode) {
  return mode === 'backs' ? BACKS_PROMPT : PAGE_PROMPT
}

const app = express()
app.use(express.json({ limit: '12mb' }))

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*')
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
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
