import { defineConfig } from 'vite';

export default defineConfig({
  resolve: { dedupe: ['react', 'react-dom', 'three', 'postprocessing', '@react-three/fiber', '@react-three/postprocessing'] },
  server: { host: '127.0.0.1', port: 5193, strictPort: true },
});
