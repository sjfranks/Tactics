import { defineConfig } from 'vite';
import { layoutPolish } from './vite-layout-polish';
import { dragPolish } from './vite-drag-polish';
import { statusArrowFix } from './vite-status-arrow-fix';

export default defineConfig({
  base: '/Tactics/',
  plugins: [dragPolish, statusArrowFix, layoutPolish],
  build: { outDir: 'build', emptyOutDir: true }
});
