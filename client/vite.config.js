// Vite config: React support plus the Tailwind v4 plugin (v4 needs no tailwind.config.js).
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
