import { defineConfig } from 'vite';
import { layoutPolish } from './vite-layout-polish';
import { dragPolish } from './vite-drag-polish';
import { statusArrowFix } from './vite-status-arrow-fix';
import { mapBackground } from './vite-map-background';

export default defineConfig({
  base: '/Tactics/',
  plugins: [dragPolish, statusArrowFix, mapBackground, layoutPolish],
  build: { outDir: 'build', emptyOutDir: true }
});
