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

const INTERNAL_ERROR = /exception|sql|stack\s*trace|caused by|syntaxerror|at\s+[\w$.]+\s*\(/i;

/** 把后端 code/message 归一成「能直接给用户看」的中文 */
export function humanizeApiError(code: number, backendMessage?: string): string {
  if (code === 401) return '登录已过期，请重新登录';
  if (code === 403) {


    if (backendMessage && CHINESE.test(backendMessage) && !INTERNAL_ERROR.test(backendMessage)) {
      return backendMessage;
    }
    return '没有权限执行该操作（如为导出，请检查导出密码）';
  }
  if (code === -1) return backendMessage || '无法连接后端服务，请确认后端已启动';
  if (backendMessage && CHINESE.test(backendMessage) && !INTERNAL_ERROR.test(backendMessage)) {
    return backendMessage;
  }
  if (code === 500 || code >= 5000) return '服务器内部错误，请稍后重试';
  return `操作失败（${code}）`;
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

/** 没有可用 JSON body 时的兜底：按 HTTP 状态归纳成 ApiError */
function statusError(status: number, url: string): ApiError {
  if (status === 401) {
    onUnauthorized();
    return new ApiError(401, humanizeApiError(401));
  }
  if (status === 403) return new ApiError(403, humanizeApiError(403));
  if (status === 404) return new ApiError(404, `接口不存在（${url}）`);
  if (status === 429) return new ApiError(4290, '请求过于频繁，请稍后再试');

  if (status >= 500) return new ApiError(status, `服务暂时不可用（HTTP ${status}：${url}），请稍后重试`);
  if (status >= 400) return new ApiError(status, humanizeApiError(status));
  return new ApiError(-1, `接口返回非 JSON（${url}），请检查后端是否已启动`);
}

/** 后端契约：**HTTP 状态码与 body.code 对齐**（S3-7 起） */
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
    body = data;
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


  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw statusError(res.status, url);
  }

  let json: ApiResponse<T> | undefined;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {

    throw statusError(res.status, url);
  }
  if (!json || typeof json.code !== 'number') {
    throw statusError(res.status, url);
  }
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

/** 下载文件 */
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

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
