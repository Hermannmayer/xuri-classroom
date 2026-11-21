import { get } from '../api';
import type { UserInfo } from '../api';
import { PERMISSION_CODES } from './permission-codes';

















export const AUTH_CHANGED_KEY = 'sk-auth-changed';

let cache: Promise<string[]> | null = null;

export function loadAuthorities(force = false): Promise<string[]> {
  if (!cache || force) {
    cache = get<UserInfo>('/api/currentUser')
      .then((u) => u.authorityList ?? [])
      .catch(() => []);
  }
  return cache;
}

export function clearAuthorities() {
  cache = null;
}

/** 登录成功 / 登出时调用：清本页缓存，并广播给其它标签页（它们下一次 can()/RequirePerm 会重新拉） */
export function notifyAuthChanged() {
  cache = null;
  try {
    localStorage.setItem(AUTH_CHANGED_KEY, String(Date.now()));
  } catch {
    // localStorage 被禁用（隐私模式）：本页缓存已清，跨标签页失效可忽略
  }
}


if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === AUTH_CHANGED_KEY) cache = null;
  });
}

export function isAdmin(authorities: string[]) {
  return authorities.includes('ROLE_admin');
}







export const STUDENT_ONLY_PERMISSIONS = new Set<string>([
  PERMISSION_CODES.projectAnswer,
  PERMISSION_CODES.repoPractice,
  PERMISSION_CODES.repoBook,
  PERMISSION_CODES.repoQuestionsRead,
  PERMISSION_CODES.exerciseList,
  PERMISSION_CODES.portalStudent,
]);

export function can(authorities: string[], permission: string): boolean {

  if (authorities.includes(permission)) return true;

  if (STUDENT_ONLY_PERMISSIONS.has(permission)) return false;
  if (isAdmin(authorities)) return true;


  const domain = permission.split(':')[0];
  return authorities.includes(`${domain}:*`);
}
