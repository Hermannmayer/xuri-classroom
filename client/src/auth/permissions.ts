import { get } from '../api';
import type { UserInfo } from '../api';

/**
 * 权限模型（后端 authorityList 驱动）：
 * - 管理员：ROLE_admin，全权限
 * - 老师：project:* + answer:* + repo:* + exercise:list（能配考试/题库/看数据，不能进系统管理）
 * - 学生：exercise:list + repo:list/detail + user:update（练习、看题库、改自己资料）
 *
 * can() 规则：ROLE_admin 直接放行；否则要求权限串命中（精确或同域前缀）。
 */
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

export function isAdmin(authorities: string[]) {
  return authorities.includes('ROLE_admin');
}

export function can(authorities: string[], permission: string): boolean {
  if (isAdmin(authorities)) return true;
  // 只认精确权限或该域的显式通配符（repo:*）。
  // 不能用前缀匹配：学员的 repo:list 会误放行 repo:create / repo:delete。
  const domain = permission.split(':')[0];
  return authorities.includes(permission) || authorities.includes(`${domain}:*`);
}
