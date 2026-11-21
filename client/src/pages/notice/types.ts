/** 公告相关的共享类型与文案映射 */
export interface NoticeView {
  id: string;
  title?: string;

  summary?: string;

  content?: string;

  type?: string;

  audience?: string;

  scopeType?: string | null;
  scopeId?: string | null;

  scopeName?: string;
  pinned?: boolean;

  requireAck?: boolean;

  status?: string;

  publishAt?: string | number;

  expireAt?: string | number | null;
  createBy?: string;

  createByName?: string;
  createAt?: string | number;
  updateAt?: string | number;

  read?: boolean;
  readAt?: string | number;

  manageable?: boolean;
}


export const NOTICE_TYPE_LABEL: Record<string, string> = {
  notice: '公告',
  system_update: '系统更新',
  ai_result: 'AI 任务',
};


export const AUDIENCE_LABEL: Record<string, string> = {
  all: '全站所有人',
  admin: '仅管理员',
  teacher: '仅老师',
  student: '仅学员',
};


export const NOTICE_STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
};

/** 类型文案；type 缺省按普通公告处理 */
export function noticeTypeText(notice: NoticeView): string {
  const type = notice.type ?? 'notice';
  return NOTICE_TYPE_LABEL[type] ?? type;
}

/** 受众文案；audience 缺省按「全站所有人」处理（后端建表默认值就是 all） */
export function noticeAudienceText(notice: NoticeView): string {
  const audience = notice.audience ?? 'all';
  return AUDIENCE_LABEL[audience] ?? audience;
}

/** 状态文案；后端没下发 status 时返回 undefined，页面据此不渲染状态标签 */
export function noticeStatusText(notice: NoticeView): string | undefined {
  if (!notice.status) return undefined;
  return NOTICE_STATUS_LABEL[notice.status] ?? notice.status;
}

/** 发布人：优先显示名，没有再退回 id */
export function noticeAuthor(notice: NoticeView): string | undefined {
  const name = (notice.createByName || notice.createBy || '').trim();
  return name || undefined;
}

/** 范围文案：全站 / 班级 xxx / 考试 xxx */
export function noticeScopeText(notice: NoticeView): string {
  const name = (notice.scopeName || notice.scopeId || '').trim();
  if (notice.scopeType === 'class') return name ? `班级：${name}` : '指定班级';
  if (notice.scopeType === 'project') return name ? `考试：${name}` : '指定考试';
  return '全站';
}









export type NoticeCategory = 'all' | 'system_update' | 'unread' | 'draft' | 'archived';


export interface NoticeCategoryDef {
  key: NoticeCategory;
  label: string;
  hint: string;
  managerOnly: boolean;
}







export type NoticeMode = 'read' | 'manage';







export type NoticeAudienceTarget = 'all' | 'admin' | 'teacher' | 'student' | 'class';


export const NOTICE_TARGET_LABEL: Record<NoticeAudienceTarget, string> = {
  all: '全站所有人',
  admin: '仅管理员',
  teacher: '仅老师',
  student: '仅学员',
  class: '指定班级',
};
