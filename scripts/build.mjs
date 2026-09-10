import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const staticFiles = [
  'index.html',
  'app.js',
  'calc.js',
  'styles.css',
  'favicon.svg',
  'robots.txt',
  'sitemap.xml',
  'manifest.webmanifest',
];

for (const file of staticFiles) await cp(join(root, file), join(dist, file));

const html = await readFile(join(dist, 'index.html'), 'utf8');
if (!html.includes('https://thisbejim.github.io/wallpaper-roll-planner/')) {
  throw new Error('Production URL is missing from the generated page.');
}
if (!html.includes('id="planner"')) throw new Error('Calculator mount point is missing.');
await writeFile(join(dist, '.nojekyll'), '', 'utf8');
console.log(`Built ${staticFiles.length} static files to ${dist}`);
