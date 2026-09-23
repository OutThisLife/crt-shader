import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://crt-shader.vercel.app',
  publicDir: '../examples/public',
  devToolbar: { enabled: false },
  server: { port: 3000 },
  vite: {
    server: { strictPort: true },
    // These client-only adapters are imported from the sibling examples workspace.
    // Prebundle their CommonJS dependencies before serving the React islands.
    optimizeDeps: { include: ['@react-three/fiber', '@react-three/postprocessing'] },
    resolve: {
      dedupe: ['react', 'react-dom', 'three', 'postprocessing', '@react-three/fiber', '@react-three/postprocessing'],
    },
  },
  integrations: [
    react(),
    starlight({
      title: 'crt-shader',
      customCss: ['./src/styles/theme.css'],
      description: 'Compare native pixels, photographed CRT references, and live reconstruction. Integrate the same pipeline in your application.',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/OutThisLife/crt-shader' },
      ],
      // Canonical Markdown lives at docs/*.md for existing GitHub/npm links.
      markdown: { processedDirs: ['.'] },
      sidebar: [
        { label: 'Article comparison', link: '/' },
        { slug: 'examples/gallery', label: 'Complete gallery' },
        'installation',
        {
          label: 'Integrations',
          items: ['guides/vanilla', 'guides/react', 'guides/three', 'guides/postprocessing', 'guides/r3f', 'examples/adapters'],
        },
        {
          label: 'Reference',
          items: ['images', 'scenes', 'options', 'agents/PORTING'],
        },
        {
          label: 'Project',
          items: ['CREDITS', 'changelog', 'CONTRIBUTING'],
        },
      ],
    }),
  ],
});
