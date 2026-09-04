import { defineConfig } from 'vite'
import { resolve } from 'node:path'

const pages = process.env.GITHUB_PAGES === '1'

export default defineConfig({
  base: pages ? '/wow-spec-cards/' : '/',
  publicDir: resolve(__dirname, '素材'),
  server: { port: 5174 },
})
