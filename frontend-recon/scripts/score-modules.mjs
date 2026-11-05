// 给拆出来的模块打分，区分「SurveyKing 自己的代码」和「第三方库」
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] || 'modules';
const index = JSON.parse(fs.readFileSync(path.join(dir, '_index.json'), 'utf8'));

const SIGNALS = [
  { name: 'api', re: /["'`]\/api\//g, w: 5 },
  { name: 'i18n-id', re: /pages\.(survey|system|project|repo|answer|login|account|exercise|template)\./g, w: 4 },
  { name: 'questionType', re: /questionType/g, w: 3 },
  { name: 'surveySchema', re: /SurveySchema|dataSource|visibleRule|jumpRule/g, w: 3 },
  { name: 'formily', re: /createSchemaField|SchemaField|FormItem|reactions/g, w: 1 },
  { name: 'antd', re: /ant-[a-z]+|rc-[a-z]+/g, w: -1 },
  { name: 'regenerator', re: /regeneratorRuntime|_asyncToGenerator/g, w: 0 },
  { name: 'vendored', re: /lodash|core-js|moment|dayjs/g, w: -2 },
];

const results = [];
for (const m of index) {
  const file = path.join(dir, m.file);
  const src = fs.readFileSync(file, 'utf8');
  let score = 0;
  const hits = {};
  for (const s of SIGNALS) {
    const n = (src.match(s.re) || []).length;
    if (n) { hits[s.name] = n; score += n * s.w; }
  }
  results.push({ ...m, score, hits });
}

results.sort((a, b) => b.score - a.score);
const app = results.filter((r) => r.score >= 6);
fs.writeFileSync(path.join(dir, '_scored.json'), JSON.stringify(results, null, 2));

console.log(`总模块 ${results.length}，判定为自有代码 ${app.length} 个`);
console.log('\n=== Top 30 ===');
for (const r of app.slice(0, 30)) {
  console.log(
    String(r.score).padStart(4),
    r.chunk.slice(0, 28).padEnd(30),
    String(r.id).padEnd(7),
    (r.size / 1024).toFixed(1).padStart(6) + 'KB',
    JSON.stringify(r.hits)
  );
}
