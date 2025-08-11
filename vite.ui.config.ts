import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { copyFileSync, existsSync, rmSync, mkdirSync, renameSync } from 'node:fs';

function moveUiHtmlToRoot() {
  return {
    name: 'move-ui-html-to-root',
    closeBundle() {
      const dist = resolve(__dirname, 'dist');
      const srcHtml = resolve(dist, 'src/ui/index.html'); // фактический путь, который у тебя получился
      const dstHtml = resolve(dist, 'ui.html');

      // Переносим ui.html
      if (existsSync(srcHtml)) {
        // убедимся, что папка dist существует
        mkdirSync(dist, { recursive: true });
        copyFileSync(srcHtml, dstHtml);
        // подчистим вложенные каталоги, чтобы не плодить мусор
        try { rmSync(resolve(dist, 'src'), { recursive: true, force: true }); } catch (_e) {}
      }

      // manifest.json копируем на всякий случай, если не скопировался на шаге main
      const manSrc = resolve(__dirname, 'manifest.json');
      const manDst = resolve(dist, 'manifest.json');
      if (existsSync(manSrc) && !existsSync(manDst)) {
        copyFileSync(manSrc, manDst);
      }
    }
  };
}

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/ui/index.html')
    },
    target: 'es2018',
    assetsInlineLimit: 0,
    minify: true
  },
  plugins: [moveUiHtmlToRoot()]
});
