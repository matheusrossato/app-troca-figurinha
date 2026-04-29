import Tesseract, { type LoggerMessage } from 'tesseract.js'
import { normalizeStickerId, STICKERS_BY_ID } from '../data/album'

export interface DetectedId {
  /** ID canônico (ex: "BRA7") já validado contra o catálogo. */
  id: string
  /** Texto cru retornado pelo Tesseract antes da normalização. */
  raw: string
  /** Confiança 0..100 reportada pelo Tesseract. */
  confidence: number
}

export interface OcrResult {
  ids: DetectedId[]
  /** Texto bruto completo (concatenação dos passes), útil pra debug. */
  rawText: string
  /** Tempo de processamento em ms. */
  durationMs: number
  /** Confiança média do passe que mais detectou IDs. */
  confidence: number
  /** Quantos passes Tesseract rodou. */
  passes: number
}

let workerPromise: Promise<Tesseract.Worker> | null = null

async function getWorker(onProgress?: (p: number) => void): Promise<Tesseract.Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const w = await Tesseract.createWorker('eng', 1, {
        logger: (m: LoggerMessage) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            onProgress?.(m.progress)
          }
        },
      })
      // PSM 11 = "sparse text" — funciona melhor que PSM 6 quando o texto
      // não está em um bloco contínuo, e sim espalhado pela página
      // (que é exatamente o caso das páginas do álbum, com códigos como
      // "BRA 1", "BRA 13" distribuídos em uma grade com cores e sombras).
      await w.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
        tessedit_pageseg_mode: '11' as unknown as Tesseract.PSM,
      })
      return w
    })()
  }
  return workerPromise
}

interface Variant {
  canvas: HTMLCanvasElement
  label: string
}

/**
 * Gera variantes da imagem otimizadas para o tipo de tipografia das páginas
 * do álbum (números brancos grossos sobre fundo colorido com sombra):
 *   - "high-contrast"  → grayscale + estiramento de contraste
 *   - "inverted"       → versão invertida (texto branco vira preto)
 *
 * Tesseract roda em ambas e a gente une os resultados.
 */
async function makeVariants(blob: Blob): Promise<Variant[]> {
  const bitmap = await createImageBitmap(blob)
  // Texto grande lê melhor em alta resolução; aceita até 2400px no maior lado.
  const maxDim = 2400
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const baseCanvas = document.createElement('canvas')
  baseCanvas.width = w
  baseCanvas.height = h
  const baseCtx = baseCanvas.getContext('2d')!
  baseCtx.drawImage(bitmap, 0, 0, w, h)
  const baseImg = baseCtx.getImageData(0, 0, w, h)

  // Calcula min/max em grayscale para estirar contraste corretamente.
  const grays = new Uint8ClampedArray(w * h)
  let gMin = 255
  let gMax = 0
  for (let i = 0, p = 0; i < baseImg.data.length; i += 4, p++) {
    const g = (0.299 * baseImg.data[i] + 0.587 * baseImg.data[i + 1] + 0.114 * baseImg.data[i + 2]) | 0
    grays[p] = g
    if (g < gMin) gMin = g
    if (g > gMax) gMax = g
  }
  const range = Math.max(1, gMax - gMin)

  // Variant 1: grayscale com contraste estirado (texto preto em fundo branco).
  const hcCanvas = document.createElement('canvas')
  hcCanvas.width = w
  hcCanvas.height = h
  const hcCtx = hcCanvas.getContext('2d')!
  const hcImg = hcCtx.createImageData(w, h)
  for (let p = 0, i = 0; p < grays.length; p++, i += 4) {
    const v = ((grays[p] - gMin) / range) * 255
    hcImg.data[i] = hcImg.data[i + 1] = hcImg.data[i + 2] = v
    hcImg.data[i + 3] = 255
  }
  hcCtx.putImageData(hcImg, 0, 0)

  // Variant 2: invertido — texto branco vira escuro, ideal pra códigos brancos
  // do álbum em fundo claro.
  const invCanvas = document.createElement('canvas')
  invCanvas.width = w
  invCanvas.height = h
  const invCtx = invCanvas.getContext('2d')!
  const invImg = invCtx.createImageData(w, h)
  for (let p = 0, i = 0; p < grays.length; p++, i += 4) {
    const v = 255 - ((grays[p] - gMin) / range) * 255
    invImg.data[i] = invImg.data[i + 1] = invImg.data[i + 2] = v
    invImg.data[i + 3] = 255
  }
  invCtx.putImageData(invImg, 0, 0)

  return [
    { canvas: hcCanvas, label: 'high-contrast' },
    { canvas: invCanvas, label: 'inverted' },
  ]
}

/**
 * Extrai todos os IDs de figurinha válidos do texto. Faz match contra:
 *   - Códigos de país (BRA7, ARG17…)
 *   - Códigos especiais (FWC3, FM11)
 *   - Aceita zero à esquerda (BRA07 → BRA7) e separadores (BRA-7, BRA 7)
 */
export function extractStickerIds(rawText: string): { id: string; raw: string }[] {
  const found = new Map<string, string>()
  const pattern = /([A-Z]{2,3})\s*[-_ ]?\s*0*(\d{1,2})/g
  const upper = rawText.toUpperCase()
  let m: RegExpExecArray | null
  while ((m = pattern.exec(upper))) {
    const candidate = `${m[1]}${m[2]}`
    const normalized = normalizeStickerId(candidate)
    if (normalized && !found.has(normalized)) {
      found.set(normalized, m[0])
    }
  }
  return Array.from(found.entries()).map(([id, raw]) => ({ id, raw }))
}

export async function recognizeStickerIds(
  blob: Blob,
  onProgress?: (p: number) => void,
): Promise<OcrResult> {
  const start = performance.now()
  const worker = await getWorker(onProgress)
  const variants = await makeVariants(blob)

  const accumulated = new Map<string, { id: string; raw: string; confidence: number }>()
  const rawTexts: string[] = []
  let bestConfidence = 0

  for (const variant of variants) {
    const { data } = await worker.recognize(variant.canvas)
    rawTexts.push(`--- ${variant.label} (conf ${data.confidence.toFixed(0)}) ---\n${data.text}`)
    if (data.confidence > bestConfidence) bestConfidence = data.confidence
    for (const m of extractStickerIds(data.text)) {
      if (!accumulated.has(m.id)) {
        accumulated.set(m.id, { ...m, confidence: data.confidence })
      }
    }
  }

  const ids: DetectedId[] = Array.from(accumulated.values())

  return {
    ids,
    rawText: rawTexts.join('\n\n'),
    durationMs: performance.now() - start,
    confidence: bestConfidence,
    passes: variants.length,
  }
}

/** Útil pro toggle "fallback Gemini" decidir se vale chamar a API. */
export function shouldFallback(result: OcrResult, expectedRange?: string[]): boolean {
  if (result.ids.length === 0) return true
  if (expectedRange && expectedRange.length > 0) {
    const matched = result.ids.filter((d) => expectedRange.includes(d.id))
    return matched.length / expectedRange.length < 0.3
  }
  return false
}

export function summarizeOcr(result: OcrResult): string {
  if (result.ids.length === 0) return 'nenhum ID detectado'
  return result.ids.map((d) => d.id).join(', ')
}

export type { Tesseract }

void STICKERS_BY_ID
