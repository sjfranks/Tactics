import { defineConfig } from 'vite';
import { layoutPolish } from './vite-layout-polish';
import { dragPolish } from './vite-drag-polish';

export default defineConfig({
  base: '/Tactics/',
  plugins: [dragPolish, layoutPolish],
  build: { outDir: 'build', emptyOutDir: true }
});
