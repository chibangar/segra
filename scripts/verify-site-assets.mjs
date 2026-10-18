import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const docs = new URL('../docs/', import.meta.url);
const html = readFileSync(new URL('index.html', docs), 'utf8');
for (const name of ['style.css', 'script.js']) {
 const source = readFileSync(new URL(name, docs), 'utf8').replace(/\r\n/g, '\n');
 const hash = createHash('sha256').update(source).digest('hex').slice(0, 12);
 assert(html.includes(`${name}?v=${hash}`), `${name} must use its content hash so cached files cannot break a new page`);
}
console.log('PASS: CSS and JavaScript URLs match their content hashes.');
