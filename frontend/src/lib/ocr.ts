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
  /** Texto bruto completo, útil pra debug. */
  rawText: string
  /** Tempo de processamento em ms. */
  durationMs: number
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
      await w.setParameters({
        // Códigos do álbum são alfanuméricos curtos (BRA7, FWC3, FM11).
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        // PSM 6 = bloco uniforme de texto. Bom pra páginas de álbum onde
        // os IDs aparecem em grade. Ajustável depois com base em testes reais.
        tessedit_pageseg_mode: '6' as unknown as Tesseract.PSM,
      })
      return w
    })()
  }
  return workerPromise
}

/**
 * Pré-processa o blob para aumentar contraste e contraste antes do OCR.
 * Tesseract funciona melhor com fundo branco e texto preto. Aplicamos
 * grayscale + binarização adaptativa simples. Não é mágica, mas ajuda.
 */
async function preprocess(blob: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(blob)
  const maxDim = 1600
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)

  const img = ctx.getImageData(0, 0, w, h)
  const data = img.data
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    const v = gray > 150 ? 255 : gray < 90 ? 0 : gray
    data[i] = data[i + 1] = data[i + 2] = v
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

/**
 * Extrai todos os IDs de figurinha válidos do texto. Faz match contra:
 *   - Códigos de país (BRA7, ARG17…)
 *   - Códigos especiais (FWC3, FM11)
 *   - Aceita zero à esquerda (BRA07 → BRA7) e separadores (BRA-7, BRA 7)
 */
export function extractStickerIds(rawText: string): { id: string; raw: string }[] {
  const found = new Map<string, string>()
  const pattern = /\b([A-Z]{2,3})\s*[-_ ]?\s*0*(\d{1,2})\b/g
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
  const canvas = await preprocess(blob)
  const { data } = await worker.recognize(canvas)

  const matches = extractStickerIds(data.text)
  const ids: DetectedId[] = matches.map(({ id, raw }) => ({
    id,
    raw,
    confidence: data.confidence,
  }))

  return {
    ids,
    rawText: data.text,
    durationMs: performance.now() - start,
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

// Tipos referenciados estão disponíveis em runtime; manter import só no tipo.
export type { Tesseract }

// Garante que catálogo foi inicializado (lança no boot se modelo do álbum
// estiver inconsistente).
void STICKERS_BY_ID
