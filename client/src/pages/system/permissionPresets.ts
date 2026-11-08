/**
 * 权限配置页的静态元数据：分组说明、看/改判定、菜单入口映射。
 *
 * 预设权限串不在这里维护：页面「从现有角色复制」直接按角色 id 取当前 authorities，
 * 不再写死 teacher/student，也不依赖学员角色的 code 是 student 还是 xueyuan。
 * 后续新增的任何角色都可以直接作为复制源。
 */

/* ------ 看 / 改 */

export type PermissionKind = 'read' | 'write' | 'basic';

export const KIND_META: Record<PermissionKind, { label: string; color: string }> = {
  read: { label: '看', color: 'blue' },
  write: { label: '改', color: 'orange' },
  basic: { label: '基础', color: 'default' },
};

/** 鼠标悬停时的解释，配合编辑区顶部的图例，避免「看/改」被误读成别的动作 */
export const KIND_HINT: Record<PermissionKind, string> = {
  read: '只读：查看、导出，不会改数据',
  write: '写操作：新增、修改、删除、导入等',
  basic: '基础能力：默认页等，不属于具体的读或写动作',
};

/** 只读动词：导出也算看 */
const READ_ACTIONS = new Set(['list', 'detail', 'book', 'report', 'export', 'read']);
/** 写动词 */
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
]);
/**
 * 这些串整体是「基础能力」，最后一个词恰好会命中上面的动词表：
 * - user:update 是「改自己的资料」，三个角色都应具备，标成「改」会让人误以为能改别人。
 */
const BASIC_CODES = new Set(['user:update']);

/**
 * 按权限串最后一段判断「看 / 改」。
 * 两端都不命中的（如 content:protect、updatePosition、system:dictItem:import）归入「基础」，不强行归边。
 * updatePosition 这类复合动作按动词前缀兜底，避免把写操作显示成「基础」。
 */
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

/* ------ 分组与菜单 */

/** 分组说明：后端只给组名，这里补一句「这一组管什么」，减少逐个点开才能理解的成本 */
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

/**
 * 权限点 → 前端菜单入口（静态映射，不查后端）。
 * 只列真正会决定菜单是否出现的权限；没有列出的说明它影响的是按钮或接口，不是菜单。
 */
export const PERMISSION_MENU: Record<string, string> = {
  'project:list': '我的考试 / 教学管理',
  'project:answer': '我的任务 / 开始答题',
  'exercise:list': '我的练习',
  'repo:list': '题库中心 / 题库列表',
  'repo:book': '题库中心 / 练习册',
  'repo:questions:read': '题库中心 / 题库题目',
  'repo:practice': '题库中心 / 开始练习',
  'class:list': '班级管理',
  'class:grant': '班级管理 / 分配老师',
  'system:user:list': '系统管理 / 用户管理',
  'system:dept:list': '系统管理 / 用户组（有班级管理时合并）',
  'system:role:list': '系统管理 / 系统设置、权限配置',
  'system:log:list': '系统管理 / 操作日志',
};
