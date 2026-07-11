import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves project sites from /<repo-name>/ — update to match your repo.
  base: '/travel-toolkit/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Travel Toolkit',
        short_name: 'Travel',
        description: 'Offline-first travel tools: currency, weather, flights, docs.',
        theme_color: '#1e3a34',
        background_color: '#f6f4ee',
        display: 'standalone',
        start_url: '/travel-toolkit/',
        scope: '/travel-toolkit/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
})
