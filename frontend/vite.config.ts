/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || '';
  const cleanApiUrl = apiUrl.replace(/\/$/, '');
  const targetUrl = cleanApiUrl.endsWith('/api') ? cleanApiUrl.slice(0, -4) : cleanApiUrl;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: targetUrl ? {
        '/api': {
          target: targetUrl,
          changeOrigin: true,
        },
      } : undefined,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/tests/setup.ts',
    },
  };
})
