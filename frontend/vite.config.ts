import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'frontend',
  envDir: 'frontend',
  plugins: [react()],
  server: {
    proxy: {
      '/api': process.env.VITE_API_PROXY_URL || 'http://127.0.0.1:4000',
    },
  },
});
