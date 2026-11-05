// 抓取 SurveyKing 实例的前端产物（umi.js 运行时里含完整 chunk 名→hash 映射）
// 用法: node fetch-assets.mjs <baseUrl> <outDir>
import fs from 'node:fs/promises';
import path from 'node:path';

const base = process.argv[2] || 'http://192.168.0.2:201';
const outDir = path.resolve(process.argv[3] || './web');

const get = async (p, asText = true) => {
  const res = await fetch(base + p);
  if (!res.ok) return null;
  return asText ? res.text() : Buffer.from(await res.arrayBuffer());
};

// 从 "name" + "." + {id:"hash"} + ".async.js" 运行时里解出两套映射
function parseMaps(js) {
  // 1) chunkId -> 路由名  {2571:"p__404",...}[e]||e
  const nameM = js.match(/\{((?:\d+:"[A-Za-z0-9_~]+",?)+)\}\[e\]\|\|e/);
  const nameMap = {};
  if (nameM) {
    for (const m of nameM[1].matchAll(/(\d+):"([A-Za-z0-9_~]+)"/g)) nameMap[m[1]] = m[2];
  }
  // 2) 后续的 {id:"hash"} 映射块，配合 ".async.js" / ".chunk.css" 后缀
  const tail = js.slice(js.indexOf('+"."+{'));
  const maps = [];
  for (const m of tail.matchAll(/\{((?:\d+:"[0-9a-f]+",?){5,})\}/g)) {
    const obj = {};
    for (const kv of m[1].matchAll(/(\d+):"([0-9a-f]+)"/g)) obj[kv[1]] = kv[2];
    maps.push({ obj, at: m.index });
  }
  return { nameMap, maps, tail };
}

const indexHtml = await get('/index.html');
if (!indexHtml) throw new Error('index.html 拉取失败');
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, 'index.html'), indexHtml);

const jsRef = indexHtml.match(/src="\/(umi\.[0-9a-f]+\.js)"/)?.[1];
const cssRef = indexHtml.match(/href="\/(umi\.[0-9a-f]+\.css)"/)?.[1];
if (!jsRef) throw new Error('未找到 umi.js 引用');

const umiJs = await get('/' + jsRef);
await fs.writeFile(path.join(outDir, jsRef), umiJs);

const { nameMap, maps, tail } = parseMaps(umiJs);
// 每套映射后面紧跟的后缀，决定文件类型
const files = [];
for (const { obj, at } of maps) {
  const after = tail.slice(at, at + 40000);
  const ext = after.includes('.async.js') && after.indexOf('.async.js') < 2000 ? '.async.js'
            : after.includes('.chunk.css') && after.indexOf('.chunk.css') < 2000 ? '.chunk.css'
            : longerSuffix(names(obj), after);
  for (const [id, hash] of Object.entries(obj)) {
    files.push((nameMap[id] || id) + '.' + hash + ext);
  }
}
function names() { return 0; }
function longerSuffix(_n, after) {
  const a = after.indexOf('.async.js'), c = after.indexOf('.chunk.css');
  if (a >= 0 && (c < 0 || a < c)) return '.async.js';
  return '.chunk.css';
}

if (cssRef) files.push(cssRef);
files.push(jsRef, 'favicon.ico');
const uniq = [...new Set(files)];

let ok = 0, fail = 0;
const manifest = [];
const CONC = 8;
for (let i = 0; i < uniq.length; i += CONC) {
  await Promise.all(uniq.slice(i, i + CONC).map(async (f) => {
    const buf = await get('/' + f, false);
    if (!buf) { fail++; manifest.push({ file: f, ok: false }); return; }
    await fs.writeFile(path.join(outDir, f), buf);
    ok++; manifest.push({ file: f, ok: true, size: buf.length });
  }));
}

await fs.writeFile(path.join(outDir, '_manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ base, jsRef, cssRef, nameMapEntries: Object.keys(nameMap).length, mapBlocks: maps.length, total: uniq.length, ok, fail }, null, 2));
