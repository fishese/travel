import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Custom domain (traveltools.fishese.cc) is served at the site root, not
  // /travel/. github.io/travel redirects there. A /travel/ base 404s every
  // JS/CSS file on the custom domain and the page stays blank.
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Travel Toolkit',
        short_name: 'Travel',
        description: 'Offline-first travel tools: currency, weather, flights, docs.',
        theme_color: '#1e3a34',
        background_color: '#f6f4ee',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
        // Long-press the home-screen icon (Android) for quick jumps,
        // skipping the tab bar entirely. tab=… is read once on load by
        // lib/tabs.ts's useActiveTab. No per-shortcut icons — reusing the
        // main 192px icon rather than shipping near-duplicate assets for
        // a handful of shortcuts.
        shortcuts: [
          {
            name: 'Currency converter',
            short_name: 'Money',
            url: '/?tab=money',
            icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Planner',
            short_name: 'Planner',
            url: '/?tab=planner',
            icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Cheatsheet',
            short_name: 'Cheatsheet',
            url: '/?tab=cheatsheet',
            icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
})
