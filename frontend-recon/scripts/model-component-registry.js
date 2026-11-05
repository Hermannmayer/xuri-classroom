// 一次性取证：抽取前端 renderer 注册表 RM/uF 里出现的题型名
// 用法: node model-component-registry.js
const fs = require('fs');
const path = require('path');

const prettyDir = path.join(__dirname, '..', 'pretty');
const re = /\((?:0\s*,\s*)?[A-Za-z_$][\w$]*\.(RM|uF)\)\(\s*"([A-Za-z]+)"\s*,\s*[^)]{0,40}?\)?,?\s*(?:"([\w]+)")?/g;

const byType = new Map();
for (const name of fs.readdirSync(prettyDir).sort()) {
  if (!name.endsWith('.js')) continue;
  const text = fs.readFileSync(path.join(prettyDir, name), 'utf8');
  for (const m of text.matchAll(re)) {
    const [, kind, type, , platform] = m;
    const key = type;
    if (!byType.has(key)) byType.set(key, { RM: new Set(), uF: new Set(), platforms: new Set() });
    byType.get(key)[kind].add(platform);
    byType.get(key).platforms.add(platform);
  }
}

const rows = [...byType.entries()].sort((a, b) => a[0].localeCompare(b[0]));
for (const [type, v] of rows) {
  console.log(
    [
      type.padEnd(16),
      'render=' + (v.RM.size ? [...v.RM].join('/') : '-'),
      'setting=' + (v.uF.size ? [...v.uF].join('/') : '-'),
    ].join('  '),
  );
}
console.log('\ntotal registered types:', rows.length);

// Java 枚举全集，用来对比前端缺了谁
const JAVA = 'FillBlank Textarea MultipleBlank Signature Score Radio Checkbox Select Cascader Upload MatrixAuto MatrixRadio MatrixCheckbox MatrixFillBlank MatrixScore MatrixNps Survey QuestionSet RichText Pagination Remark SplitLine Option User Dept Nps HorzBlank Address Barcode Judge RandomSurvey'.split(' ');
const missing = JAVA.filter((t) => !byType.has(t));
console.log('in Java enum but not registered in frontend:', missing.join(', ') || '(none)');
