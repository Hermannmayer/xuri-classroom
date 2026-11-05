import { message } from 'antd';
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
    throw new ApiError(-1, `接口返回非 JSON（${url}），请检查后端是否已启动`);
  }

  const json = (await res.json()) as ApiResponse<T>;
  switch (json.code) {
    case 200:
      return json.data;
    case 401:
      onUnauthorized();
      throw new ApiError(401, json.message);
    case 403:
      message.error('未授权访问');
      throw new ApiError(403, json.message);
    default:
      throw new ApiError(json.code, json.message || `操作失败 (${json.code})`);
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

export async function download(url: string, params?: Record<string, unknown>, fallbackName = 'download') {
  const res = await fetch(url + qs(params), { credentials: 'include' });
  if (!res.ok) throw new ApiError(res.status, '下载失败');
  const blob = await res.blob();
  const name = fileNameFromDisposition(res.headers.get('content-disposition') || '', fallbackName);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
