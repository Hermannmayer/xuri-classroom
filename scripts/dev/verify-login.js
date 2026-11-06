const crypto = require('crypto');

const BASE = 'http://127.0.0.1:7007';

async function main() {
  const sys = await fetch(BASE + '/api/system').then(r => r.json());
  const rawKey = sys.data.publicKey;
  // 后端给的是不带 PEM 头的裸 Base64（X.509/SPKI），Node 需要包一层
  const publicKey = rawKey.includes('-----')
    ? rawKey
    : '-----BEGIN PUBLIC KEY-----\n' +
      rawKey.replace(/(.{64})/g, '$1\n').trim() +
      '\n-----END PUBLIC KEY-----';

  const encrypted = crypto
    .publicEncrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from('123456'))
    .toString('base64');

  const loginRes = await fetch(BASE + '/api/public/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: encrypted }),
  });
  const loginBody = await loginRes.json().catch(() => ({}));
  const cookie = (loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [])
    .map(c => c.split(';')[0])
    .join('; ');

  const out = { loginStatus: loginRes.status, loginCode: loginBody.code, hasCookie: Boolean(cookie) };
  if (!cookie) {
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  const get = (path, opts) =>
    fetch(BASE + path, { ...opts, headers: { cookie, 'content-type': 'application/json', ...(opts && opts.headers) } });

  const me = await get('/api/currentUser').then(r => r.json());
  const depts = await get('/api/system/dept/list').then(r => r.json());
  const users = await get('/api/system/user/list?current=1&pageSize=5').then(r => r.json());
  const audit = await get('/api/system/audit/list?current=1&pageSize=5').then(r => r.json());
  const trash = await get('/api/project/trash').then(r => r.json());

  out.me = { code: me.code, name: me.data && me.data.name, deptIds: me.data && me.data.deptIds,
    deptNames: me.data && me.data.deptNames, authCount: me.data ? (me.data.authorityList || []).length : 0 };
  out.deptRoles = (depts.data || []).map(d => ({ name: d.name, roles: d.roleNames }));
  out.usersWithGroups = (users.data && users.data.list || []).map(u => ({ name: u.name, deptName: u.deptName, deptNames: u.deptNames }));
  out.auditTotal = audit.data && audit.data.total;
  out.trashCount = Array.isArray(trash.data) ? trash.data.length : trash.data && trash.data.total;

  console.log(JSON.stringify(out, null, 2));
}

main().catch(e => {
  console.error('FAILED', e);
  process.exit(1);
});
