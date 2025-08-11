import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { copyFileSync, existsSync } from 'node:fs';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/main/index.ts'),
      name: 'PluginMain',
      formats: ['iife'],
      fileName: () => 'code.js'
    },
    rollupOptions: { output: { extend: false } },
    target: 'es2018',
    minify: true
  },
  plugins: [
    {
      name: 'copy-manifest',
      closeBundle() {
        const src = resolve(__dirname, 'manifest.json');
        const dst = resolve(__dirname, 'dist/manifest.json');
        if (existsSync(src)) copyFileSync(src, dst);
      }
    }
  ]
});
