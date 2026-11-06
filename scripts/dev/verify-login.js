// 登录链路 + 「组绑角色是否真的进了鉴权」验证脚本。
//
// 用法：
//   node scripts/dev/verify-login.js                    # admin 自检（默认行为，保持原输出）
//   node scripts/dev/verify-login.js <账号> [密码]       # 用指定账号登录，并逐条说明权限来自哪里
//   node scripts/dev/verify-login.js 1 12345678
//
// 第二个用法会额外拉一份角色表和组表，把「所属组链上绑定的角色」推出来，和 currentUser 的
// authorityList 做对比。期望：一个没有任何直挂角色的账号，只要所在组链上绑了角色，
// 登录后就应该拿到该角色的 ROLE_xxx 与权限串（本轮改动前是空数组）。
const crypto = require('crypto');

const BASE = process.env.SK_BASE || 'http://127.0.0.1:7007';

async function loadPublicKey() {
  const sys = await fetch(BASE + '/api/system').then(r => r.json());
  const rawKey = sys.data.publicKey;
  // 后端给的是不带 PEM 头的裸 Base64（X.509/SPKI），Node 需要包一层
  return rawKey.includes('-----')
    ? rawKey
    : '-----BEGIN PUBLIC KEY-----\n' + rawKey.replace(/(.{64})/g, '$1\n').trim() + '\n-----END PUBLIC KEY-----';
}

async function login(publicKey, username, password) {
  const encrypted = crypto
    .publicEncrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from(password))
    .toString('base64');
  const res = await fetch(BASE + '/api/public/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: encrypted }),
  });
  const body = await res.json().catch(() => ({}));
  const cookie = (res.headers.getSetCookie ? res.headers.getSetCookie() : [])
    .map(c => c.split(';')[0])
    .join('; ');
  return { status: res.status, code: body.code, message: body.message, cookie };
}

function api(cookie) {
  return (path, opts) =>
    fetch(BASE + path, {
      ...opts,
      headers: { cookie, 'content-type': 'application/json', ...(opts && opts.headers) },
    });
}

/** 角色 → 它带来的权限串（ROLE_ + authority 拆分），与后端 toAuthorityNames 保持一致 */
function authoritiesOfRole(role) {
  const set = new Set();
  if (role.code) set.add('ROLE_' + role.code);
  (role.authorities || []).forEach(a => {
    if (a && a.trim()) set.add(a.trim());
  });
  return set;
}

/** 从用户的主组 + 附加组出发，沿 parentId 展开组链 */
function buildDeptChain(rootIds, deptById) {
  const chain = [];
  const seen = new Set();
  for (const rootId of rootIds) {
    let id = rootId;
    while (id && id !== '0' && !seen.has(id)) {
      seen.add(id);
      const dept = deptById.get(id);
      chain.push({ id, name: dept ? dept.name : '(已删除的组)', roleIds: (dept && dept.roleIds) || [] });
      if (!dept) break;
      id = dept.parentId;
    }
  }
  return chain;
}

async function adminSelfCheck(publicKey) {
  const admin = await login(publicKey, 'admin', '123456');
  const out = { loginStatus: admin.status, loginCode: admin.code, hasCookie: Boolean(admin.cookie) };
  if (!admin.cookie) {
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  const get = api(admin.cookie);
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

/** 指定账号：打印最终权限，并说明哪些权限来自组链上的角色 */
async function userCheck(publicKey, username, password) {
  const admin = await login(publicKey, 'admin', '123456');
  if (!admin.cookie) {
    console.error('admin 登录失败，无法读取角色与组信息');
    process.exit(1);
  }
  const adminGet = api(admin.cookie);
  const roles = (await adminGet('/api/system/role/list?current=1&pageSize=100').then(r => r.json())).data;
  const depts = (await adminGet('/api/system/dept/list').then(r => r.json())).data || [];
  const roleById = new Map((roles.list || []).map(r => [r.id, r]));
  const deptById = new Map(depts.map(d => [d.id, d]));

  const target = await login(publicKey, username, password);
  if (!target.cookie) {
    console.log(JSON.stringify({ username, loginCode: target.code, message: target.message }, null, 2));
    return;
  }
  const get = api(target.cookie);
  const me = (await get('/api/currentUser').then(r => r.json())).data || {};
  const actual = new Set((me.authorityList || []).filter(Boolean));

  const rootIds = [me.deptId, ...(me.deptIds || [])].filter(Boolean);
  const chain = buildDeptChain(rootIds, deptById);
  const groupRoleIds = [...new Set(chain.flatMap(d => d.roleIds))];
  const fromGroups = new Set();
  groupRoleIds.forEach(roleId => {
    const role = roleById.get(roleId);
    if (role) authoritiesOfRole(role).forEach(a => fromGroups.add(a));
  });

  const missing = [...fromGroups].filter(a => !actual.has(a));
  console.log(JSON.stringify({
    username,
    name: me.name,
    mainDept: { id: me.deptId, name: me.deptName },
    extraDepts: (me.deptIds || []).map(id => ({ id, name: (deptById.get(id) || {}).name })),
    deptChain: chain.map(d => ({
      name: d.name,
      roles: d.roleIds.map(rid => {
        const role = roleById.get(rid);
        return role ? `${role.name}(${role.code})` : rid;
      }),
    })),
    groupRoleAuthorities: [...fromGroups].sort(),
    actualAuthorityCount: actual.size,
    actualAuthorityList: [...actual].sort(),
    /** 组链角色应带来的权限里，currentUser 还没拿到的（应为空；非空说明鉴权没接上或缓存没失效） */
    missingFromCurrentUser: missing.sort(),
    verdict: missing.length
      ? `组角色有 ${missing.length} 个权限串没进 authorityList —— 鉴权未生效或 userCache 未失效`
      : '组链角色已全部体现在 authorityList 里',
  }, null, 2));
}

async function main() {
  const publicKey = await loadPublicKey();
  const [username, password] = process.argv.slice(2);
  if (username) {
    await userCheck(publicKey, username, password || '12345678');
  } else {
    await adminSelfCheck(publicKey);
  }
}

main().catch(e => {
  console.error('FAILED', e);
  process.exit(1);
});
