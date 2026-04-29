import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '../public')

const svg = (size, withPadding) => {
  const padding = withPadding ? Math.round(size * 0.12) : 0
  const inner = size - padding * 2
  const fontSize = Math.round(inner * 0.42)
  const ballR = Math.round(inner * 0.06)
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1d4ed8"/>
      <stop offset="100%" stop-color="#0a0a0a"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#g)" rx="${withPadding ? 0 : Math.round(size * 0.18)}"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-weight="800" font-size="${fontSize}" fill="#ffffff" letter-spacing="-2">
    26
  </text>
  <circle cx="${size - padding - ballR * 2}" cy="${padding + ballR * 2}" r="${ballR}" fill="#ffffff" opacity="0.85"/>
</svg>`
}

const targets = [
  { name: 'icon-192.png', size: 192, padding: false },
  { name: 'icon-512.png', size: 512, padding: false },
  { name: 'icon-512-maskable.png', size: 512, padding: true },
]

for (const t of targets) {
  const buf = await sharp(Buffer.from(svg(t.size, t.padding))).png().toBuffer()
  await writeFile(resolve(outDir, t.name), buf)
  console.log(`✓ ${t.name} (${t.size}x${t.size}${t.padding ? ' maskable' : ''})`)
}

const favicon = await sharp(Buffer.from(svg(64, false))).png().toBuffer()
await writeFile(resolve(outDir, 'favicon.png'), favicon)
console.log('✓ favicon.png')
