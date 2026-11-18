import { readFile, writeFile } from 'node:fs/promises';

const output = process.argv[2];
if (!output) throw new Error('Supply the path for the offline HTML file.');
const root = new URL('../../', import.meta.url);
const page = await readFile(new URL('index.html', root), 'utf8');
const tag = /<script type="module" crossorigin src="([^"]+)"><\/script>/;
const match = page.match(tag);
if (!match) throw new Error('Build the game before packing it.');
const bundleUrl = new URL(match[1],root);
let bundle = await readFile(bundleUrl, 'utf8');
const assets = /new URL\("([a-zA-Z0-9_-]+\.webp)",import\.meta\.url\)\.href/g;
for (const [expression,filename] of [...bundle.matchAll(assets)]) {
  const data = await readFile(new URL(filename,bundleUrl));
  bundle = bundle.replaceAll(expression,JSON.stringify('data:image/webp;base64,'+data.toString('base64')));
}
const script = bundle.replace(/<\/script/gi, '<\\/script');
await writeFile(output, page.replace(tag, () => '<script type="module">' + script + '</script>'));
