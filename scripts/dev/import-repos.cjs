// 把「25年新 -育婴、养老、保育复习题各科题库」目录下的 9 个 xlsx 分别导入成独立题库。
// 用法：node scripts/dev/import-repos.cjs <目录>
// 依赖 client/node_modules 里的 jsencrypt（RSA 登录）和 Node 18+ 的 fetch/FormData/Blob。
const fs = require('fs');
const path = require('path');
const JSEncrypt = require(path.join(__dirname, '../../client/node_modules/jsencrypt'));

const BASE = process.env.SK_BASE || 'http://127.0.0.1';
const USER = 'admin';
const PASS = '123456';

const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) {
  console.error('目录不存在: ' + dir);
  process.exit(1);
}

const PROFESSION = { 保育: '保育员', 养老: '养老护理员', 育婴: '育婴员' };
const LEVEL = { 3: '三级', 4: '四级', 5: '五级' };

async function login() {
  const sys = await (await fetch(`${BASE}/api/system`)).json();
  if (!sys.data?.publicKey) throw new Error('没有拿到 publicKey');
  const enc = new JSEncrypt();
  enc.setPublicKey(sys.data.publicKey);
  const encrypted = enc.encrypt(PASS);
  const res = await fetch(`${BASE}/api/public/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: encrypted }),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error('登录失败: ' + JSON.stringify(json));
  const setCookie = res.headers.get('set-cookie') || '';
  const cookie = setCookie.split(';')[0];
  if (!cookie) throw new Error('登录没有下发 cookie');
  return cookie;
}

async function createRepo(cookie, name) {
  const res = await fetch(`${BASE}/api/repo/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ name, category: '职业技能等级认定', mode: 'exam', description: name }),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(`建题库失败(${name}): ` + JSON.stringify(json));
  return json.data?.id || json.data;
}

async function importFile(cookie, repoId, filePath) {
  const buf = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('repoId', String(repoId));
  form.append('file', new Blob([buf]), path.basename(filePath));
  const res = await fetch(`${BASE}/api/repo/import`, { method: 'POST', headers: { cookie }, body: form });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { code: res.status, message: text.slice(0, 200) };
  }
  if (json.code !== 200) throw new Error(`导入失败(${path.basename(filePath)}): ` + JSON.stringify(json).slice(0, 300));
  return json;
}

(async () => {
  const cookie = await login();
  console.log('✓ 登录成功');

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.xlsx'))
    .sort();

  for (const file of files) {
    const base = path.basename(file, path.extname(file)); // 保育3 / 养老4 ...
    const profession = PROFESSION[base.slice(0, 2)] || base.slice(0, 2);
    const level = LEVEL[base.slice(2)] || base.slice(2);
    const name = `${profession}${level}复习题`;

    try {
      const repoId = await createRepo(cookie, name);
      await importFile(cookie, repoId, path.join(dir, file));
      console.log(`✓ ${name}  ←  ${file}  (repoId=${repoId})`);
    } catch (e) {
      console.error(`✗ ${name}: ${e.message}`);
    }
  }
})();
