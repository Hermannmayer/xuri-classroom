import { get, post } from './request';



















export interface ApiTokenView {
  id: string;

  name?: string;

  userId?: string;

  userName?: string;




  tokenPrefix?: string;

  tokenSuffix?: string;

  maskedToken?: string;

  scopes?: string | null;

  expiresAt?: string | null;

  lastUsedAt?: string | null;

  revoked?: boolean;
  createAt?: string;
}


export interface CreateApiTokenRequest {
  name: string;




  expiresAt?: string;

  scopes?: string;
}


export interface CreateApiTokenResult extends ApiTokenView {
  token?: string;
}

/** 令牌列表（明文只在签发时给，这里只有哈希指纹） */
export const listApiTokens = async (): Promise<ApiTokenView[]> =>
  (await get<ApiTokenView[]>('/api/system/api-token')) ?? [];

/** 签发：拿到的 token 是明文，调用方必须立刻展示给用户并提示只显示一次 */
export const createApiToken = (data: CreateApiTokenRequest) =>
  post<CreateApiTokenResult>('/api/system/api-token', data);

/** 撤销：按 id 撤销（不是删记录，撤销后仍留在列表里供追溯） */
export const revokeApiToken = (id: string) => post<void>('/api/system/api-token/revoke', { id });
