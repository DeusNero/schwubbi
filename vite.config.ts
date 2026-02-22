import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/schwubbi/',
  plugins: [
    react(),
    VitePWA({
      selfDestroying: true,
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Schwubbi',
        short_name: 'Schwubbi',
        description: 'Find the best cat photo through epic head-to-head battles!',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
