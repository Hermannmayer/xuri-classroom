import { get, getWithPagination, post } from './request';
import type { ProjectView, SystemInfo, UserInfo } from './types';

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

/* ---------------------------------------------------------------- 项目（考试/问卷） */

export interface ProjectListQuery {
  current?: number;
  pageSize?: number;
  name?: string;
  /** 不传只返回根级；文件夹子项必须带 parentId 才会出现 */
  parentId?: string;
  mode?: 'survey' | 'exam' | 'folder';
}

export interface CreateProjectRequest {
  name: string;
  mode: 'survey' | 'exam';
  parentId?: string;
  setting?: Record<string, unknown>;
  survey?: Record<string, unknown>;
}

export const listProjects = (query: ProjectListQuery = {}) =>
  getWithPagination<ProjectView>('/api/project/list', query as Record<string, unknown>);

export const getProject = (id: string) => get<ProjectView>('/api/project', { id });

export const createProject = (data: CreateProjectRequest) => post<ProjectView>('/api/project/create', data);

/** 全量更新；只传 id+name 就是改名，带 settingKey/settingValue 就是改单项设置 */
export const updateProject = (data: Record<string, unknown>) => post<void>('/api/project/update', data);

export const deleteProject = (id: string) => post<void>('/api/project/delete', { id });
