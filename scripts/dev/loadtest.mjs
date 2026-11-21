// 生产压测：按真实场景分档，全程监控、异常自动中止。
//   --scenario login  登录链路（RSA 解密 + 密码哈希 + 发 token）
//   --scenario exam   开考瞬间（POST /api/public/projectOutline 拉整棵题树 + 静态资源）

// 用法：node scripts/dev/loadtest.mjs --conns 120 --seconds 30 --scenario exam
import crypto from 'node:crypto';

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i += 1) if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[i + 1];

const BASE = args.base ?? 'http://192.168.0.2:201';
const CONNS = Number(args.conns ?? 60);
const SECONDS = Number(args.seconds ?? 30);
const SCENARIO = args.scenario ?? 'exam';
const USER = args.user ?? 'admin';
const PASS = args.password ?? '123456';
const PROJECT = args.project ?? 'DzagEu';
const CLASS_TOKEN = args.token ?? '16fdhLP2X2NXJF6UZokWQEMj';

function pct(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function timed(url, init = {}) {
  const t0 = performance.now();
  let status = 0;
  try {
    const r = await fetch(url, init);
    status = r.status;
    await r.arrayBuffer();
  } catch {
    status = -1;
  }
  return { ms: performance.now() - t0, status };
}

async function login() {
  const sys = await (await fetch(BASE + '/api/system')).json();
  const pem = '-----BEGIN PUBLIC KEY-----\n' + sys.data.publicKey.replace(/(.{64})/g, '$1\n').trim() + '\n-----END PUBLIC KEY-----';
  const enc = crypto.publicEncrypt({ key: pem, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from(PASS)).toString('base64');
  const t0 = performance.now();
  const res = await fetch(BASE + '/api/public/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: USER, password: enc }),
  });
  await res.arrayBuffer();
  const cookie = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  return { ms: performance.now() - t0, status: res.status, cookie };
}

const html = await (await fetch(BASE + '/')).text();
const asset = (html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/) ?? [])[0] ?? '/assets/index.js';

let headers = {};
if (SCENARIO === 'list') {
  const boot = await login();
  if (boot.status !== 200) {
    console.error('登录失败（' + boot.status + '），压测中止');
    process.exit(2);
  }
  headers = { cookie: boot.cookie };
}

const started = Date.now();
const buckets = {};
const errors = { total: 0, byStatus: {} };
let aborted = null;
const rec = (k, r) => {
  (buckets[k] ??= []).push(r.ms);
  if (r.status < 200 || r.status >= 400) {
    errors.total += 1;
    errors.byStatus[r.status] = (errors.byStatus[r.status] ?? 0) + 1;
  }
};

async function step() {
  if (SCENARIO === 'login') {
    rec('login', await login());
  } else if (SCENARIO === 'exam') {
    rec('projectOutline', await timed(BASE + '/api/public/projectOutline', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: PROJECT, classToken: CLASS_TOKEN }),
    }));
    rec('static', await timed(BASE + asset));
  } else {
    rec('list', await timed(BASE + '/api/project/list?current=1&pageSize=20', { headers }));
    rec('static', await timed(BASE + asset));
  }
}

async function worker() {
  while (Date.now() - started < SECONDS * 1000) {
    if (aborted) return;
    await step();
    const all = Object.values(buckets).flat().sort((a, b) => a - b);
    if (errors.total / Math.max(1, all.length) > 0.05) aborted = '错误率 > 5%';
    if (pct(all, 95) > 5000) aborted = 'p95 > 5s';
  }
}

console.log('压测 ' + BASE + ' 场景=' + SCENARIO + ' 并发=' + CONNS + ' 时长=' + SECONDS + 's');
const mon = setInterval(() => {
  const all = Object.values(buckets).flat().sort((a, b) => a - b);
  process.stdout.write('  · ' + Math.round((Date.now() - started) / 1000) + 's 请求=' + all.length + ' 错误=' + errors.total + ' p95=' + pct(all, 95).toFixed(0) + 'ms' + (aborted ? ' 【中止:' + aborted + '】' : '') + '\n');
}, 10000);

await Promise.all(Array.from({ length: CONNS }, () => worker()));
clearInterval(mon);

const elapsed = (Date.now() - started) / 1000;
const out = {};
for (const [k, v] of Object.entries(buckets)) {
  const s = [...v].sort((a, b) => a - b);
  out[k] = { n: v.length, rps: +(v.length / elapsed).toFixed(1), p50: +pct(s, 50).toFixed(0), p95: +pct(s, 95).toFixed(0), p99: +pct(s, 99).toFixed(0), max: +(s[s.length - 1] ?? 0).toFixed(0) };
}
console.log('\n=== ' + SCENARIO + ' / 并发 ' + CONNS + ' / ' + elapsed.toFixed(1) + 's ===');
console.table(out);
console.log('错误 ' + errors.total + ' ' + JSON.stringify(errors.byStatus) + (aborted ? ' | 已中止：' + aborted : ''));
