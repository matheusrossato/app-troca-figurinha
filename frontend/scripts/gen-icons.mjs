import sharp from 'sharp'
import { writeFile, readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '../public')
const sourceLogo = resolve(outDir, 'logo-meu-album.png')

const NAVY = '#05122d'

const targets = [
  { name: 'icon-192.png', size: 192, padding: 0 },
  { name: 'icon-512.png', size: 512, padding: 0 },
  { name: 'icon-512-maskable.png', size: 512, padding: 64 },
]

const baseBuffer = await readFile(sourceLogo)

for (const t of targets) {
  const inner = t.size - t.padding * 2
  const resized = await sharp(baseBuffer).resize(inner, inner, { fit: 'contain', background: NAVY }).png().toBuffer()
  const composed = await sharp({
    create: { width: t.size, height: t.size, channels: 4, background: NAVY },
  })
    .composite([{ input: resized, top: t.padding, left: t.padding }])
    .png()
    .toBuffer()
  await writeFile(resolve(outDir, t.name), composed)
  console.log(`✓ ${t.name} (${t.size}x${t.size}${t.padding ? ' maskable' : ''})`)
}

const favicon = await sharp(baseBuffer).resize(64, 64).png().toBuffer()
await writeFile(resolve(outDir, 'favicon.png'), favicon)
console.log('✓ favicon.png')

const faviconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${NAVY}" rx="12"/>
  <image href="/logo-meu-album.png" x="6" y="6" width="52" height="52"/>
</svg>`
await writeFile(resolve(outDir, 'favicon.svg'), faviconSvg)
console.log('✓ favicon.svg')
