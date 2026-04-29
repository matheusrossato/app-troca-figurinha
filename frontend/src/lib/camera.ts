export type CaptureMode = 'page' | 'single'

export interface CapturedImage {
  blob: Blob
  dataUrl: string
  width: number
  height: number
  mode: CaptureMode
}

export async function startRearCamera(video: HTMLVideoElement): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Câmera não disponível neste navegador.')
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  })

  video.srcObject = stream
  await video.play().catch(() => {
    /* iOS Safari às vezes rejeita play(); o usuário pode tocar pra retomar */
  })
  return stream
}

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop())
}

export async function captureFrame(
  video: HTMLVideoElement,
  mode: CaptureMode,
): Promise<CapturedImage> {
  const w = video.videoWidth
  const h = video.videoHeight
  if (!w || !h) throw new Error('Vídeo não está pronto. Tente de novo em 1s.')

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(video, 0, 0, w, h)

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Falha ao gerar imagem'))),
      'image/jpeg',
      0.92,
    )
  })

  return {
    blob,
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    width: w,
    height: h,
    mode,
  }
}
