import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

function safeExec(cmd: string, fallback = ''): string {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return fallback
  }
}

const gitHash = safeExec('git rev-parse --short HEAD', 'dev')
const gitDirty = safeExec('git status --porcelain') ? '+' : ''
const buildTime = new Date().toISOString()

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(`${gitHash}${gitDirty}`),
    __APP_BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Álbum Copa 2026',
        short_name: 'Copa 2026',
        description: 'Gerenciador de figurinhas do álbum Panini Copa do Mundo 2026',
        theme_color: '#05122d',
        background_color: '#05122d',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
    }),
  ],
  server: { host: true },
})
