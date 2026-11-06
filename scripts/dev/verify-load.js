#!/usr/bin/env node
/**
 * 只读接口压测基线
 *
 * 目标：给「单机、本机回环」下的 QPS / P50 / P95 / P99 一个可复跑的基线，不是找崩溃点。
 * 接口：`/api/system`（公共）、`/api/public/projectOutline`、`/api/public/question`（答题页取题）
 * 约束：每个接口 30 秒、并发 10 与 50；错误率 > 20% 时自动降并发并记录。
 *
 * 用法：node scripts/dev/verify-load.js
 *       SK_BASE=http://127.0.0.1:7007 DURATION=30 node scripts/dev/verify-load.js
 */

const crypto = require('crypto');

const BASE = process.env.SK_BASE || 'http://127.0.0.1:7007';
const DURATION = Number(process.env.DURATION || 30) * 1000;
const LEVELS = (process.env.LEVELS || '10,50').split(',').map(Number);
const TAG = 'zz-load-' + Date.now().toString(36);

async function call(path, { method = 'GET', body, cookie } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (cookie) headers.cookie = cookie;
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 100) };
  }
  return { status: res.status, json, setCookie: res.headers.getSetCookie ? res.headers.getSetCookie() : [] };
}

async function login(user, pass) {
  const sys = await call('/api/system');
  const pk = sys.json?.data?.publicKey;
  if (!pk) throw new Error('后端不可用');
  const pem = pk.includes('-----')
    ? pk
    : '-----BEGIN PUBLIC KEY-----\n' + pk.replace(/(.{64})/g, '$1\n').trim() + '\n-----END PUBLIC KEY-----';
  const enc = crypto
    .publicEncrypt({ key: pem, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from(pass))
    .toString('base64');
  const res = await call('/api/public/login', { method: 'POST', body: { username: user, password: enc } });
  if (res.json?.code !== 200) throw new Error('登录失败');
  return (res.setCookie || []).map((c) => c.split(';')[0]).join('; ');
}

function pct(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

async function runOnce(task) {
  const started = process.hrtime.bigint();
  let ok = false;
  try {
    const r = await task();
    ok = r?.json?.code === 200;
  } catch {
    ok = false;
  }
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  return { ok, ms };
}

/** 固定并发跑 duration 毫秒，统计 QPS 与分位延迟 */
async function load(label, concurrency, task, duration) {
  const latencies = [];
  const codes = {};
  let ok = 0;
  let fail = 0;
  const deadline = Date.now() + duration;

  async function worker() {
    while (Date.now() < deadline) {
      const r = await runOnce(task);
      latencies.push(r.ms);
      codes[r.code] = (codes[r.code] || 0) + 1;
      if (r.ok) ok++;
      else fail++;
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  latencies.sort((a, b) => a - b);
  const total = ok + fail;
  return {
    label,
    concurrency,
    durationMs: duration,
    requests: total,
    ok,
    fail,
    errorRate: total ? +(fail / total).toFixed(4) : 1,
    topCodes: Object.entries(codes).sort((a, b) => b[1] - a[1]).slice(0, 3),
    qps: +((total / duration) * 1000).toFixed(1),
    p50: +pct(latencies, 50).toFixed(1),
    p95: +pct(latencies, 95).toFixed(1),
    p99: +pct(latencies, 99).toFixed(1),
    max: +(latencies[latencies.length - 1] || 0).toFixed(1),
  };
}

(async () => {
  const adminCookie = await login(process.env.SK_USER || 'admin', process.env.SK_PASS || '123456');

  // 造一个临时项目 + 一次提交，拿到 projectOutline / question 需要的参数
  const survey = {
    id: '',
    title: TAG,
    type: 'Survey',
    attribute: {},
    children: [
      {
        id: 'q1',
        title: '压测题',
        type: 'Radio',
        attribute: { examScore: 10 },
        dataSource: [{ label: 'A', value: 'o1' }],
        children: [{ id: 'o1', title: 'A', type: 'Option', attribute: { examCorrectAnswer: 'o1' } }],
      },
    ],
  };
  const mk = await call('/api/project/create', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      name: TAG,
      mode: 'exam',
      survey,
      setting: { status: 1, mode: 'exam', answerSetting: { questionNumber: true }, examSetting: {}, submittedSetting: {} },
    },
  });
  const projectId = mk.json?.data?.id;
  const sv = mk.json?.data?.survey ?? survey;
  const sub = await call('/api/public/saveAnswer', {
    method: 'POST',
    cookie: adminCookie,
    body: { projectId, survey: sv, answer: { q1: { o1: true } } },
  });
  const answerId = sub.json?.data?.answerId;
  console.log(`[压测] 临时项目 ${projectId}，answerId ${answerId}`);

  const tasks = [
    ['/api/system', () => call('/api/system')],
    [
      '/api/public/projectOutline',
      () => call('/api/public/projectOutline', { method: 'POST', cookie: adminCookie, body: { id: projectId, answerId } }),
    ],
    [
      '/api/public/question',
      () => call('/api/public/question', { method: 'POST', cookie: adminCookie, body: { id: projectId, answerId, questionId: 'q1' } }),
    ],
  ];

  const results = [];
  for (const [name, task] of tasks) {
    for (const level of LEVELS) {
      let r = await load(name, level, task, DURATION);
      // 错误率超 20% 自动降并发重跑一次，避免把抖动当结论
      if (r.errorRate > 0.2 && level > 10) {
        console.log(`  ${name} @${level} 错误率 ${(r.errorRate * 100).toFixed(1)}%，降并发重测`);
        r = await load(name, 10, task, DURATION);
      }
      results.push(r);
      console.log(
        `  ${name.padEnd(30)} 并发 ${String(r.concurrency).padStart(2)}  QPS ${String(r.qps).padStart(7)}  P50 ${String(r.p50).padStart(6)}ms  P95 ${String(r.p95).padStart(6)}ms  P99 ${String(r.p99).padStart(6)}ms  错误率 ${(r.errorRate * 100).toFixed(2)}%  主要返回码 ${JSON.stringify(r.topCodes)}`,
      );
    }
  }

  // 清理
  try {
    await call('/api/answer/destroy', { method: 'POST', cookie: adminCookie, body: { projectId, ids: [answerId] } });
  } catch { /* ignore */ }
  await call('/api/project/delete', { method: 'POST', cookie: adminCookie, body: { id: projectId } });
  await call('/api/project/destroy', { method: 'POST', cookie: adminCookie, body: { ids: [projectId] } });

  console.log('\n===JSON===');
  console.log(JSON.stringify({ base: BASE, durationSec: DURATION / 1000, results }, null, 2));
})();
