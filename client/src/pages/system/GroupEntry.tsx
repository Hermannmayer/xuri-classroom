import SystemGroup from './Group';

/**
 * 用户组入口：用户组是教职工（老师/管理员）的组织与角色，和班级（学员教学单位）是两套页面。
 * 这里始终渲染用户组页，不再重定向到班级管理。
 */
export default function GroupEntry() {
  return <SystemGroup />;
}
