import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  publicDir: resolve(__dirname, '素材'),
  server: { port: 5174 },
})
