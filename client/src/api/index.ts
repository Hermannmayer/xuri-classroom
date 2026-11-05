import { get, post } from './request';
import type { SystemInfo, UserInfo } from './types';

export * from './types';
export { ApiError, get, post, getWithPagination, download, setUnauthorizedHandler } from './request';

export const getSystem = () => get<SystemInfo>('/api/system');

export interface LoginRequest {
  username: string;
  password: string;
  captchaVerification?: string;
  authType?: string;
}

/** 成功时只有 Set-Cookie，没有响应体 */
export const login = (data: LoginRequest) => post<null>('/api/public/login', data);
export const logout = () => post<null>('/api/public/logout');
export const getCurrentUser = () => get<UserInfo>('/api/currentUser');
