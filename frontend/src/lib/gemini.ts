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

interface GeminiApiResponse {
  ids?: { id?: string; filled?: boolean }[]
  team?: string | null
  page?: number | null
  durationMs?: number
  error?: string
  rawText?: string
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

export function isGeminiConfigured(): boolean {
  return !!BACKEND_URL && !!CLIENT_TOKEN
}

export async function recognizeWithGemini(blob: Blob): Promise<GeminiResult> {
  if (!BACKEND_URL || !CLIENT_TOKEN) {
    throw new Error('Backend Gemini não configurado (VITE_BACKEND_URL/VITE_CLIENT_TOKEN ausentes).')
  }

  const start = performance.now()
  const imageBase64 = await blobToBase64(blob)

  const res = await fetch(`${BACKEND_URL.replace(/\/$/, '')}/recognize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Token': CLIENT_TOKEN,
    },
    body: JSON.stringify({ imageBase64, mimeType: blob.type || 'image/jpeg' }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`backend ${res.status}: ${text || res.statusText}`)
  }

  const data: GeminiApiResponse = await res.json()
  if (data.error) throw new Error(data.error)

  const filledIds = new Set<string>()
  const ids: DetectedId[] = []
  for (const raw of data.ids ?? []) {
    if (typeof raw?.id !== 'string') continue
    const normalized = normalizeStickerId(raw.id)
    if (!normalized) continue
    if (!STICKERS_BY_ID.has(normalized)) continue
    ids.push({ id: normalized, raw: raw.id, confidence: 100 })
    if (raw.filled === true) filledIds.add(normalized)
  }

  return {
    ids,
    filledIds,
    team: data.team ?? null,
    page: data.page ?? null,
    durationMs: data.durationMs ?? Math.round(performance.now() - start),
    rawText: JSON.stringify(data, null, 2),
  }
}
