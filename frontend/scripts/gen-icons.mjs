import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '../public')

/**
 * Ícone PWA inspirado na linguagem visual da FIFA World Cup 26™
 * (sem reproduzir a marca registrada):
 *
 * - Fundo dourado (paleta oficial: preto/branco/dourado).
 * - Padrão sutil de QUADRADOS + QUARTOS DE CÍRCULO no fundo, evocando
 *   o sistema gráfico oficial onde 48 unidades formam o "26".
 * - "26" gigante em preto, tipografia chunky.
 * - Pequena silhueta do troféu acima do número.
 * - Faixa "arco-íris" das 16 cidades-sede no rodapé do card.
 */

const RAINBOW_STOPS = [
  '#ef4444', '#f97316', '#eab308', '#10b981',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
]

function rainbowBars(x, y, w, h, n = 8) {
  const stripe = w / n
  return RAINBOW_STOPS.slice(0, n)
    .map(
      (c, i) =>
        `<rect x="${x + i * stripe}" y="${y}" width="${stripe + 1}" height="${h}" fill="${c}"/>`,
    )
    .join('')
}

/**
 * Padrão sutil de quadrados + quartos de círculo (referência ao "26" oficial,
 * que é construído com 48 dessas unidades). Aplicado com baixa opacidade.
 */
function squarePattern(x, y, w, h, unit) {
  const cols = Math.ceil(w / unit)
  const rows = Math.ceil(h / unit)
  const out = []
  let seed = 7
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = x + c * unit
      const py = y + r * unit
      const v = rand()
      if (v < 0.55) {
        // quadrado simples
        out.push(`<rect x="${px}" y="${py}" width="${unit}" height="${unit}" fill="rgba(0,0,0,0.06)"/>`)
      } else if (v < 0.85) {
        // quarto de círculo
        const corner = Math.floor(rand() * 4)
        const cx = corner === 1 || corner === 2 ? px + unit : px
        const cy = corner >= 2 ? py + unit : py
        out.push(
          `<path d="M ${px} ${py} h ${unit} v ${unit} h ${-unit} z M ${cx} ${cy} L ${cx + (corner === 1 || corner === 2 ? -unit : unit)} ${cy} A ${unit} ${unit} 0 0 ${corner === 0 || corner === 2 ? 1 : 0} ${cx} ${cy + (corner >= 2 ? -unit : unit)} z" fill="rgba(0,0,0,0.05)"/>`,
        )
      }
      // else: vazio (deixa o fundo dourado mostrar)
    }
  }
  return out.join('')
}

function svgIcon(size, opts = { padding: false }) {
  const padding = opts.padding ? Math.round(size * 0.12) : 0
  const inner = size - padding * 2
  const rx = opts.padding ? 0 : Math.round(inner * 0.18)
  const fontSize = Math.round(inner * 0.52)
  const trophyW = Math.round(inner * 0.09)
  const trophyH = Math.round(inner * 0.12)
  const rainbowH = Math.round(inner * 0.08)
  const patternUnit = Math.max(8, Math.round(inner / 12))

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fcd34d"/>
      <stop offset="55%" stop-color="#f5b800"/>
      <stop offset="100%" stop-color="#a87a0e"/>
    </linearGradient>
    <clipPath id="card">
      <rect x="${padding}" y="${padding}" width="${inner}" height="${inner}" rx="${rx}"/>
    </clipPath>
  </defs>

  <!-- Card dourado de fundo -->
  <rect x="${padding}" y="${padding}" width="${inner}" height="${inner}" rx="${rx}" fill="url(#g)"/>

  <!-- Padrão sutil 48-unit-style por trás de tudo -->
  <g clip-path="url(#card)">
    ${squarePattern(padding, padding, inner, inner, patternUnit)}
  </g>

  <!-- Troféu (silhueta, com taça e base) -->
  <g fill="#0a0a0f" transform="translate(${padding + inner / 2 - trophyW / 2}, ${padding + inner * 0.13})">
    <path d="M 0 0
             h ${trophyW}
             v ${trophyH * 0.55}
             a ${trophyW * 0.5} ${trophyW * 0.5} 0 0 1 ${-trophyW} 0
             z" />
    <rect x="${trophyW * 0.32}" y="${trophyH * 0.55}" width="${trophyW * 0.36}" height="${trophyH * 0.20}"/>
    <rect x="${-trophyW * 0.05}" y="${trophyH * 0.78}" width="${trophyW * 1.10}" height="${trophyH * 0.18}" rx="${trophyW * 0.05}"/>
  </g>

  <!-- "26" central -->
  <text x="50%" y="${padding + inner * 0.66}"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Inter Tight, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-weight="900"
        font-size="${fontSize}"
        fill="#0a0a0f"
        letter-spacing="${-fontSize * 0.06}">26</text>

  <!-- Faixa arco-íris no rodapé do card -->
  <g clip-path="url(#card)">
    ${rainbowBars(padding, padding + inner - rainbowH, inner, rainbowH)}
  </g>
</svg>`
}

const targets = [
  { name: 'icon-192.png', size: 192, padding: false },
  { name: 'icon-512.png', size: 512, padding: false },
  { name: 'icon-512-maskable.png', size: 512, padding: true },
]

for (const t of targets) {
  const buf = await sharp(Buffer.from(svgIcon(t.size, { padding: t.padding })))
    .png()
    .toBuffer()
  await writeFile(resolve(outDir, t.name), buf)
  console.log(`✓ ${t.name} (${t.size}x${t.size}${t.padding ? ' maskable' : ''})`)
}

const favicon = await sharp(Buffer.from(svgIcon(64, { padding: false })))
  .png()
  .toBuffer()
await writeFile(resolve(outDir, 'favicon.png'), favicon)
console.log('✓ favicon.png')

await writeFile(resolve(outDir, 'favicon.svg'), svgIcon(64, { padding: false }))
console.log('✓ favicon.svg')
