// 从逆向证据生成干净、零依赖的 API 客户端
// 输入：scripts/out-api-methods.txt（前端方法名 | 方法 | 路径 | 行号 | 页面）
// 输出：recovered/api/client.js
import fs from 'node:fs';

const rows = fs
  .readFileSync('scripts/out-api-methods.txt', 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((l) => {
    const [name, method, path] = l.split(' | ').map((s) => (s || '').trim());
    return { name, method, path };
  })
  .filter((r) => r.name && r.path);

// 方法名去重：同名保留第一次（后出现的多为内部重载）
const byName = new Map();
for (const r of rows) {
  if (!/^[A-Za-z_$][\w$]*$/.test(r.name)) continue;
  if (r.name === 'get' || r.name === 'post' || r.name === 'request') continue;
  if (!byName.has(r.name)) byName.set(r.name, r);
}

// 路径清洗：
//   - 结尾是 "/" 的，说明后面拼了运行时 id
//   - 结尾是 "?" 的，说明是 SSE / 查询串拼接
const cleanPath = (p) => p.replace(/\?$/, '').replace(/\/$/, '');
const needsIdParam = (p) => /\/$/.test(p) && p !== '/';

// 用更完整的端点表补齐：有些调用（如登录）只出现在主包入口，方法清单里抓不到
const camel = (s) =>
  s
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w.toLowerCase()))
    .join('');

const synthName = (path) => {
  const seg = path.split('/').filter(Boolean); // api, public, login
  const rest = seg.slice(1).filter((s) => s !== 'public');
  return camel(rest.join('-')) || 'root';
};

const coveredPaths = new Set([...byName.values()].map((m) => cleanPath(m.path)));
for (const line of fs.readFileSync('extract/endpoints-full.tsv', 'utf8').split(/\r?\n/).filter(Boolean)) {
  const [path, methods] = line.split('\t');
  if (!path || coveredPaths.has(cleanPath(path))) continue;
  const method = (methods || '').split('/')[0] || 'GET';
  const name = synthName(path);
  if (byName.has(name)) continue;
  byName.set(name, { name, method: method === '?' ? 'GET' : method, path, synthesized: true });
  coveredPaths.add(cleanPath(path));
}

// 路径里的 :param / {param} 转成模板参数
const toTemplate = (p) => {
  const base = cleanPath(p);
  return base.replace(/\{([\w]+)\}/g, '${encodeURIComponent($1)}').replace(/:([\w]+)/g, '${encodeURIComponent($1)}');
};

const methods = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
const dynamic = methods.filter((m) => /[{}:]/.test(m.path.replace(/\{[^}]*\}/g, '{}')) && /\$\{/.test(toTemplate(m.path)));

const lines = [];
lines.push('/**');
lines.push(' * SurveyKing API 客户端');
lines.push(' *');
lines.push(' * 由闭源前端构建产物逆向生成，端点与调用名与原实现一致。');
lines.push(' * 零依赖，只要一个 fetch。');
lines.push(' *');
lines.push(' * 约定（全部经实测确认）：');
lines.push(' *   - 会话走 Cookie（credentials: "include"）');
lines.push(' *   - CSRF 双提交：Cookie XSRF-TOKEN → 请求头 X-XSRF-TOKEN');
lines.push(' *   - 响应统一 { code, message, data }，code===200 为成功');
lines.push(' *   - 401 跳登录，403 无权限，4043 是需提示的业务错误');
lines.push(' *   - GET 参数走 querystring 且剔除 null/空串');
lines.push(' */');
lines.push('');
lines.push('const OK = 200;');
lines.push('const UN_AUTHORIZED = 401;');
lines.push('const FORBIDDEN = 403;');
lines.push('const BIZ_ERROR = 4043;');
lines.push('');
lines.push('function readCookie(name) {');
lines.push('  if (typeof document === "undefined") return "";');
lines.push('  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));');
lines.push('  return m ? decodeURIComponent(m[1]) : "";');
lines.push('}');
lines.push('');
lines.push('function toQuery(params) {');
lines.push('  const usp = new URLSearchParams();');
lines.push('  for (const [k, v] of Object.entries(params || {})) {');
lines.push('    if (v === null || v === undefined || v === "") continue;');
lines.push('    if (Array.isArray(v)) v.forEach((x) => usp.append(k, String(x)));');
lines.push('    else usp.append(k, String(v));');
lines.push('  }');
lines.push('  return usp.toString();');
lines.push('}');
lines.push('');
lines.push('export class ApiError extends Error {');
lines.push('  constructor(code, message, data) {');
lines.push('    super(message || `API error ${code}`);');
lines.push('    this.name = "ApiError";');
lines.push('    this.code = code;');
lines.push('    this.data = data;');
lines.push('  }');
lines.push('}');
lines.push('');
lines.push('export class SurveyKingClient {');
lines.push('  /**');
lines.push('   * @param {Object} [opts]');
lines.push('   * @param {string} [opts.baseURL=""]       后端地址，同源部署留空');
lines.push('   * @param {(payload:any)=>void} [opts.onUnauthorized] 401 回调（默认跳 /user/login）');
lines.push('   * @param {(msg:string)=>void} [opts.onBizError]     4043 提示回调');
lines.push('   */');
lines.push('  constructor({ baseURL = "", onUnauthorized, onBizError, fetchImpl } = {}) {');
lines.push('    this.baseURL = baseURL.replace(/\\/$/, "");');
lines.push('    this.fetch = fetchImpl || ((...args) => fetch(...args));');
lines.push('    this.onUnauthorized = onUnauthorized || (() => {');
lines.push('      if (typeof location !== "undefined") location.href = "/user/login";');
lines.push('    });');
lines.push('    this.onBizError = onBizError || (() => {});');
lines.push('  }');
lines.push('');
lines.push('  async request(method, url, data, options = {}) {');
lines.push('    const isForm = typeof FormData !== "undefined" && data instanceof FormData;');
lines.push('    const headers = {');
lines.push('      Accept: "application/json",');
lines.push('      "Accept-Language": (options.locale || "zh-CN"),');
lines.push('      "Cache-Control": "no-cache",');
lines.push('      Pragma: "no-cache",');
lines.push('    };');
lines.push('    const csrf = readCookie("XSRF-TOKEN");');
lines.push('    if (csrf) headers["X-XSRF-TOKEN"] = csrf;');
lines.push('    if (!isForm && data !== undefined) headers["Content-Type"] = "application/json";');
lines.push('');
lines.push('    let finalUrl = this.baseURL + url;');
lines.push('    const init = { method, headers, credentials: "include" };');
lines.push('');
lines.push('    if (method === "GET" || method === "DELETE") {');
lines.push('      const qs = toQuery(data);');
lines.push('      if (qs) finalUrl += (finalUrl.includes("?") ? "&" : "?") + qs;');
lines.push('    } else if (isForm) {');
lines.push('      init.body = data;');
lines.push('    } else if (data !== undefined) {');
lines.push('      init.body = JSON.stringify(data);');
lines.push('    }');
lines.push('');
lines.push('    const res = await this.fetch(finalUrl, init);');
lines.push('');
lines.push('    // 文件下载：直接返回 Response，交给调用方处理 blob');
lines.push('    if (options.raw) return res;');
lines.push('');
lines.push('    const payload = await res.json().catch(() => ({}));');
lines.push('');
lines.push('    if (payload.code === UN_AUTHORIZED) {');
lines.push('      this.onUnauthorized(payload);');
lines.push('      throw new ApiError(UN_AUTHORIZED, payload.message || "未登录");');
lines.push('    }');
lines.push('    if (payload.code === FORBIDDEN) {');
lines.push('      throw new ApiError(FORBIDDEN, payload.message || "未授权访问");');
lines.push('    }');
lines.push('    if (payload.code === BIZ_ERROR) {');
lines.push('      this.onBizError(payload.message);');
lines.push('      throw new ApiError(BIZ_ERROR, payload.message);');
lines.push('    }');
lines.push('    if (payload.code !== OK) {');
lines.push('      throw new ApiError(payload.code, payload.message, payload.data);');
lines.push('    }');
lines.push('    return payload.data;');
lines.push('  }');
lines.push('');
lines.push('  get(url, params, options) {');
lines.push('    return this.request("GET", url, params, options);');
lines.push('  }');
lines.push('');
lines.push('  post(url, data, options) {');
lines.push('    return this.request("POST", url, data, options);');
lines.push('  }');
lines.push('');
lines.push('  delete(url, params, options) {');
lines.push('    return this.request("DELETE", url, params, options);');
lines.push('  }');
lines.push('');
lines.push('  /**');
lines.push('   * 分页列表：后端返回 { list, total }，这里补齐表格组件需要的形状');
lines.push('   * @returns {Promise<{current:number,pageSize:number,list:any[],total:number}>}');
lines.push('   */');
lines.push('  async getWithPagination(url, { current = 1, pageSize = 10, ...rest } = {}) {');
lines.push('    const res = await this.get(url, { current, pageSize, ...rest });');
lines.push('    if (!res) return { current, pageSize, list: [], total: 0 };');
lines.push('    return { current, pageSize, data: res.list, list: res.list || [], total: res.total ?? 0 };');
lines.push('  }');
lines.push('');
lines.push('  /** 下载：解析 content-disposition 拿文件名 */');
lines.push('  async download(url, params) {');
lines.push('    const res = await this.request("GET", url, params, { raw: true });');
lines.push('    const disposition = res.headers.get("content-disposition") || "";');
lines.push('    const match = disposition.match(/filename\\*?=(?:UTF-8\'\')?"?([^";]+)"?/i);');
lines.push('    const fileName = match ? decodeURIComponent(match[1]) : "download";');
lines.push('    const blob = await res.blob();');
lines.push('    return { blob, fileName };');
lines.push('  }');
lines.push('');

// 按模块分组生成方法
const groups = new Map();
for (const m of methods) {
  const seg = cleanPath(m.path).split('/').filter(Boolean);
  const key = seg.length > 1 ? seg[1].replace(/[^\w]/g, '') : 'misc';
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(m);
}

lines.push('  // ===== 以下方法由逆向结果生成 =====');
for (const [group, list] of [...groups].sort()) {
  lines.push('');
  lines.push(`  // ---- ${group} ----`);
  for (const m of list) {
    // 归一化方法：'?' → GET（SSE 流），'UPLOAD(POST multipart)' → POST
    const found = String(m.method || '').match(/\b(GET|POST|PUT|DELETE|PATCH)\b/i);
    const method = found ? found[1].toUpperCase() : 'GET';
    const idParam = needsIdParam(m.path) ? ['id'] : [];
    // 需要拼 id 的路径要保留结尾的 "/"
    const base = idParam.length ? m.path.replace(/\?$/, '') : cleanPath(m.path);
    const explicit = cleanPath(base).match(/[{}:](\w+)/g)?.map((s) => s.slice(1)) ?? [];
    const params = [...explicit, ...idParam];
    const tpl = '`' + toTemplate(cleanPath(base)) + (idParam.length ? '/${encodeURIComponent(id)}' : '') + '`';
    const isGet = method === 'GET';
    const arg = isGet ? 'params' : 'data';
    const sig = [...params, arg].join(', ');
    lines.push(`  /** ${method} ${cleanPath(base)}${idParam.length ? '/{id}' : ''} */`);
    lines.push(`  ${m.name}(${sig}) {`);
    lines.push(`    return this.${isGet ? 'get' : method.toLowerCase()}(${tpl}, ${arg});`);
    lines.push('  }');
  }
}

lines.push('}');
lines.push('');
lines.push('export default SurveyKingClient;');

fs.mkdirSync('recovered/api', { recursive: true });
fs.writeFileSync('recovered/api/client.js', lines.join('\n'));

console.log(
  JSON.stringify(
    {
      methods: methods.length,
      groups: [...groups.keys()].sort(),
      dynamicPaths: dynamic.map((d) => `${d.name} ${d.path}`),
    },
    null,
    2
  )
);
