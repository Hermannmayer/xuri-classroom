import fs from 'node:fs';
const m = JSON.parse(fs.readFileSync('extract/chunk-id-map.json', 'utf8'));
const t = fs.readFileSync('pretty/umi.ded23be0.js', 'utf8');
const want = ['/survey', '/survey/:id', '/project', '/repo/template', '/template', '/system/user', '/home', '/survey/:id/setting'];
for (const w of want) {
  const needle = `path: "${w}",`;
  const i = t.indexOf(needle);
  if (i < 0) { console.log(w, '-> 未找到'); continue; }
  const win = t.slice(i, i + 3000);
  const ids = [...new Set([...win.matchAll(/r\.e\((\d+)\)/g)].map((x) => x[1]))];
  const named = ids.map((id) => m.idToFile[id] || id).filter((f) => f.startsWith('p__') || f.startsWith('layouts__'));
  console.log(w, '->', named.join(', ') || '(纯数字 chunk: ' + ids.slice(0, 8).join(',') + ')');
}
