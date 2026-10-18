import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const docs = new URL('../docs/', import.meta.url);
const index = new URL('index.html', docs);
let html = readFileSync(index, 'utf8');
for (const name of ['style.css', 'script.js']) {
 const source = readFileSync(new URL(name, docs), 'utf8').replace(/\r\n/g, '\n');
 const hash = createHash('sha256').update(source).digest('hex').slice(0, 12);
 const pattern = new RegExp(`(["'])${name.replace('.', '\\.')}\\??(?:v=[a-f0-9]+)?\\1`, 'g');
 html = html.replace(pattern, `"${name}?v=${hash}"`);
}
writeFileSync(index, html);
console.log('Updated landing-page asset versions.');
