import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['petcare.svg', 'apple-touch-icon-180x180.png', 'apple-touch-icon-152x152.png', 'apple-touch-icon-120x120.png'],
      manifest: {
        name: 'PetCare - Pet Health Tracker',
        short_name: 'PetCare',
        description: 'Track your pet\'s health, meals, and weight',
        // surface-0 hex (rgb(14 18 24)) — matches the dark token system so the
        // installed PWA launches without a light flash and the mobile status
        // bar tints to the new dark theme.
        theme_color: '#0E1218',
        background_color: '#0E1218',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/apple-touch-icon-180x180.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/apple-touch-icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/apple-touch-icon-120x120.png',
            sizes: '120x120',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/accounts\.google\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-auth-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      }
    })
  ],
})
