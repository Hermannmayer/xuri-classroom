const crypto = require('crypto');
const BASE = 'http://127.0.0.1:7007';

(async () => {
  const sys = await fetch(BASE + '/api/system').then((r) => r.json());
  const raw = sys.data.publicKey;
  const nl = String.fromCharCode(10);
  const pem = raw.includes('-----')
    ? raw
    : '-----BEGIN PUBLIC KEY-----' + nl + raw.replace(/(.{64})/g, '$1' + nl).trim() + nl + '-----END PUBLIC KEY-----';
  const enc = crypto
    .publicEncrypt({ key: pem, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from('123456'))
    .toString('base64');
  const res = await fetch(BASE + '/api/public/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: enc }),
  });
  const rawCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const list = rawCookies.map((c) => {
    const pair = c.split(';')[0];
    const i = pair.indexOf('=');
    return {
      name: pair.slice(0, i),
      value: pair.slice(i + 1),
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    };
  });
  require('fs').writeFileSync(process.argv[2], JSON.stringify(list));
  console.log('cookies=' + list.length + ' -> ' + process.argv[2]);
})();
