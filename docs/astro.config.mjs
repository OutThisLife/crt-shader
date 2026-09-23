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
      expressiveCode: {
        useStarlightUiThemeColors: true,
        themes: [
          { name: 'monochrome-dark', type: 'dark', fg: '#fff', bg: '#1a1a1a', settings: [] },
          { name: 'monochrome-light', type: 'light', fg: '#1a1a1a', bg: '#fff', settings: [] },
        ],
      },
      description: 'A WebGL 2 CRT effect for images and 3D scenes, with React and Three.js integrations.',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/OutThisLife/crt-shader' },
      ],
      // Canonical Markdown lives at docs/*.md for existing GitHub/npm links.
      markdown: { processedDirs: ['.'] },
      sidebar: [
        { label: 'Get started', link: '/' },
        { slug: 'examples/gallery', label: 'Gallery' },
        {
          label: 'API reference',
          items: [
            { slug: 'images', label: 'Images' },
            { slug: 'scenes', label: 'Scenes' },
            { slug: 'options', label: 'Options' },
          ],
        },
        {
          label: 'Project',
          collapsed: true,
          items: ['CREDITS', 'changelog', 'CONTRIBUTING'],
        },
      ],
    }),
  ],
});
