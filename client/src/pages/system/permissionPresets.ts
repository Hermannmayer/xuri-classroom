/**
 * 权限配置页的静态元数据：预设集合、分组说明、看/改判定、菜单入口映射。
 *
 * 预设集合必须与后端种子（server/rdbms/src/main/resources/scripts/init-mysql.sql 里的
 * t_role.teacher / t_role.student）保持一致；新增权限点时先决定要不要进预设，再同步改这里。
 * 这里不查后端：后端只提供权限串、中文名、分组与说明，「看/改」与菜单归属都是约定推导。
 */

export type PresetKey = 'teacher' | 'student';

/** 老师：能配考试与题库、看答卷数据，不能进系统管理 */
export const TEACHER_PRESET: readonly string[] = [
  'project',
  'project:list',
  'project:detail',
  'project:create',
  'project:update',
  'project:delete',
  'project:report',
  'answer',
  'answer:list',
  'answer:detail',
  'answer:create',
  'answer:update',
  'answer:delete',
  'answer:export',
  'answer:upload',
  'repo',
  'repo:list',
  'repo:detail',
  'repo:create',
  'repo:update',
  'repo:delete',
  'repo:book',
  'template',
  'template:list',
  'template:create',
  'template:update',
  'template:delete',
  'exercise',
  'exercise:list',
  'file',
  'file:detail',
  'file:list',
  'file:import',
  'file:delete',
  'user:update',
  'home',
];

/** 学员：答题、练习、看题库与我的考试，没有后台管理权限 */
export const STUDENT_PRESET: readonly string[] = [
  'home',
  'exercise:list',
  'repo:list',
  'repo:detail',
  'repo:book',
  'project:list',
  'project:detail',
  'answer:list',
  'answer:detail',
  'answer:upload',
  'user:update',
];

export interface PresetMeta {
  label: string;
  /** 一句话说明这套预设能做什么，用在按钮 title 与新建角色弹窗 */
  hint: string;
  codes: readonly string[];
}

export const PRESET_META: Record<PresetKey, PresetMeta> = {
  teacher: {
    label: '老师',
    hint: '管考试、题库与答卷，不进系统管理',
    codes: TEACHER_PRESET,
  },
  student: {
    label: '学员',
    hint: '答题、练习、看题库和我的考试，不能建考试',
    codes: STUDENT_PRESET,
  },
};

export const PRESET_KEYS: PresetKey[] = ['teacher', 'student'];

/* -------------------------------------------------------------- 看 / 改 */

export type PermissionKind = 'read' | 'write' | 'basic';

export const KIND_META: Record<PermissionKind, { label: string; color: string }> = {
  read: { label: '看', color: 'blue' },
  write: { label: '改', color: 'orange' },
  basic: { label: '基础', color: 'default' },
};

/** 鼠标悬停时的解释，配合编辑区顶部的图例，避免「看/改」被误读成别的意思 */
export const KIND_HINT: Record<PermissionKind, string> = {
  read: '只读：查看、导出，不会改数据',
  write: '写操作：新增、修改、删除、导入等',
  basic: '基础能力：默认页等，不属于具体的读或写动作',
};

/** 只读动词：导出也算看 */
const READ_ACTIONS = new Set(['list', 'detail', 'book', 'report', 'export']);
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
 * - home 是登录后的默认页，不是动作；
 * - user:update 是「改自己的资料」，三个角色都应具备，标成「改」会让人误以为能改别人。
 */
const BASIC_CODES = new Set(['home', 'user:update']);

/**
 * 按权限串最后一段判断「看 / 改」。
 * 两端都不命中的（如 system:backup、content:protect、exercise:manage）归入「基础」，不强行归边。
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

/* -------------------------------------------------------------- 分组与菜单 */

/** 分组说明：后端只给组名，这里补一句「这一组管什么」，减少逐个点开才能理解的成本 */
export const GROUP_DESCRIPTIONS: Record<string, string> = {
  考试: '考试的创建、编辑、发布与报表',
  答卷: '答卷数据的查看、导出与批改',
  题库: '题库与题库内题目的维护',
  题目: '题目内容的增删改',
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
  'project:list': '我的考试',
  'exercise:list': '我的练习',
  'repo:list': '题库中心 / 题库列表',
  'repo:book': '题库中心 / 练习册',
  'system:user:list': '系统管理 / 用户管理',
  'system:dept:list': '系统管理 / 用户组',
  'system:role:list': '系统管理 / 系统设置、权限配置',
  'system:log:list': '系统管理 / 操作日志',
};
