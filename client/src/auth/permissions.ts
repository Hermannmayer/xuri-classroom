import { get } from '../api';
import type { UserInfo } from '../api';

/**
 * 权限模型（后端 authorityList 驱动）：
 * - 管理员：ROLE_admin，管理权限全集（不含学员专属能力）
 * - 老师：教学/题库/答卷管理 + 班级管理，不含学员专属能力
 * - 学生：repo:list/book/practice、project:answer、exercise:list、user:update
 *
 * can() 规则：
 * - 学员专属（开始答题/开始练习/错题本/学员视角）必须精确命中，ROLE_admin 不放行；
 * - 其它权限：ROLE_admin 直接放行，否则要求精确串或同域通配符（repo:*）。
 *
 * 缓存生命周期（2026-11 修复）：
 * - 模块级缓存只在同一个登录态内复用；
 * - 登录成功 / 登出都必须调用 notifyAuthChanged() 清掉，否则「管理员登出 → 学员登录」
 *   这种同标签页切换会继续用上一个人的 authorityList（RequirePerm / can() 都会误放行）；
 * - 其它标签页通过 storage 事件同步失效（localStorage 写入不会在写的那一页触发事件）。
 */
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

// 其它标签页登录/登出：清掉本页缓存，下次 RequirePerm / 页面里的 can() 重新请求
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === AUTH_CHANGED_KEY) cache = null;
  });
}

export function isAdmin(authorities: string[]) {
  return authorities.includes('ROLE_admin');
}

/**
 * 学员专属能力：不是管理权限，管理员不会自动拥有。
 *
 * <p>必须和后端 PermissionEnum 里 studentOnly=true 的条目保持一致；
 * 这里不能让 ROLE_admin 兜底，否则「管理员界面出现开始答题」永远修不掉。
 */
export const STUDENT_ONLY_PERMISSIONS = new Set([
  'project:answer',
  'repo:practice',
  'repo:book',
  'repo:questions:read',
  'portal:student',
]);

export function can(authorities: string[], permission: string): boolean {
  // 精确命中优先：学生 / 显式勾选学员能力的自定义角色
  if (authorities.includes(permission)) return true;
  // 学员专属不再走 ROLE_admin / 域通配符兜底
  if (STUDENT_ONLY_PERMISSIONS.has(permission)) return false;
  if (isAdmin(authorities)) return true;
  // 其它权限只认精确串或该域的显式通配符（repo:*）。
  // 不能用前缀匹配：学员的 repo:list 会误放行 repo:create / repo:delete。
  const domain = permission.split(':')[0];
  return authorities.includes(`${domain}:*`);
}
