/**
 * Heurística de nitidez baseada em Laplacian variance numa amostra reduzida
 * do frame. Valores típicos:
 *   - desfocado: < 60
 *   - razoável:  60-120
 *   - nítido:    > 120 (depende de iluminação)
 *
 * Roda em ~3-6ms num frame 320x240, suficiente pra ~10 fps de análise.
 */

const ANALYSIS_WIDTH = 320

let analysisCanvas: HTMLCanvasElement | null = null

function getAnalysisCanvas(width: number, height: number): HTMLCanvasElement {
  if (!analysisCanvas) {
    analysisCanvas = document.createElement('canvas')
  }
  if (analysisCanvas.width !== width) analysisCanvas.width = width
  if (analysisCanvas.height !== height) analysisCanvas.height = height
  return analysisCanvas
}

export function measureSharpness(video: HTMLVideoElement): number {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return 0

  const w = ANALYSIS_WIDTH
  const h = Math.round((ANALYSIS_WIDTH * vh) / vw)
  const canvas = getAnalysisCanvas(w, h)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return 0
  ctx.drawImage(video, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)

  // Variância de um Laplaciano 4-conexo, sub-amostrado de 2 em 2 pixels.
  let sum = 0
  let sumSq = 0
  let count = 0

  for (let y = 2; y < h - 2; y += 2) {
    for (let x = 2; x < w - 2; x += 2) {
      const i = (y * w + x) * 4
      const c = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      const il = (y * w + (x - 2)) * 4
      const ir = (y * w + (x + 2)) * 4
      const iu = ((y - 2) * w + x) * 4
      const id = ((y + 2) * w + x) * 4
      const cl = data[il] * 0.299 + data[il + 1] * 0.587 + data[il + 2] * 0.114
      const cr = data[ir] * 0.299 + data[ir + 1] * 0.587 + data[ir + 2] * 0.114
      const cu = data[iu] * 0.299 + data[iu + 1] * 0.587 + data[iu + 2] * 0.114
      const cd = data[id] * 0.299 + data[id + 1] * 0.587 + data[id + 2] * 0.114
      const lap = Math.abs(4 * c - cl - cr - cu - cd)
      sum += lap
      sumSq += lap * lap
      count++
    }
  }

  if (count === 0) return 0
  const mean = sum / count
  const variance = sumSq / count - mean * mean
  return variance
}

export interface FocusTracker {
  /** Empurra uma medição na média móvel e retorna estado atual. */
  push(value: number): FocusState
  reset(): void
}

export type FocusQuality = 'searching' | 'low' | 'ok' | 'sharp'

export interface FocusState {
  raw: number
  smoothed: number
  quality: FocusQuality
  /** True quando esteve "sharp" por tempo suficiente — sinal pra auto-capturar. */
  stable: boolean
}

/** Mantém média móvel + flag de estabilidade pra auto-captura.
 *  Defaults calibrados pra dar tempo do autofoco trabalhar e do usuário
 *  re-enquadrar antes de disparar (1.8s consecutivos com smoothed >= 180).
 *  A camada de countdown na UI adiciona +1.5s antes da captura efetiva. */
export function createFocusTracker({
  windowSize = 8,
  sharpThreshold = 180,
  okThreshold = 90,
  stableFrames = 18,
}: {
  windowSize?: number
  sharpThreshold?: number
  okThreshold?: number
  stableFrames?: number
} = {}): FocusTracker {
  const buffer: number[] = []
  let consecutiveSharp = 0

  return {
    push(value: number): FocusState {
      buffer.push(value)
      if (buffer.length > windowSize) buffer.shift()
      const smoothed = buffer.reduce((a, b) => a + b, 0) / buffer.length

      let quality: FocusQuality
      if (buffer.length < 3) quality = 'searching'
      else if (smoothed >= sharpThreshold) quality = 'sharp'
      else if (smoothed >= okThreshold) quality = 'ok'
      else quality = 'low'

      if (quality === 'sharp') consecutiveSharp++
      else consecutiveSharp = 0

      return {
        raw: value,
        smoothed,
        quality,
        stable: consecutiveSharp >= stableFrames,
      }
    },
    reset() {
      buffer.length = 0
      consecutiveSharp = 0
    },
  }
}
