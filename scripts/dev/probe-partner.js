const crypto = require('crypto');
const BASE = 'http://127.0.0.1:7007';

async function cookie() {
  const sys = await fetch(BASE + '/api/system').then((r) => r.json());
  const raw = sys.data.publicKey;
  const pem = raw.includes('-----')
    ? raw
    : '-----BEGIN PUBLIC KEY-----\n' + raw.replace(/(.{64})/g, '$1\n').trim() + '\n-----END PUBLIC KEY-----';
  const enc = crypto
    .publicEncrypt({ key: pem, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from('123456'))
    .toString('base64');
  const res = await fetch(BASE + '/api/public/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: enc }),
  });
  return (res.headers.getSetCookie ? res.headers.getSetCookie() : []).map((c) => c.split(';')[0]).join('; ');
}

(async () => {
  const c = await cookie();
  const get = (p) => fetch(BASE + p, { headers: { cookie: c } }).then((r) => r.json());
  const partner = await get('/api/project/partner/list?projectId=qOnwfz&current=1&pageSize=5');
  const dash = await get('/api/dashboard/list');
  console.log(JSON.stringify({ partnerCode: partner.code, partnerMsg: partner.message, partnerTotal: partner.data && partner.data.total, dashCode: dash.code, dashMsg: dash.message }, null, 2));
})();
