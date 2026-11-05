// 登录链路冒烟：GET /api/system → RSA 加密 → POST /api/public/login → GET /api/currentUser
// 用法：node scripts/smoke-login.cjs [baseUrl] [username] [password]
// 用 CJS 是因为 jsencrypt 的 ESM 入口在 Node 下缺扩展名，CJS 入口（umd）正常。
const JSEncrypt = require('jsencrypt');

const base = process.argv[2] || 'http://127.0.0.1:7007';
const username = process.argv[3] || 'admin';
const password = process.argv[4] || '123456';

const fail = (msg) => {
  console.error('✗ ' + msg);
  process.exit(1);
};

(async () => {
  const sys = await (await fetch(`${base}/api/system`)).json();
  if (sys.code !== 200 || !sys.data?.publicKey) fail('GET /api/system 未返回 publicKey');
  console.log('✓ /api/system publicKey 就绪');

  const enc = new JSEncrypt();
  enc.setPublicKey(sys.data.publicKey);
  const encrypted = enc.encrypt(password);
  if (!encrypted) fail('RSA 加密失败');

  const loginRes = await fetch(`${base}/api/public/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: encrypted }),
  });
  const loginBody = await loginRes.text();
  const json = JSON.parse(loginBody || '{}');
  if (json.code !== 200) fail(`登录失败：${loginBody}`);
  const setCookie = loginRes.headers.get('set-cookie');
  if (!setCookie || !setCookie.includes('sk-token=')) fail('登录未下发 sk-token cookie');
  console.log('✓ 登录成功，已下发 sk-token');

  const cookie = setCookie.split(';')[0];
  const me = await (await fetch(`${base}/api/currentUser`, { headers: { cookie } })).json();
  if (me.code !== 200 || !me.data?.userId) fail(`/api/currentUser 失败：${JSON.stringify(me)}`);
  console.log(`✓ /api/currentUser → ${me.data.name || me.data.userId}，权限 ${me.data.authorityList?.length ?? 0} 项`);

  const noAuth = await (await fetch(`${base}/api/currentUser`)).json();
  if (noAuth.code !== 401) fail(`未登录未返回 401：${JSON.stringify(noAuth)}`);
  console.log('✓ 未登录返回 code=401');

  console.log('\n全部通过');
})().catch((e) => fail(e.message));
