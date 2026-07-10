import { defineConfig } from 'vite';

// GitHub Pages serve o projeto num subpath (https://<user>.github.io/<repo>/).
// BASE_PATH é injetado pelo workflow de deploy; localmente cai em '/'.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
  },
});
