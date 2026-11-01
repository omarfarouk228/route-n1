import { defineConfig } from 'vite';

// base relative : le jeu fonctionne à la racine d'un domaine comme sous /route-n1/ (GitHub Pages)
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 800,
  },
});
