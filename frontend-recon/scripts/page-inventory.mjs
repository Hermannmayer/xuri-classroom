// 页面盘点：chunk ↔ 路由 ↔ 体积 ↔ 调用接口 ↔ i18n 词条数
import fs from 'node:fs';
import path from 'node:path';

const prettyDir = 'pretty';
const files = fs.readdirSync(prettyDir).filter((f) => /^p__.*\.js$/.test(f) || /^layouts__.*\.js$/.test(f));

const i18nIds = fs.readFileSync('extract/i18n.tsv', 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t')[0]);

// chunk 名 → 路由前缀候选
function guessRoute(name) {
  if (name === 'p__404') return '/404';
  if (name === 'p__Home') return '/home';
  const parts = name.replace(/^p__/, '').split('__');
  if (parts[0] === 'user' && parts[1] === 'mobile') return '/user/mobile';
  if (parts[0] === 'Exercise' && parts[1] === 'mobile') return '/exercise/:repoId/questions (mobile)';
  if (parts[0] === 'Answer') return parts[1] ? `/s/:id/${parts[1]}` : '/s/:id';
  if (parts[0] === 'survey') return parts[1] ? `/survey/:id/${parts[1].toLowerCase()}` : '/survey/:id';
  if (parts[0] === 'repo') return parts[1] ? `/repo/${parts[1].toLowerCase()}` : '/repo';
  if (parts[0] === 'system') return parts[1] ? `/system/${parts[1].toLowerCase()}` : '/system';
  if (parts[0] === 'account') return '/account/settings';
  return '/' + parts.join('/').toLowerCase();
}

// i18n 前缀映射
function i18nPrefix(name) {
  const n = name.replace(/^p__/, '');
  const map = {
    Home: 'pages.home',
    Project: 'pages.project',
    Template: 'pages.template',
    Answer: 'pages.answer',
    Exercise: 'pages.exercise',
    Setup: 'pages.setup',
    'account__settings': 'pages.account',
    'user__Login': 'pages.login',
    'user__Register': 'pages.register',
    'user__mobile': 'pages.login',
  };
  if (map[n]) return map[n];
  if (n.startsWith('survey')) return 'pages.survey';
  if (n.startsWith('system')) return 'pages.system';
  if (n.startsWith('repo')) return 'pages.repo';
  if (n.startsWith('Answer')) return 'pages.answer';
  return null;
}

const rows = [];
for (const f of files) {
  const name = f.replace(/\.[0-9a-f]+\.async\.js$/, '').replace(/\.js$/, '');
  const src = fs.readFileSync(path.join(prettyDir, f), 'utf8');
  const apis = [...new Set([...src.matchAll(/["'`](\/api\/[A-Za-z0-9_\-/{}.:$]{0,120})["'`]/g)].map((m) => m[1]))];
  const prefix = i18nPrefix(name);
  const i18nCount = prefix ? i18nIds.filter((id) => id.startsWith(prefix + '.')).length : 0;
  rows.push({
    chunk: name,
    route: guessRoute(name),
    kb: +(fs.statSync(path.join(prettyDir, f)).size / 1024).toFixed(1),
    lines: src.split('\n').length,
    apiCount: apis.length,
    apis: apis.sort(),
    i18nCount,
  });
}

rows.sort((a, b) => b.kb - a.kb);
fs.writeFileSync('extract/pages-inventory.json', JSON.stringify(rows, null, 2));

const md = [
  '| 页面 chunk | 推测路由 | 体积(KB) | 行数 | 直接调用接口数 | 相关 i18n 词条 |',
  '|---|---|---:|---:|---:|---:|',
  ...rows.map((r) => `| \`${r.chunk}\` | ${r.route} | ${r.kb} | ${r.lines} | ${r.apiCount} | ${r.i18nCount} |`),
].join('\n');
fs.writeFileSync('extract/pages-inventory.md', md);
console.log(md);
