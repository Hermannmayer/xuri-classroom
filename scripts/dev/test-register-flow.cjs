// 注册链路端到端：开启注册 → 注册新用户 → 登录 → 查权限/部门
const path = require('path');
const JSEncrypt = require(path.join(__dirname, '../../client/node_modules/jsencrypt'));

const BASE = 'http://127.0.0.1';
const USERNAME = 'student2026';
const PASSWORD = 'Student2026';

async function login(username, password) {
  const sys = await (await fetch(`${BASE}/api/system`)).json();
  const enc = new JSEncrypt();
  enc.setPublicKey(sys.data.publicKey);
  const res = await fetch(`${BASE}/api/public/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: enc.encrypt(password) }),
  });
  const json = await res.json();
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')];
  return { json, cookie: (raw[0] || '').split(';')[0] };
}

(async () => {
  // 1. 管理员登录，开启注册 + 指定学员角色
  const admin = await login('admin', '123456');
  if (admin.json.code !== 200) throw new Error('管理员登录失败: ' + JSON.stringify(admin.json));

  const up = await fetch(`${BASE}/api/system/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: admin.cookie },
    body: JSON.stringify({ registerInfo: { registerEnabled: true, roles: ['student'] } }),
  });
  const upJson = await up.json();
  console.log('1. 开启注册:', upJson.code === 200 ? 'OK' : JSON.stringify(upJson));

  const sys = await (await fetch(`${BASE}/api/system`)).json();
  console.log('   registerInfo =', JSON.stringify(sys.data.registerInfo));

  // 2. 注册
  const reg = await fetch(`${BASE}/api/public/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD, name: '测试学员' }),
  });
  const regJson = await reg.json();
  console.log('2. 注册:', JSON.stringify(regJson).slice(0, 160));

  // 3. 登录
  const stu = await login(USERNAME, PASSWORD);
  console.log('3. 新用户登录:', stu.json.code === 200 ? 'OK' : JSON.stringify(stu.json).slice(0, 160));

  if (stu.json.code === 200) {
    const me = await (await fetch(`${BASE}/api/currentUser`, { headers: { cookie: stu.cookie } })).json();
    console.log('4. 权限:', JSON.stringify(me.data?.authorityList ?? []).slice(0, 200));
    console.log('   部门:', me.data?.deptName ?? '(无)', ' 角色:', JSON.stringify(me.data?.roles ?? []));
  }
})();
