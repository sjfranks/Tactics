import { defineConfig } from 'vite';
import { layoutPolish } from './vite-layout-polish';
import { combatPolish } from './vite-combat-polish';
import { dragPolish } from './vite-drag-polish';

export default defineConfig({
  base: '/Tactics/',
  plugins: [combatPolish, dragPolish, layoutPolish],
  build: { outDir: 'build', emptyOutDir: true }
});
