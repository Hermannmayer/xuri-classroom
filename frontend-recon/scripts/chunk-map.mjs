// 解出 chunkId -> 文件名，并列出关键路由实际加载的 chunk
import fs from 'node:fs';

const js = fs.readFileSync('web/umi.ded23be0.js', 'utf8');

const nameM = js.match(/\{((?:\d+:"[A-Za-z0-9_~]+",?)+)\}\[e\]\|\|e/);
const nameMap = {};
if (nameM) for (const m of nameM[1].matchAll(/(\d+):"([A-Za-z0-9_~]+)"/g)) nameMap[m[1]] = m[2];

const tail = js.slice(js.indexOf('+"."+{'));
const maps = [];
for (const m of tail.matchAll(/\{((?:\d+:"[0-9a-f]+",?){5,})\}/g)) {
  const obj = {};
  for (const kv of m[1].matchAll(/(\d+):"([0-9a-f]+)"/g)) obj[kv[1]] = kv[2];
  maps.push(obj);
}
const hashMap = maps[0]; // .async.js
const idToFile = {};
for (const [id, hash] of Object.entries(hashMap)) idToFile[id] = `${nameMap[id] || id}.${hash}.async.js`;

fs.writeFileSync('extract/chunk-id-map.json', JSON.stringify({ nameMap, idToFile }, null, 2));

// 解析路由：path -> 加载的 chunk 列表
const lines = js.split('\n');
const prettyText = fs.readFileSync('pretty/umi.ded23be0.js', 'utf8');
const routes = {};
const paths = [...prettyText.matchAll(/^(\s*)path: "(\/[^"]*)",?$/gm)];
for (const p of paths) {
  const idx = p.index;
  const next = p.index + 4000;
  const window = prettyText.slice(idx, next);
  const ids = [...window.matchAll(/r\.e\((\d+)\)/g)].map((m) => m[1]);
  routes[p[2]] = [...new Set(ids)].slice(0, 40).map((id) => idToFile[id] || id);
}

const interesting = ['/survey/:id', '/survey/:id/edit', '/survey/:id/setting', '/survey/:id/data', '/survey/:id/report', '/survey/:id/flow', '/s/:id'];
const out = {};
for (const k of interesting) {
  out[k] = routes[k] ? routes[k].filter((f) => f.startsWith('p__') || f.startsWith('layouts__')) : null;
}
console.log(JSON.stringify(out, null, 2));
