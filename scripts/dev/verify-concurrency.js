#!/usr/bin/env node
/**
 * 并发类问题实测脚本（只读业务、不改源码）
 *
 * 覆盖 docs/audit/backend-data.md 里 P0-4 / P0-5 的 5 条静态推导：
 *   1. 重复提交：同一用户并发提交同一份答卷，看落库几条
 *   2. maxAnswers 上限穿透：上限设 1，并发提交 10 次
 *   3. cookieLimit 频率限制穿透：限制 1 次，并发提交 10 次
 *   4. 切屏计数并发：并发上报 10 次，看累计值是否丢失更新
 *   5. 同一 answerId 并发交卷：5 个并发覆盖，看分数/考试信息是否错乱
 *
 * 约定：
 * - 全程只操作**临时项目**（名字带 `zz-concurrency-` 前缀），跑完自动删除
 * - 不碰任何真实项目/答卷
 * - 只调用公开 API，不直连数据库；数据库核对由调用方用只读 SQL 完成
 *
 * 用法：
 *   node scripts/dev/verify-concurrency.js
 *   SK_BASE=http://127.0.0.1:7007 node scripts/dev/verify-concurrency.js
 */

const crypto = require('crypto');

const BASE = process.env.SK_BASE || 'http://127.0.0.1:7007';
const ADMIN = { username: process.env.SK_USER || 'admin', password: process.env.SK_PASS || '123456' };
const TAG = 'zz-concurrency-' + Date.now().toString(36);

/* ------------------------------------------------------------------ 基础工具 */

let adminCookie = '';

async function call(path, { method = 'GET', body, cookie, timeout = 20000 } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (cookie) headers.cookie = cookie;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text.slice(0, 200) };
    }
    const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    return { status: res.status, json, setCookie };
  } finally {
    clearTimeout(timer);
  }
}

/** 用 RSA 加密密码登录，拿到 sk-token cookie */
async function login() {
  const sys = await call('/api/system');
  const publicKey = sys.json?.data?.publicKey;
  if (!publicKey) throw new Error('拿不到 publicKey，后端可能没起来');
  const pem = publicKey.includes('-----')
    ? publicKey
    : '-----BEGIN PUBLIC KEY-----\n' + publicKey.replace(/(.{64})/g, '$1\n').trim() + '\n-----END PUBLIC KEY-----';
  const enc = crypto
    .publicEncrypt({ key: pem, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from(ADMIN.password))
    .toString('base64');
  const res = await call('/api/public/login', {
    method: 'POST',
    body: { username: ADMIN.username, password: enc },
  });
  if (res.json?.code !== 200) throw new Error('登录失败: ' + JSON.stringify(res.json).slice(0, 200));
  const token = (res.setCookie || []).map((c) => c.split(';')[0]).join('; ');
  if (!token) throw new Error('登录成功但没拿到 cookie');
  adminCookie = token;
  return token;
}

/** 等后端可用（队友随时可能重建服务） */
async function waitBackend(maxMinutes = 6) {
  const deadline = Date.now() + maxMinutes * 60_000;
  for (;;) {
    try {
      const res = await call('/api/system', { timeout: 5000 });
      if (res.status === 200 && res.json?.code === 200) return true;
    } catch {
      /* ignore */
    }
    if (Date.now() > deadline) return false;
    console.log('  后端暂不可用，30s 后重试…');
    await new Promise((r) => setTimeout(r, 30_000));
  }
}

/**
 * 每个测试前确认会话还有效。
 * 后端一旦被重建，JWT 密钥会变，旧 cookie 全部失效（日志里表现为
 * "Invalid JWT signature"），此时后续请求会退化成匿名 → 一堆 500/4004 假象。
 */
async function ensureSession() {
  const res = await call('/api/currentUser', { cookie: adminCookie });
  if (res.json?.code !== 200) {
    console.log('  会话失效（后端可能被重建），重新登录…');
    await login();
  }
}

/** 并发执行，返回每个请求的结果摘要 */
async function burst(n, fn) {
  return Promise.all(Array.from({ length: n }, (_, i) => fn(i)));
}

/* ------------------------------------------------------------------ 测试项目 */

function buildSurvey(title) {
  return {
    id: '',
    title,
    type: 'Survey',
    attribute: {},
    children: [
      {
        id: 'q1',
        title: '并发测试题：请选择 A',
        type: 'Radio',
        attribute: { examScore: 10, examAnswerMode: 'onlyOne' },
        dataSource: [
          { label: 'A', value: 'o1' },
          { label: 'B', value: 'o2' },
        ],
        children: [
          { id: 'o1', title: 'A', type: 'Option', attribute: { examCorrectAnswer: 'o1' } },
          { id: 'o2', title: 'B', type: 'Option', attribute: {} },
        ],
      },
    ],
  };
}

/**
 * 建临时项目。
 * 注意：必须一次性把 setting 带全（status / mode / answerSetting / examSetting），
 * 因为 addProject 不会补默认 ProjectSetting；setting 为 null 时后续 /project/update
 * 与 /public/loadProject 都会 NPE 500（这是一个独立的健壮性问题，另见报告）。
 */
async function createProject(suffix, settingPatch = {}) {
  const name = `${TAG}-${suffix}`;
  const survey = buildSurvey(name);
  const setting = {
    status: 1,
    mode: 'exam',
    answerSetting: { questionNumber: true, ...(settingPatch.answerSetting || {}) },
    examSetting: { ...(settingPatch.examSetting || {}) },
    submittedSetting: { ...(settingPatch.submittedSetting || {}) },
    ...(settingPatch.top || {}),
  };
  const res = await call('/api/project/create', {
    method: 'POST',
    cookie: adminCookie,
    body: { name, mode: 'exam', survey, setting },
  });
  if (res.json?.code !== 200) throw new Error('创建项目失败: ' + JSON.stringify(res.json).slice(0, 200));
  return { id: res.json.data.id, name, survey };
}

async function setSetting(projectId, key, value) {
  const res = await call('/api/project/update', {
    method: 'POST',
    cookie: adminCookie,
    body: { id: projectId, settingKey: key, settingValue: value },
  });
  if (res.json?.code !== 200) throw new Error(`设置 ${key} 失败: ${JSON.stringify(res.json).slice(0, 160)}`);
}

async function listAnswers(projectId) {
  const res = await call(`/api/answer/list?projectId=${projectId}&current=1&pageSize=-1`, {
    cookie: adminCookie,
  });
  const rows = res.json?.data?.list ?? [];
  return rows;
}

async function cleanupProject(project) {
  if (!project) return;
  if (process.env.KEEP === '1') { console.log('  [KEEP] 保留临时项目 ' + project.id + '（' + project.name + '）'); return; }
  try {
    const answers = await listAnswers(project.id);
    if (answers.length) {
      await call('/api/answer/destroy', {
        method: 'POST',
        cookie: adminCookie,
        body: { projectId: project.id, ids: answers.map((a) => a.id) },
      });
    }
  } catch (e) {
    console.log('  清理答卷失败（可忽略）:', e.message);
  }
  try {
    await call('/api/project/delete', { method: 'POST', cookie: adminCookie, body: { id: project.id } });
    await call('/api/project/destroy', { method: 'POST', cookie: adminCookie, body: { ids: [project.id] } });
  } catch (e) {
    console.log('  清理项目失败（可忽略）:', e.message);
  }
}

/* ------------------------------------------------------------------ 5 个测试 */

/** T1：同一用户（admin）并发提交 10 次，不带 answerId —— 看是否产生多份答卷 */
async function t1DuplicateSubmit() {
  const project = await createProject('t1');
  try {
    const results = await burst(10, () =>
      call('/api/public/saveAnswer', {
        method: 'POST',
        cookie: adminCookie,
        body: { projectId: project.id, survey: project.survey, answer: { q1: { o1: true } } },
      }),
    );
    const ok = results.filter((r) => r.json?.code === 200).length;
    const fail = results.filter((r) => r.json?.code !== 200);
    const rows = await listAnswers(project.id);
    return {
      name: 'T1 重复提交（同用户并发 10 次）',
      concurrency: 10,
      success: ok,
      failed: fail.length,
      failSamples: fail.slice(0, 2).map((r) => r.json?.code + ':' + r.json?.message),
      finalRows: rows.length,
      verdict: rows.length > 1 ? '存在（无幂等，产生多条答卷）' : '不存在（只落 1 条）',
    };
  } finally {
    await cleanupProject(project);
  }
}

/** T2：maxAnswers = 1，10 个不同匿名身份并发提交 —— 看是否穿透上限 */
async function t2MaxAnswersBypass() {
  // 对照：先确认「顺序提交第 2 次会被拒」，否则并发穿透的结论不成立
  const ctl = await createProject('t2ctl', { answerSetting: { maxAnswers: 1 } });
  let control;
  try {
    const a = await call('/api/public/saveAnswer', { method: 'POST', body: { projectId: ctl.id, survey: ctl.survey, answer: { q1: { o1: true } } } });
    const b = await call('/api/public/saveAnswer', { method: 'POST', body: { projectId: ctl.id, survey: ctl.survey, answer: { q1: { o1: true } } } });
    control = { first: a.json?.code, second: b.json?.code, secondMsg: b.json?.message };
  } finally {
    await cleanupProject(ctl);
  }

  const project = await createProject('t2', { answerSetting: { maxAnswers: 1 } });
  try {
    const results = await burst(10, () =>
      call('/api/public/saveAnswer', {
        method: 'POST',
        body: { projectId: project.id, survey: project.survey, answer: { q1: { o1: true } } },
      }),
    );
    const ok = results.filter((r) => r.json?.code === 200).length;
    const limited = results.filter((r) => r.json?.code === 4010).length;
    const rows = await listAnswers(project.id);
    return {
      name: 'T2 maxAnswers=1 并发 10 次（匿名）',
      control,
      concurrency: 10,
      success: ok,
      rejectedByLimit: limited,
      finalRows: rows.length,
      verdict: rows.length > 1 ? `存在（上限 1，实际落 ${rows.length} 条）` : '不存在（只落 1 条）',
    };
  } finally {
    await cleanupProject(project);
  }
}

/** T3：cookieLimit=1，同一 cookie 并发提交 10 次 —— 看频率限制是否穿透 */
async function t3CookieLimitBypass() {
  const ctl = await createProject('t3ctl', { answerSetting: { cookieLimit: { limitNum: 1, limitFreq: 'only' } } });
  let control;
  try {
    const a = await call('/api/public/saveAnswer', { method: 'POST', cookie: adminCookie, body: { projectId: ctl.id, survey: ctl.survey, answer: { q1: { o1: true } } } });
    const b = await call('/api/public/saveAnswer', { method: 'POST', cookie: adminCookie, body: { projectId: ctl.id, survey: ctl.survey, answer: { q1: { o1: true } } } });
    control = { first: a.json?.code, second: b.json?.code, secondMsg: b.json?.message };
  } finally {
    await cleanupProject(ctl);
  }

  const project = await createProject('t3', { answerSetting: { cookieLimit: { limitNum: 1, limitFreq: 'only' } } });
  try {
    const results = await burst(10, () =>
      call('/api/public/saveAnswer', {
        method: 'POST',
        cookie: adminCookie,
        body: { projectId: project.id, survey: project.survey, answer: { q1: { o1: true } } },
      }),
    );
    const ok = results.filter((r) => r.json?.code === 200).length;
    const rows = await listAnswers(project.id);
    return {
      name: 'T3 cookieLimit=1 并发 10 次（同一 cookie）',
      control,
      concurrency: 10,
      success: ok,
      finalRows: rows.length,
      verdict: rows.length > 1 ? `存在（限制 1 次，实际落 ${rows.length} 条）` : '不存在（只落 1 条）',
      note: '若设置项不生效，finalRows 会等于并发成功数，需要结合设置读取结果判断',
    };
  } finally {
    await cleanupProject(project);
  }
}

/** T4：切屏计数并发上报 10 次，看最终累计次数是否 < 10（读改写丢更新） */
async function t4SwitchScreenLostUpdate() {
  const project = await createProject('t4');
  try {
    const submit = await call('/api/public/saveAnswer', {
      method: 'POST',
      cookie: adminCookie,
      body: { projectId: project.id, survey: project.survey, answer: { q1: { o1: true } } },
    });
    const answerId = submit.json?.data?.answerId;
    if (!answerId) throw new Error('拿不到 answerId，无法测切屏计数');
    const results = await burst(10, () =>
      call('/api/public/exam/switch-screen', {
        method: 'POST',
        cookie: adminCookie,
        body: { projectId: project.id, answerId },
      }),
    );
    const values = results.map((r) => r.json?.data).filter((v) => typeof v === 'number');
    const maxSeen = values.length ? Math.max(...values) : -1;
    const okCount = results.filter((r) => r.json?.code === 200).length;
    return {
      name: 'T4 切屏计数并发 10 次',
      concurrency: 10,
      success: okCount,
      maxReturnedValue: maxSeen,
      distinctValues: [...new Set(values)].sort((a, b) => a - b).slice(0, 12),
      verdict: maxSeen === 10 ? '不存在（累加到 10）' : `存在（期望 10，实际最大 ${maxSeen}，有丢失更新）`,
    };
  } finally {
    await cleanupProject(project);
  }
}

/** T5：同一 answerId 并发交卷 5 次 —— 看返回的 examScore/examInfo 是否互相覆盖 */
async function t5ConcurrentGrading() {
  const project = await createProject('t5', { submittedSetting: { enableUpdate: true } });
  try {
    const first = await call('/api/public/saveAnswer', {
      method: 'POST',
      cookie: adminCookie,
      body: { projectId: project.id, survey: project.survey, answer: { q1: { o1: true } } },
    });
    const answerId = first.json?.data?.answerId;
    if (!answerId) throw new Error('拿不到 answerId');
    const results = await burst(5, (i) =>
      call('/api/public/saveAnswer', {
        method: 'POST',
        cookie: adminCookie,
        body: { projectId: project.id, id: answerId, survey: project.survey, answer: { q1: { o1: true } } },
      }),
    );
    const scores = results.map((r) => r.json?.data?.examScore).filter((v) => v !== undefined && v !== null);
    const uniqueScores = [...new Set(scores)];
    const rows = await listAnswers(project.id);
    return {
      name: 'T5 同一 answerId 并发交卷 5 次',
      concurrency: 5,
      success: results.filter((r) => r.json?.code === 200).length,
      distinctScores: uniqueScores,
      finalRows: rows.length,
      verdict:
        rows.length === 1 && uniqueScores.length <= 1
          ? '不存在（仍是 1 条、分数一致）'
          : `需关注（finalRows=${rows.length}, 分数种类=${uniqueScores.length}）`,
    };
  } finally {
    await cleanupProject(project);
  }
}

/* ------------------------------------------------------------------ 主流程 */

(async () => {
  console.log(`[并发实测] 目标服务 ${BASE}`);
  if (!(await waitBackend())) {
    console.error('后端长时间不可用，放弃。');
    process.exit(2);
  }
  await login();
  console.log('[并发实测] admin 登录成功');

  const tests = [t1DuplicateSubmit, t2MaxAnswersBypass, t3CookieLimitBypass, t4SwitchScreenLostUpdate, t5ConcurrentGrading];
  const summary = [];
  for (const t of tests) {
    try {
      await ensureSession();
      const r = await t();
      summary.push(r);
      console.log(`\n## ${r.name}`);
      console.log(`   并发 ${r.concurrency}｜成功 ${r.success}｜最终落库 ${r.finalRows ?? '-'}`);
      console.log(`   结论：${r.verdict}`);
    } catch (e) {
      const name = t.name;
      summary.push({ name, error: e.message });
      console.log(`\n## ${name}\n   执行失败：${e.message}`);
    }
  }
  console.log('\n===JSON===');
  console.log(JSON.stringify({ tag: TAG, base: BASE, results: summary }, null, 2));
})();
