const crypto = require('crypto');
const BASE = 'http://127.0.0.1:7007';

async function login() {
  const sys = await fetch(BASE + '/api/system').then(r => r.json());
  const raw = sys.data.publicKey;
  const pem = raw.includes('-----') ? raw : '-----BEGIN PUBLIC KEY-----\n' + raw.replace(/(.{64})/g, '$1\n').trim() + '\n-----END PUBLIC KEY-----';
  const enc = crypto.publicEncrypt({ key: pem, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from('123456')).toString('base64');
  const res = await fetch(BASE + '/api/public/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: enc }),
  });
  const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  return cookies.map(c => c.split(';')[0]).join('; ');
}

(async () => {
  const cookie = await login();
  const post = (path, body) => fetch(BASE + path, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  }).then(r => r.json());

  const users = await post('/api/project/selectUser', {});
  const depts = await post('/api/project/selectDept', {});
  const roles = await post('/api/project/selectRole', {});
  const dash = await fetch(BASE + '/api/dashboard/list', { headers: { cookie } }).then(r => r.json());

  const first = (users.data || [])[0] || {};
  console.log(JSON.stringify({
    selectUserCode: users.code,
    selectUserCount: (users.data || []).length,
    sampleKeys: Object.keys(first),
    samplePassword: first.password,
    samplePhone: first.phone,
    sampleAuthorities: (first.authorityList || []).slice(0, 3),
    selectDeptCode: depts.code, deptCount: (depts.data || []).length, deptSample: (depts.data || [])[0] && (depts.data || [])[0].name,
    selectRoleCode: roles.code, roleCount: (roles.data || []).length,
    dashboardCode: dash.code, dashboardCount: (dash.data || []).length,
  }, null, 2));
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
