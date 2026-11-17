/**
 * 公告相关的共享类型与文案映射。
 *
 * <p>字段对齐后端 NoticeView（server/shared/.../domain/dto/NoticeView.java）与实施计划 4.2 的 t_notice：
 * audience = all / admin / teacher / student，scopeType = null（全站）/ class（某个班），
 * status = draft / published / archived，type = notice / system_update / ai_result。
 *
 * <p>几条来自后端契约（p2-backend 2026-11-17）的要点，改字段前先看这里：
 * - 列表接口**不下发 content**，只给 summary（120 字纯文本），要全文必须走详情接口；
 * - publishAt / expireAt / createAt / readAt 都是 Date，JSON 里是 **epoch 毫秒数字**；
 * - read / manageable 是后端按「当前登录用户」算好的，前端不要自己再推断一遍；
 * - Jackson 不返回空值，字段缺失是正常情况，页面要能降级显示而不是渲染出 undefined。
 */
export interface NoticeView {
  id: string;
  title?: string;
  /** 列表预览用的纯文本摘要（120 字内），列表接口只给这个 */
  summary?: string;
  /** 正文富文本（已服务端消毒）；只有详情接口返回，前端渲染前 RichTextContent 还会再消毒一次 */
  content?: string;
  /** notice 普通公告 / system_update 检查更新自动生成 / ai_result AI 任务完成 */
  type?: string;
  /** all / admin / teacher / student */
  audience?: string;
  /** null = 全站 / class = 某个班 / project = 预留（后端暂不接受写入） */
  scopeType?: string | null;
  scopeId?: string | null;
  /** 范围名称：scopeType=class 时是班级名，列表直接展示 */
  scopeName?: string;
  pinned?: boolean;
  /** 是否要求已读回执（4.3：管理员公告可以要求，班级公告一般不要求） */
  requireAck?: boolean;
  /** draft / published / archived */
  status?: string;
  /** 发布时间：epoch 毫秒 */
  publishAt?: string | number;
  /** 过期时间：epoch 毫秒，空 = 长期有效 */
  expireAt?: string | number | null;
  createBy?: string;
  /** 发布人显示名（后端补的，优先于 createBy 的 id） */
  createByName?: string;
  createAt?: string | number;
  updateAt?: string | number;
  /** 当前用户是否已读 */
  read?: boolean;
  readAt?: string | number;
  /** 当前用户能否编辑 / 发布 / 归档 / 删除这条公告（后端算好的，前端直接照着渲染按钮） */
  manageable?: boolean;
}

/** 公告类型文案：type 是后端固定枚举，未知值原样显示，便于排查 */
export const NOTICE_TYPE_LABEL: Record<string, string> = {
  notice: '公告',
  system_update: '系统更新',
  ai_result: 'AI 任务',
};

/** 受众文案（4.4：受众可选 all / admin / teacher / student） */
export const AUDIENCE_LABEL: Record<string, string> = {
  all: '全站所有人',
  admin: '仅管理员',
  teacher: '仅老师',
  student: '仅学员',
};

/** 状态文案：草稿只有写公告的人能看到，已归档不再出现在默认列表里（4.7） */
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

/**
 * 列表分类。
 *
 * <p>「全部 / 系统更新 / 未读」是 4.6 要求的三个；草稿与已归档只对 notice:manage:* 显示：
 * 后端 create 只落草稿、默认列表只回已发布（NoticeServiceImpl#visibleQuery），
 * 没有「草稿」分类的话，刚保存的草稿会凭空消失；同样，归档后想找回也得有个入口。
 */
export type NoticeCategory = 'all' | 'system_update' | 'unread' | 'draft' | 'archived';

/** 分类定义：managerOnly 的分类只给持 notice:manage:* 的人看 */
export interface NoticeCategoryDef {
  key: NoticeCategory;
  label: string;
  hint: string;
  managerOnly: boolean;
}
