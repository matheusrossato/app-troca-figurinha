import { normalizeStickerId, STICKERS_BY_ID } from '../data/album'
import type { DetectedId } from './ocr'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined
const CLIENT_TOKEN = import.meta.env.VITE_CLIENT_TOKEN as string | undefined

export interface GeminiResult {
  ids: DetectedId[]
  /** IDs que vieram com filled=true (figurinhas que estão coladas na página). */
  filledIds: Set<string>
  team: string | null
  page: number | null
  durationMs: number
  rawText: string
}

interface ParsedTrailer {
  done: true
  durationMs?: number
  error?: string
  parsed?: {
    ids?: { id?: string; filled?: boolean }[]
    team?: string | null
    page?: number | null
  } | null
}

export function isGeminiConfigured(): boolean {
  return !!BACKEND_URL && !!CLIENT_TOKEN
}

/** Pre-warm: dispara um GET / pra Cloud Run levantar a instância antes da
 *  primeira foto. Falhas são silenciosas — é só best-effort. */
export function prewarmBackend(): void {
  if (!BACKEND_URL) return
  fetch(`${BACKEND_URL.replace(/\/$/, '')}/`, {
    method: 'GET',
    cache: 'no-store',
  }).catch(() => {})
}

/** Reduz a imagem a `maxDim` no maior lado e re-encoda como JPEG. Reduz
 *  drasticamente o upload e o tempo de processamento do Gemini, sem perda
 *  significativa de precisão pra OCR/vision. */
export async function downsizeImage(
  blob: Blob,
  maxDim = 1280,
  quality = 0.85,
): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && blob.type === 'image/jpeg') return blob
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob falhou'))),
      'image/jpeg',
      quality,
    )
  })
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

interface ProgressEvent {
  /** 0..1 estimado pelos bytes recebidos. */
  progress: number
  /** Quantidade de bytes de texto recebidos do servidor até agora. */
  bytesReceived: number
}

export async function recognizeWithGemini(
  rawBlob: Blob,
  onProgress?: (e: ProgressEvent) => void,
): Promise<GeminiResult> {
  if (!BACKEND_URL || !CLIENT_TOKEN) {
    throw new Error('Backend Gemini não configurado (VITE_BACKEND_URL/VITE_CLIENT_TOKEN ausentes).')
  }

  const start = performance.now()
  const optimized = await downsizeImage(rawBlob)
  const imageBase64 = await blobToBase64(optimized)

  const res = await fetch(`${BACKEND_URL.replace(/\/$/, '')}/recognize-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Token': CLIENT_TOKEN,
    },
    body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg' }),
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    throw new Error(`backend ${res.status}: ${text || res.statusText}`)
  }

  // Lê a stream texto até encontrar o sentinel __DONE__{json}.
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let bytesReceived = 0
  // Estimativa: resposta JSON tem tipicamente 800-1500 chars para uma página
  // de seleção. Usamos 1500 como teto pra barra; se passar, fica em 0.99.
  const expectedSize = 1500

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      bytesReceived += value.length
      buffer += decoder.decode(value, { stream: true })
      onProgress?.({
        progress: Math.min(0.99, buffer.length / expectedSize),
        bytesReceived,
      })
    }
  }

  const sentinelIndex = buffer.lastIndexOf('__DONE__')
  if (sentinelIndex < 0) {
    throw new Error(`resposta do backend sem sentinel __DONE__: ${buffer.slice(0, 200)}`)
  }
  const trailerJson = buffer.slice(sentinelIndex + '__DONE__'.length).trim()
  const streamedText = buffer.slice(0, sentinelIndex).trim()

  let trailer: ParsedTrailer
  try {
    trailer = JSON.parse(trailerJson)
  } catch (err) {
    throw new Error(`trailer não-JSON: ${trailerJson.slice(0, 200)}`)
  }
  if (trailer.error) throw new Error(trailer.error)
  if (!trailer.parsed) {
    throw new Error('Gemini não retornou JSON parseável. Veja o debug.')
  }

  const filledIds = new Set<string>()
  const ids: DetectedId[] = []
  for (const raw of trailer.parsed.ids ?? []) {
    if (typeof raw?.id !== 'string') continue
    const normalized = normalizeStickerId(raw.id)
    if (!normalized) continue
    if (!STICKERS_BY_ID.has(normalized)) continue
    ids.push({ id: normalized, raw: raw.id, confidence: 100 })
    if (raw.filled === true) filledIds.add(normalized)
  }

  onProgress?.({ progress: 1, bytesReceived })

  return {
    ids,
    filledIds,
    team: trailer.parsed.team ?? null,
    page: trailer.parsed.page ?? null,
    durationMs: trailer.durationMs ?? Math.round(performance.now() - start),
    rawText: streamedText || JSON.stringify(trailer.parsed, null, 2),
  }
}
