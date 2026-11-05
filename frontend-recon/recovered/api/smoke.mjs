// 端到端验证：用逆向生成的 API 客户端真连后端
// 证明「请求层 + 鉴权 + 响应解包 + 错误映射」都还原对了
//
// 用法：
//   node recovered/api/smoke.mjs [baseURL]
//   需要验证登录态时： SK_USER=admin SK_PASS=*** node recovered/api/smoke.mjs
//
// 默认连 http://192.168.0.2:201（用户部署的实例）

import { SurveyKingClient, ApiError } from './client.js';

const BASE = process.argv[2] || 'http://192.168.0.2:201';
const USER = process.env.SK_USER;
const PASS = process.env.SK_PASS;

// Node 没有浏览器那种自动 Cookie，这里做个最小 cookie jar
const jar = new Map();
function cookieFetch(url, init = {}) {
  const cookieHeader = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  const headers = { ...(init.headers || {}), ...(cookieHeader ? { Cookie: cookieHeader } : {}) };
  return fetch(url, { ...init, headers, redirect: 'manual' }).then((res) => {
    const setCookies = res.headers.getSetCookie?.() ?? [];
    for (const sc of setCookies) {
      const [pair] = sc.split(';');
      const idx = pair.indexOf('=');
      if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
    }
    return res;
  });
}

const client = new SurveyKingClient({ baseURL: BASE, fetchImpl: cookieFetch, onUnauthorized: () => {} });

const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? '  — ' + detail : ''}`);
};

// 1) 未登录访问受保护接口 → 应被解包成 ApiError(401)
try {
  await client.get('/api/currentUser');
  record('未登录访问 → 应抛错', false, '居然成功了');
} catch (e) {
  record('未登录访问 → ApiError(401)', e instanceof ApiError && e.code === 401, `code=${e.code}`);
}

// 2) 公开接口 → 验证 200 正常解包出 data
try {
  const roles = await client.get('/api/public/listRegisterRole');
  record('公开接口 GET /api/public/listRegisterRole', Array.isArray(roles), `len=${roles?.length}`);
} catch (e) {
  record('公开接口 GET /api/public/listRegisterRole', false, `${e.name}: ${e.message}`);
}

// 2b) 系统信息（未登录也可读，用于渲染标题/Logo）
try {
  const sys = await client.get('/api/system');
  record('公开接口 GET /api/system', !!sys?.name, `name=${sys?.name}`);
} catch (e) {
  record('公开接口 GET /api/system', false, `${e.name}: ${e.message}`);
}

// 3) 业务错误能否透出 message（用错误密码触发，不依赖真实凭据）
try {
  await client.post('/api/public/login', { username: '__probe__', password: '__probe__' });
  record('业务错误透出 message', false, '居然登录成功了');
} catch (e) {
  record('业务错误透出 message', e instanceof ApiError && !!e.message, `code=${e.code} message=${e.message}`);
}

// 4) 有凭据时才验证登录态链路
if (USER && PASS) {
  try {
    await client.login({ username: USER, password: PASS });
    record('登录 POST /api/public/login', true);

    const me = await client.get('/api/currentUser');
    record('Cookie 会话生效 GET /api/currentUser', !!me, `username=${me?.username ?? '?'}`);

    const page = await client.getWithPagination('/api/project/list', { current: 1, pageSize: 10 });
    record('分页封装 getWithPagination', page && Array.isArray(page.list), `total=${page.total}`);

    const sys = await client.get('/api/system');
    record('GET /api/system', !!sys, Object.keys(sys || {}).slice(0, 3).join(','));
  } catch (e) {
    record('登录态链路', false, `${e.name}: ${e.message}`);
  }
} else {
  console.log('· 未提供 SK_USER / SK_PASS，跳过登录态相关验证（这是正常的）');
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n通过 ${passed}/${results.length}`);
process.exit(passed === results.length ? 0 : 1);
