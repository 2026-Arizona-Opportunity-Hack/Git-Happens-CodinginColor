import path from 'node:path'
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // cloudflare() runs worker/index.ts and a local D1 inside `bun dev`
  plugins: [react(), tailwindcss(), cloudflare()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
})
