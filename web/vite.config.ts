import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://larachieppe.github.io/on-device-triage-assistant/ (a
// project page, not a user page), so production builds need this base path
// — omit it and every asset URL 404s once deployed. Scoped to `build` only:
// applying it to `serve` too breaks local dev, since Vite's dev server
// expects the app at the site root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/on-device-triage-assistant/' : '/',
  plugins: [react()],
}))
