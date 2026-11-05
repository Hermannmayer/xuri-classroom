// 拆包：把 webpack chunk 拆成独立模块文件
// 产物结构：webpackChunk.push([[chunkId], { moduleId: function(module, exports, require){...}, ... }, runtimeFn])
import fs from 'node:fs';
import path from 'node:path';

const webDir = process.argv[2] || 'web';
const outDir = process.argv[3] || 'modules';
fs.mkdirSync(outDir, { recursive: true });

// 括号配对：从 openIdx 处的 '{' 开始，返回配对 '}' 的下标（跳过字符串/模板/注释/正则）
function matchBrace(src, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === q) break;
        i++;
      }
      continue;
    }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i++; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

const files = fs.readdirSync(webDir).filter((f) => f.endsWith('.js')).sort();
const index = [];
let totalModules = 0;

for (const f of files) {
  const src = fs.readFileSync(path.join(webDir, f), 'utf8');
  const chunkDir = path.join(outDir, f.replace(/\.js$/, ''));
  let count = 0;

  // 模块定义候选：id: function(a,b,c){...} 或 id: (a,b)=>{...} 或 id:(a)=>{...}
  const re =
    /(?:^|[,{])\s*(\d{1,6})\s*:\s*(?:function\s*)?\(\s*([^()]{0,120}?)\s*\)\s*(?:=>\s*)?\{/g;
  const seen = new Set();
  let m;
  while ((m = re.exec(src))) {
    const id = m[1];
    const bodyStart = src.indexOf('{', m.index + m[0].length - 1);
    const end = matchBrace(src, bodyStart);
    if (end < 0) continue;
    const body = src.slice(bodyStart + 1, end);
    // 过滤极小的桩模块
    if (body.length < 40) continue;
    fs.mkdirSync(chunkDir, { recursive: true });
    fs.writeFileSync(path.join(chunkDir, `${id}.js`), body);
    count++;
    index.push({ chunk: f, id, size: body.length, file: path.join(path.basename(chunkDir), `${id}.js`) });
  }
  totalModules += count;
  if (count) console.log(`${f}: ${count} modules`);
}

fs.writeFileSync(path.join(outDir, '_index.json'), JSON.stringify(index, null, 2));
console.log(`\n合计 ${totalModules} 个模块 → ${outDir}`);
