import { PERMISSION_CODES } from '../../auth/permission-codes';











export type PermissionKind = 'read' | 'write' | 'basic';

export const KIND_META: Record<PermissionKind, { label: string; color: string }> = {
  read: { label: '看', color: 'blue' },
  write: { label: '改', color: 'orange' },
  basic: { label: '基础', color: 'default' },
};


export const KIND_HINT: Record<PermissionKind, string> = {
  read: '只读：查看、导出，不会改数据',
  write: '写操作：新增、修改、删除、导入等',
  basic: '基础能力：默认页等，不属于具体的读或写动作',
};


const READ_ACTIONS = new Set(['list', 'detail', 'book', 'report', 'export', 'read']);

const WRITE_ACTIONS = new Set([
  'create',
  'update',
  'delete',
  'import',
  'upload',
  'audit',
  'grant',
  'publish',
  'partner',
  'restore',
  'register',
  'approve',
  'assign',
]);




const BASIC_CODES = new Set<string>([PERMISSION_CODES.userUpdate]);

/** 按权限串最后一段判断「看 / 改」 */
export function permissionKind(code: string): PermissionKind {
  if (BASIC_CODES.has(code)) return 'basic';
  const action = code.split(':').pop() ?? code;
  if (READ_ACTIONS.has(action)) return 'read';
  if (WRITE_ACTIONS.has(action)) return 'write';
  for (const verb of WRITE_ACTIONS) {
    if (action.startsWith(verb)) return 'write';
  }
  for (const verb of READ_ACTIONS) {
    if (action.startsWith(verb)) return 'read';
  }
  return 'basic';
}




export const GROUP_DESCRIPTIONS: Record<string, string> = {
  考试: '考试的创建、编辑、发布与报表',
  答卷: '答卷数据的查看、导出与批改',
  题库: '题库与题库内题目的维护',
  题目: '题目内容的增删改',
  班级: '班级成员、任课老师与班级归属',
  练习: '练习记录与学员练习入口',
  文件: '附件上传、预览与删除',
  用户: '本人资料，以及用户数据的导入导出',
  系统: '用户、角色、用户组与系统设置',
  内容保护: '全站水印与防复制策略',
  其它: '默认页等零散权限',
};





export const PERMISSION_MENU: Record<string, string> = {
  [PERMISSION_CODES.projectList]: '我的考试 / 教学管理',
  [PERMISSION_CODES.projectAnswer]: '我的任务 / 开始答题',
  [PERMISSION_CODES.exerciseList]: '我的练习',
  [PERMISSION_CODES.repoList]: '题库中心 / 题库列表',
  [PERMISSION_CODES.repoBook]: '题库中心 / 练习册',
  [PERMISSION_CODES.repoQuestionsRead]: '题库中心 / 题库题目',
  [PERMISSION_CODES.repoPractice]: '题库中心 / 开始练习',
  [PERMISSION_CODES.classList]: '班级管理',
  [PERMISSION_CODES.classGrant]: '班级管理 / 分配老师',
  [PERMISSION_CODES.classRegister]: '班级管理 / 班级设置 / 开放注册',
  [PERMISSION_CODES.classMemberApprove]: '班级管理 / 待审核学员',
  [PERMISSION_CODES.classMemberAssign]: '班级管理 / 成员 / 班级归属',
  [PERMISSION_CODES.systemUserList]: '系统管理 / 用户管理',
  [PERMISSION_CODES.systemDeptList]: '系统管理 / 用户组（有班级管理时合并）',
  [PERMISSION_CODES.systemRoleList]: '系统管理 / 系统设置、权限配置',
  [PERMISSION_CODES.systemLogList]: '系统管理 / 操作日志',
};








export const FRONTEND_ONLY_CODES = new Set<string>([
  PERMISSION_CODES.portalAdmin,
  PERMISSION_CODES.portalStudent,
  PERMISSION_CODES.portalTeacher,
  PERMISSION_CODES.projectAnswer,
  PERMISSION_CODES.repoPractice,
]);
