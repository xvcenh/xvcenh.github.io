import { defineConfig } from 'vite';

/* devour-tide 构建：source/ 是工程根，产物直接输出到上级目录（devour-tide/），
   GitHub Pages / Jekyll 直接托管构建后的 index.html 与 assets/。 */
export default defineConfig({
  base: './',
  build: {
    outDir: '../',
    emptyOutDir: false,
    target: 'es2019'
  }
});
