import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    /* Compatible vieux iPhone : iOS 11+ (Safari 11). Sans ça, les iPhone
       sous iOS < 14 affichent une page blanche (syntaxe récente non reconnue). */
    target: ['es2017', 'safari11'],
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/media': 'http://localhost:3000',
    },
  },
});
