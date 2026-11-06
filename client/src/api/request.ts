import { getLocale } from '../i18n';

export interface ApiResponse<T = unknown> {
  code: number;
  message?: string;
  data: T;
}

export class ApiError extends Error {
  code: number;
  constructor(code: number, msg?: string) {
    super(msg || `请求失败 (${code})`);
    this.name = 'ApiError';
    this.code = code;
  }
}

// 未登录跳转由上层注册，避免 request 直接依赖 router
let onUnauthorized = () => {
  if (!location.pathname.startsWith('/user/')) {
    location.replace('/user/login');
  }
};
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

const CHINESE = /[\u4e00-\u9fa5]/;

/**
 * 把后端 code/message 归一成「能直接给用户看」的中文。
 *
 * 后端异常（InternalServerError 等）会把堆栈/数据库异常文本塞进 message，
 * 这类原文不能直出给用户；403 的英文 "Authentication failed" 也要统一。
 * 业务校验错误（如「名称不能为空」）本身是中文，保留原文。
 */
export function humanizeApiError(code: number, backendMessage?: string): string {
  if (code === 401) return '登录已过期，请重新登录';
  if (code === 403) return '没有权限执行该操作（如为导出，请检查导出密码）';
  if (code === -1) return backendMessage || '无法连接后端服务，请确认后端已启动';
  if (code >= 500) return '服务器内部错误，请稍后重试';
  return backendMessage && CHINESE.test(backendMessage) ? backendMessage : `操作失败（${code}）`;
}

function qs(params?: Record<string, unknown>): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') continue;
    sp.append(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/**
 * 后端约定：HTTP 状态恒为 200，真实结果在 body.code 里。
 * 401 = 未登录，403 = 无权限，其它非 200 一律按业务错误抛出。
 *
 * 注意：这里不再自己弹 message——调用方统一 `catch` 后展示（错误文案已经过 humanize），
 * 否则 403 会同时出现「未授权访问」和后端原文两条提示。
 */
export async function http<T>(method: string, url: string, data?: unknown): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': getLocale(),
  };
  let body: BodyInit | undefined;
  let full = url;

  if (method === 'GET' || method === 'DELETE') {
    full += qs(data as Record<string, unknown>);
  } else if (data instanceof FormData) {
    body = data; // 浏览器自己带 boundary
  } else if (data !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(data);
  }

  let res: Response;
  try {
    res = await fetch(full, { method, headers, body, credentials: 'include' });
  } catch {
    throw new ApiError(-1, '无法连接后端服务，请确认后端已启动');
  }

  // 后端对未知路径有 SPA 兜底，会返回 HTML；这里显式拦掉，避免 JSON.parse 报错
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    if (res.status >= 500) throw new ApiError(res.status, '服务暂时不可用，请稍后重试');
    throw new ApiError(-1, `接口返回非 JSON（${url}），请检查后端是否已启动`);
  }

  const json = (await res.json()) as ApiResponse<T>;
  switch (json.code) {
    case 200:
      return json.data;
    case 401:
      onUnauthorized();
      throw new ApiError(401, humanizeApiError(401, json.message));
    case 403:
      throw new ApiError(403, humanizeApiError(403, json.message));
    default:
      throw new ApiError(json.code, humanizeApiError(json.code, json.message));
  }
}

export const get = <T>(url: string, params?: Record<string, unknown>) => http<T>('GET', url, params);
export const post = <T>(url: string, data?: unknown) => http<T>('POST', url, data);

export interface PaginationResponse<T> {
  total: number;
  list: T[];
  current?: number;
  pageSize?: number;
}

export interface PageResult<T> {
  current: number;
  pageSize: number;
  total: number;
  data: T[];
}

export async function getWithPagination<T>(
  url: string,
  params: Record<string, unknown> = {},
): Promise<PageResult<T>> {
  const current = Number(params.current ?? 1);
  const pageSize = Number(params.pageSize ?? 10);
  const res = await get<PaginationResponse<T>>(url, { ...params, current, pageSize });
  return { current, pageSize, total: res?.total ?? 0, data: res?.list ?? [] };
}

function fileNameFromDisposition(cd: string, fallback: string): string {
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(cd);
  const plain = /filename="?([^";]+)"?/i.exec(cd);
  const raw = star?.[1] ?? plain?.[1];
  if (!raw) return fallback;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * 下载文件。
 *
 * 后端错误统一是「HTTP 200 + body.code」，之前这里只看 res.ok，会把错误 JSON
 * 直接保存成 .xlsx。现在先按 content-type 判断：JSON 一律解析 code/message 抛中文错误；
 * 只有真正的二进制才落盘。401 仍然走全局跳登录。
 */
export async function download(
  url: string,
  params?: Record<string, unknown>,
  fallbackName = 'download',
): Promise<void> {
  const res = await fetch(url + qs(params), { credentials: 'include' });
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = (await res.json().catch(() => undefined)) as ApiResponse | undefined;
    const code = json?.code ?? res.status;
    if (code === 401) onUnauthorized();
    throw new ApiError(code, humanizeApiError(code, json?.message));
  }
  if (!res.ok) throw new ApiError(res.status, `下载失败（HTTP ${res.status}）`);
  const blob = await res.blob();
  const name = fileNameFromDisposition(res.headers.get('content-disposition') || '', fallbackName);
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 立刻 revoke 在部分浏览器会打断下载，延后释放
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
