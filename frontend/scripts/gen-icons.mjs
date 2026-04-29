import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '../public')

/**
 * Ícone PWA inspirado na identidade visual da FIFA World Cup 2026:
 * - Fundo dourado (paleta oficial: preto/branco/dourado).
 * - "26" grande em preto (mesmo peso/forma do logo oficial — quadrados
 *   e cantos arredondados — mas evocando, não reproduzindo a marca).
 * - Faixa "arco-íris" inferior com 8 cores das cidades-sede.
 * - Pequena silhueta do troféu acima do "26".
 *
 * NÃO usa a marca FIFA registrada — apenas a linguagem visual.
 */
const RAINBOW_STOPS = ['#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']

function rainbowBars(x, y, w, h, n = 8) {
  const stripe = w / n
  return RAINBOW_STOPS.slice(0, n)
    .map((c, i) => `<rect x="${x + i * stripe}" y="${y}" width="${stripe + 1}" height="${h}" fill="${c}"/>`)
    .join('')
}

function svgIcon(size, opts = { padding: false }) {
  const padding = opts.padding ? Math.round(size * 0.12) : 0
  const inner = size - padding * 2
  const rx = opts.padding ? 0 : Math.round(inner * 0.18)
  const fontSize = Math.round(inner * 0.52)
  const trophyW = Math.round(inner * 0.08)
  const trophyH = Math.round(inner * 0.10)
  const rainbowH = Math.round(inner * 0.08)

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fcd34d"/>
      <stop offset="55%" stop-color="#f5b800"/>
      <stop offset="100%" stop-color="#a87a0e"/>
    </linearGradient>
  </defs>
  <rect x="${padding}" y="${padding}" width="${inner}" height="${inner}" rx="${rx}" fill="url(#g)"/>

  <!-- Faixa arco-íris no rodapé do "card" -->
  <g transform="translate(${padding}, ${padding + inner - rainbowH})" clip-path="inset(0 round 0 0 ${rx} ${rx})">
    ${rainbowBars(0, 0, inner, rainbowH)}
  </g>

  <!-- Pequena silhueta do troféu acima do "26" -->
  <g fill="#0a0a0f" opacity="0.92" transform="translate(${padding + inner / 2 - trophyW / 2}, ${padding + inner * 0.16})">
    <rect x="0" y="0" width="${trophyW}" height="${trophyH}" rx="${Math.round(trophyW * 0.2)}"/>
    <rect x="${trophyW * 0.3}" y="${trophyH}" width="${trophyW * 0.4}" height="${trophyH * 0.35}"/>
    <rect x="${-trophyW * 0.05}" y="${trophyH * 1.32}" width="${trophyW * 1.1}" height="${trophyH * 0.25}" rx="${trophyW * 0.05}"/>
  </g>

  <!-- "26" central, inspirado na tipografia chunky da identidade -->
  <text x="50%" y="${padding + inner * 0.62}"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Inter Tight, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-weight="900"
        font-size="${fontSize}"
        fill="#0a0a0f"
        letter-spacing="${-fontSize * 0.06}">
    26
  </text>
</svg>`
}

const targets = [
  { name: 'icon-192.png', size: 192, padding: false },
  { name: 'icon-512.png', size: 512, padding: false },
  { name: 'icon-512-maskable.png', size: 512, padding: true },
]

for (const t of targets) {
  const buf = await sharp(Buffer.from(svgIcon(t.size, { padding: t.padding }))).png().toBuffer()
  await writeFile(resolve(outDir, t.name), buf)
  console.log(`✓ ${t.name} (${t.size}x${t.size}${t.padding ? ' maskable' : ''})`)
}

const favicon = await sharp(Buffer.from(svgIcon(64, { padding: false }))).png().toBuffer()
await writeFile(resolve(outDir, 'favicon.png'), favicon)
console.log('✓ favicon.png')

// SVG do favicon (usado no <link rel="icon"> do index.html)
const faviconSvg = svgIcon(64, { padding: false })
await writeFile(resolve(outDir, 'favicon.svg'), faviconSvg)
console.log('✓ favicon.svg')
