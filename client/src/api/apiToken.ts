import { get, post } from './request';

/**
 * MCP / API 访问令牌的接口层（P5 · 计划文档 §7.3）。
 *
 * 契约以后端 `ApiTokenApi.java` 为准；前端只从这里调，字段名变动只改这一个文件
 * （与 api/ai.ts、api/import.ts 一个套路），别把裸串散落在页面里。
 *
 * - GET  /api/system/api-token          data 直接是 ApiTokenView 数组（**不含明文**）
 * - POST /api/system/api-token          签发：响应比列表多一个 `token` 明文，只此一次
 * - POST /api/system/api-token/revoke   撤销：请求 { id }，data 为 null；撤销后立刻 401
 *
 * 三个接口的权限都是 system:setting:update（后端写法：hasRole('admin') or hasAuthority(...)）；
 * 页面据此门控，没有权限时干脆不发请求，避免一进设置页就弹 403。
 *
 * 另外后端全局 Jackson 配了 non_null：值为 null 的字段整个不返回，所以这里字段一律可选，
 * 「缺省」只表示「没有值」，不代表 false。
 */

/** 一条令牌的列表视图：明文只在签发那一刻返回，这里最多只有首尾各 4 位 */
export interface ApiTokenView {
  id: string;
  /** 给用户辨认用，如「Claude Desktop」「我的脚本」 */
  name?: string;
  /** 按哪个用户签发：MCP 调用的权限就是它的权限 */
  userId?: string;
  /** 签发用户显示名；解析不到时后端不返回，页面回落成 userId */
  userName?: string;
  /** 明文前 4 位 */
  tokenPrefix?: string;
  /** 明文后 4 位 */
  tokenSuffix?: string;
  /** 后端拼好的掩码（如 `ab12****cd34`）：页面优先用这个 */
  maskedToken?: string;
  /** 逗号分隔的工具白名单；不返回 / 空串 = 按签发用户的权限 */
  scopes?: string | null;
  /** 过期时间 `yyyy-MM-dd HH:mm:ss`（GMT+8）；不返回 = 永不过期 */
  expiresAt?: string | null;
  /** 最近一次被 MCP 调用用到的时间；从未用过不返回 */
  lastUsedAt?: string | null;
  /** 已撤销：记录保留便于追溯，但不能再鉴权 */
  revoked?: boolean;
  createAt?: string;
}

/** 签发请求：名称必填；expiresAt / scopes 都可以不传 */
export interface CreateApiTokenRequest {
  name: string;
  /**
   * 过期时间，`yyyy-MM-dd HH:mm:ss`（与全局 date-format 一致；后端也兼容 ISO 的 T 分隔）。
   * 不传 = 永不过期。
   */
  expiresAt?: string;
  /** 逗号分隔的工具白名单；不传 = 按签发用户的权限放行全部工具 */
  scopes?: string;
}

/** 签发结果：在列表视图之外多一个 `token` —— 明文只在这里出现这一次 */
export interface CreateApiTokenResult extends ApiTokenView {
  token?: string;
}

/** 令牌列表（明文只在签发时给，这里只有掩码） */
export const listApiTokens = async (): Promise<ApiTokenView[]> =>
  (await get<ApiTokenView[]>('/api/system/api-token')) ?? [];

/** 签发：拿到的 token 是明文，调用方必须立刻展示给用户并提示只显示一次 */
export const createApiToken = (data: CreateApiTokenRequest) =>
  post<CreateApiTokenResult>('/api/system/api-token', data);

/** 撤销：按 id 撤销（不是删记录，撤销后仍留在列表里供追溯） */
export const revokeApiToken = (id: string) => post<void>('/api/system/api-token/revoke', { id });
