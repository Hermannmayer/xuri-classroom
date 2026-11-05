// 用学员账号实测：登录 → 项目列表 / 题库列表 / 练习册
const path = require('path');
const JSEncrypt = require(path.join(__dirname, '../../client/node_modules/jsencrypt'));

const BASE = 'http://127.0.0.1';
const USERNAME = process.argv[2] || '1';
const PASSWORD = process.argv[3] || '12345678';

async function login() {
  const sys = await (await fetch(`${BASE}/api/system`)).json();
  const enc = new JSEncrypt();
  enc.setPublicKey(sys.data.publicKey);
  const res = await fetch(`${BASE}/api/public/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: enc.encrypt(PASSWORD) }),
  });
  const json = await res.json();
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')];
  return { json, cookie: (raw[0] || '').split(';')[0] };
}

(async () => {
  const { json, cookie } = await login();
  console.log('登录:', json.code === 200 ? 'OK' : JSON.stringify(json));
  if (json.code !== 200) return;

  const me = await (await fetch(`${BASE}/api/currentUser`, { headers: { cookie } })).json();
  console.log('权限:', JSON.stringify(me.data?.authorityList ?? []));
  console.log('部门:', me.data?.deptId, me.data?.deptName);

  for (const [label, url] of [
    ['项目列表', '/api/project/list?current=1&pageSize=10'],
    ['题库列表', '/api/repo/list?current=1&pageSize=10&memberOnly=true'],
    ['练习册', '/api/repo/book/list?current=1&pageSize=10'],
    ['历史记录', '/api/listHistoryTask?current=1&pageSize=10'],
  ]) {
    const res = await fetch(BASE + url, { headers: { cookie } });
    const body = await res.text();
    console.log(`\n${label}: HTTP ${res.status}`, body.slice(0, 220));
  }
})();
