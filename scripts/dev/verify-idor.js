const crypto = require('crypto');
const B = 'http://127.0.0.1:7007';

async function cookie() {
  const sys = await fetch(B + '/api/system').then((r) => r.json());
  const raw = sys.data.publicKey;
  const nl = String.fromCharCode(10);
  const pem = raw.includes('-----')
    ? raw
    : '-----BEGIN PUBLIC KEY-----' + nl + raw.replace(/(.{64})/g, '$1' + nl).trim() + nl + '-----END PUBLIC KEY-----';
  const enc = crypto
    .publicEncrypt({ key: pem, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from('123456'))
    .toString('base64');
  const res = await fetch(B + '/api/public/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: enc }),
  });
  return (res.headers.getSetCookie ? res.headers.getSetCookie() : []).map((c) => c.split(';')[0]).join('; ');
}

(async () => {
  const c = await cookie();
  const otherAnswerId = process.argv[2];
  const res = await fetch(B + '/api/public/projectOutline', {
    method: 'POST',
    headers: { cookie: c, 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'qOnwfz', answerId: otherAnswerId }),
  }).then((r) => r.json());
  const dash = await fetch(B + '/api/dashboard/list', { headers: { cookie: c } }).then((r) => r.json());
  console.log(JSON.stringify({
    idorCode: res.code,
    idorMessage: res.message,
    leakedAnswerKeys: res.data && res.data.answer ? Object.keys(res.data.answer).length : 0,
    verdict: res.code === 200 && res.data && res.data.answer ? 'FAIL: 仍能读他人答卷' : 'OK: 已拒绝',
    dashboardCode: dash.code,
    dashboardMessage: dash.message,
  }, null, 2));
})();
