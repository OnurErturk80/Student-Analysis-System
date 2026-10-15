/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.VITE_BASE ?? '/student-analysis-system/'

export default defineConfig({
  base,
  define: { __SURUM__: JSON.stringify(`${(process.env.GITHUB_SHA ?? 'yerel').slice(0, 7)} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon.svg'],
      manifest: {
        name: 'Student Analysis System',
        short_name: 'SAS',
        description: '7. ve 8. sınıflar için haftalık sınav değerlendirme',
        lang: 'tr',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#F4F5F7',
        theme_color: '#3355E0',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { maximumFileSizeToCacheInBytes: 6 * 1024 * 1024 },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
