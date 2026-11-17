import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Alert, App, Badge, Button, Empty, Pagination, Popconfirm, Spin, Tag } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { get, post } from '../../api';
import { can, loadAuthorities } from '../../auth/permissions';
import { PERMISSION_CODES } from '../../auth/permission-codes';
import LinkAction from '../../components/LinkAction';
import RichTextContent from '../../components/RichTextContent';
import NoticeEditor from './NoticeEditor';
import { notifyNoticeUnreadChanged } from './events';
import {
  noticeAudienceText,
  noticeAuthor,
  noticeScopeText,
  noticeStatusText,
  noticeTypeText,
  type NoticeCategory,
  type NoticeCategoryDef,
  type NoticeView,
} from './types';

/** 每页条数：公告通常标题短、条数少，10 条一页够看 */
const PAGE_SIZE = 10;

/**
 * 左栏分类：4.6 要求的是「全部 / 系统更新 / 未读」，草稿与已归档只给 notice:manage:* 看。
 *
 * <p>为什么多这两个：后端 create 只落草稿、列表默认只回已发布（NoticeServiceImpl#visibleQuery），
 * 没有「草稿」分类的话刚保存的草稿会凭空消失；归档同理，得留一个能找回来的入口（重新发布会回到已发布）。
 */
const CATEGORIES: NoticeCategoryDef[] = [
  { key: 'all', label: '全部公告', hint: '我能看到的全部已发布公告，置顶在前', managerOnly: false },
  { key: 'system_update', label: '系统更新', hint: '检查更新发现新版本时自动生成的系统公告', managerOnly: false },
  { key: 'unread', label: '未读', hint: '只显示我还没读过的公告', managerOnly: false },
  { key: 'draft', label: '草稿', hint: '新建公告先落草稿，确认无误后再发布', managerOnly: true },
  { key: 'archived', label: '已归档', hint: '归档后不再出现在列表里，可在这里重新发布', managerOnly: true },
];

/** 三栏等高：每栏自己滚动，页面不至于被几十条公告拉得很长 */
const PANEL_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  height: 'clamp(360px, calc(100vh - 340px), 860px)',
  overflow: 'hidden',
};

const PANEL_HEAD_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  padding: '9px 12px',
  borderBottom: '1px dashed var(--bp-line)',
};

const PANEL_BODY_STYLE: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: '8px 10px 12px',
};

const MUTED_STYLE: CSSProperties = {
  fontSize: 11,
  color: 'var(--bp-text-soft)',
};

/** 列表项：整块可点，选中项用橙色边 + 浅橙底，和权限页的角色卡同一套视觉 */
const ITEM_STYLE: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  font: 'inherit',
  color: 'inherit',
  cursor: 'pointer',
  padding: '9px 10px',
  marginBottom: 6,
};

/** 左栏分类按钮：与列表项同一套选中样式，但更矮 */
const CATEGORY_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '8px 10px',
  marginBottom: 6,
  cursor: 'pointer',
  font: 'inherit',
  color: 'inherit',
  textAlign: 'left',
};

/** 与其它列表接口一致：{ total, list }；后端直接返回数组时也兼容 */
interface NoticeListResponse {
  total?: number;
  list?: NoticeView[];
}

/** 后端时间字段是 epoch 毫秒（Date → JSON 数字）；解析不了就原样显示，不要显示 1970 */
function fmtTime(value?: string | number): string {
  if (value === null || value === undefined || value === '') return '—';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm') : String(value);
}

/**
 * 公告中心（/notice）：左分类、右列表 + 详情（实施计划 4.6）。
 *
 * <p>数据全走 4.5 的接口（后端实现见 NoticeApi.java / NoticeServiceImpl）：
 * - GET /api/notice/list?current=&pageSize=&onlyUnread=&type=&status=
 *   列表行不含 content，只给 summary；默认只回「已发布且在有效期内」，
 *   status=draft / archived 只有持 notice:manage:* 的人传才生效；
 * - GET /api/notice/unread-count
 * - GET /api/notice?id=（详情顺带 mark read，并回读 read=true）
 * - POST /api/notice/read  body { ids }
 * - POST /api/notice/create | update | publish | archive | delete
 *
 * <p>写操作的入口只对 notice:manage:* 显示，具体某一条能不能改则看后端算好的
 * NoticeView.manageable（老师只能改自己创建的班级公告）。
 *
 * <p>「系统更新」分类把 type=system_update 传给后端做服务端过滤；返回后再本地筛一遍，
 * 保证这个分类里永远不会混进普通公告（缓存脏数据 / 后端回归时的双保险）。
 */
export default function NoticeCenter() {
  const { message, modal } = App.useApp();
  const [category, setCategory] = useState<NoticeCategory>('all');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<NoticeView[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string>();
  const [unread, setUnread] = useState<number>();

  const [activeId, setActiveId] = useState<string>();
  const [detail, setDetail] = useState<NoticeView>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>();
  /** 本次会话里已经读掉的公告：列表里立刻显示成已读，不用等下次刷新 */
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const [editorOpen, setEditorOpen] = useState(false);
  /** 编辑对象：undefined = 新建 */
  const [editing, setEditing] = useState<NoticeView>();
  const [markingRead, setMarkingRead] = useState(false);

  /** 权限列表：没回来之前不渲染写入口，也不发写请求 */
  const [authorities, setAuthorities] = useState<string[]>([]);
  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);

  // notice:manage:system 管全站/按角色，notice:manage:class 只管班级（4.3 / 4.4）
  const canManageSystem = can(authorities, PERMISSION_CODES.noticeManageSystem);
  const canManageClass = can(authorities, PERMISSION_CODES.noticeManageClass);
  const canManage = canManageSystem || canManageClass;
  /**
   * 左栏可见分类：
   * - 系统更新：这类公告的受众固定是 admin（NoticeServiceImpl#recordSystemUpdate），
   *   非管理员点进去永远是空的，干脆不显示；
   * - 草稿 / 已归档：只有持 notice:manage:* 的人才有意义。
   */
  const categories = useMemo(
    () =>
      CATEGORIES.filter((item) => {
        if (item.key === 'system_update') return canManageSystem;
        return !item.managerOnly || canManage;
      }),
    [canManage, canManageSystem],
  );

  /** 详情接口的并发保护：连点两条公告时只认最后一次的结果 */
  const detailSeq = useRef(0);

  const loadUnread = useCallback(async () => {
    try {
      const res = await get<{ count?: number }>('/api/notice/unread-count');
      const count = Number(res?.count ?? 0);
      setUnread(Number.isFinite(count) && count > 0 ? count : 0);
    } catch {
      // 未读数拿不到不影响看公告，顶栏铃铛同理，保持 undefined/上一次的值
    }
  }, []);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(undefined);
    try {
      const res = await get<NoticeListResponse | NoticeView[]>('/api/notice/list', {
        current: page,
        pageSize: PAGE_SIZE,
        onlyUnread: category === 'unread' ? true : undefined,
        // 后端已支持 type 过滤（p2-backend 契约）
        type: category === 'system_update' ? 'system_update' : undefined,
        // 默认只回已发布：草稿 / 已归档必须显式传 status，且只对持 notice:manage:* 的人生效
        status: category === 'draft' || category === 'archived' ? category : undefined,
      });
      const list = Array.isArray(res) ? res : (res?.list ?? []);
      const serverTotal = Array.isArray(res) ? list.length : Number(res?.total ?? list.length);
      const filtered =
        category === 'system_update' ? list.filter((item) => item.type === 'system_update') : list;
      setRows(filtered);
      setTotal(Number.isFinite(serverTotal) ? serverTotal : filtered.length);
      // 归档/删除掉本页最后一条时自动退回上一页，避免停在空白页
      if (filtered.length === 0 && serverTotal > 0 && page > 1) {
        setPage((prev) => Math.max(1, prev - 1));
      }
    } catch (e) {
      setRows([]);
      setTotal(0);
      setListError((e as Error).message || '读取公告列表失败');
    } finally {
      setListLoading(false);
    }
  }, [category, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadUnread();
  }, [loadUnread]);

  const refresh = useCallback(async () => {
    await Promise.all([loadList(), loadUnread()]);
  }, [loadList, loadUnread]);

  /**
   * 读详情：4.5 规定这个接口顺带 mark read，所以打开即已读。
   * markRead=false 用于「编辑/发布后回读」，那次不该重复广播未读数变化。
   */
  const loadDetail = useCallback(
    async (id: string, markRead: boolean) => {
      const seq = ++detailSeq.current;
      setDetailLoading(true);
      setDetailError(undefined);
      try {
        const res = await get<NoticeView>('/api/notice', { id });
        if (detailSeq.current !== seq) return;
        if (!res || !res.id) throw new Error('公告不存在或已被删除');
        setDetail(res);
        setRows((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
        if (markRead) {
          setReadIds((prev) => {
            if (prev.has(id)) return prev;
            const next = new Set(prev);
            next.add(id);
            return next;
          });
          /**
           * 4.5 是「详情接口顺带 mark read」，NoticeApi.java 的 detail 也会强制回读 read=true，
           * 所以正常情况下这里不用再打一次写请求。只有后端回读仍是未读时才补一次批量已读
           * （t_notice_read 有 uk_notice_read 唯一键，重复标记是幂等的），失败也不打扰用户。
           */
          if (res.read === false) {
            void post('/api/notice/read', { ids: [id] }).catch(() => undefined);
          }
          void loadUnread();
          // 顶栏铃铛靠这个事件立即刷新，不用等 60 秒轮询
          notifyNoticeUnreadChanged();
        }
      } catch (e) {
        if (detailSeq.current !== seq) return;
        setDetail(undefined);
        setDetailError((e as Error).message || '读取公告详情失败');
      } finally {
        if (detailSeq.current === seq) setDetailLoading(false);
      }
    },
    [loadUnread],
  );

  const openNotice = (row: NoticeView) => {
    setActiveId(row.id);
    setDetail(undefined);
    void loadDetail(row.id, true);
  };

  const changeCategory = (next: NoticeCategory) => {
    if (next === category) return;
    setCategory(next);
    setPage(1);
    // 换分类时清空详情，避免右边还挂着上一条（它可能已经不在新列表里）
    setActiveId(undefined);
    setDetail(undefined);
    setDetailError(undefined);
  };

  /**
   * 未读判定：优先用后端下发的 read 字段；
   * 后端没给时，「未读」分类里的一律算未读（这个分类本身就是服务端按未读筛出来的）。
   */
  const isUnread = (notice: NoticeView) => {
    if (readIds.has(notice.id)) return false;
    if (typeof notice.read === 'boolean') return !notice.read;
    if (notice.readAt) return false;
    return category === 'unread';
  };

  const unreadIds = useMemo(
    () => rows.filter((row) => isUnread(row)).map((row) => row.id),
    // isUnread 依赖 readIds 与 category，这里直接用它们做依赖
    [rows, readIds, category],
  );

  /** 把当前列表里的未读一次性标掉：走 4.5 的 POST /api/notice/read */
  const markAllRead = async () => {
    if (unreadIds.length === 0 || markingRead) return;
    setMarkingRead(true);
    try {
      await post('/api/notice/read', { ids: unreadIds });
      setReadIds((prev) => {
        const next = new Set(prev);
        unreadIds.forEach((id) => next.add(id));
        return next;
      });
      setRows((prev) => prev.map((row) => (unreadIds.includes(row.id) ? { ...row, read: true } : row)));
      await loadUnread();
      notifyNoticeUnreadChanged();
      message.success(`已标记 ${unreadIds.length} 条为已读`);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setMarkingRead(false);
    }
  };

  /**
   * 能不能改这条公告：优先后端按当前用户算好的 manageable（NoticeServiceImpl#canManage）——
   * 老师只能改「自己创建的班级公告」，只看权限点会多显示按钮、点下去 403；
   * 后端没下发该字段时再按权限点兜底。
   */
  const canEdit = (notice: NoticeView) => {
    if (typeof notice.manageable === 'boolean') return notice.manageable;
    return notice.scopeType === 'class' ? canManageClass : canManageSystem;
  };

  const publishNotice = async (notice: NoticeView) => {
    try {
      await post('/api/notice/publish', { id: notice.id });
      message.success(notice.status === 'archived' ? '已重新发布' : '已发布');
      await refresh();
      await loadDetail(notice.id, false);
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const archiveNotice = async (notice: NoticeView) => {
    try {
      await post('/api/notice/archive', { id: notice.id });
      message.success('已归档，可在「已归档」分类里重新发布');
      if (activeId === notice.id) {
        setActiveId(undefined);
        setDetail(undefined);
      }
      await refresh();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const deleteNotice = async (notice: NoticeView) => {
    try {
      await post('/api/notice/delete', { id: notice.id });
      message.success('已删除');
      if (activeId === notice.id) {
        setActiveId(undefined);
        setDetail(undefined);
      }
      await refresh();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const confirmDelete = (notice: NoticeView) => {
    modal.confirm({
      title: '删除这条公告？',
      content: '删除后师生都看不到，且不会再出现在公告中心。只是暂时不想让它出现，可以用「归档」。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => deleteNotice(notice),
    });
  };

  const openCreate = () => {
    setEditing(undefined);
    setEditorOpen(true);
  };

  const openEdit = (notice: NoticeView) => {
    setEditing(notice);
    setEditorOpen(true);
  };

  /**
   * 保存成功：刷新列表；编辑过的那条回读一次，保证右边是新正文。
   *
   * <p>新建公告只落草稿（后端 create 不发布），而默认列表只回已发布，
   * 所以「存成草稿」之后直接把左栏切到「草稿」，不然用户会以为没保存上。
   */
  const handleSaved = async (publish: boolean) => {
    const editedId = editing?.id;
    setEditorOpen(false);
    if (!publish && !editedId && category !== 'draft') {
      // 切分类会触发列表 effect，这里只需要把未读数补上
      setCategory('draft');
      setPage(1);
      await loadUnread();
      return;
    }
    await refresh();
    if (editedId) await loadDetail(editedId, false);
  };

  const activeCategory = categories.find((item) => item.key === category) ?? categories[0];

  return (
    <div>
      {/* 页头：标题 + 说明 + 刷新 / 写公告 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
            NOTICE / 公告中心
          </div>
          <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
            通知公告
          </div>
          <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginTop: 4 }}>
            {unread !== undefined && unread > 0
              ? `还有 ${unread} 条未读；打开详情即视为已读，顶栏铃铛会同步更新。`
              : '打开详情即视为已读；管理员公告按受众过滤，班级公告只有该班师生能看到。'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button size="small" icon={<ReloadOutlined />} loading={listLoading} onClick={() => void refresh()}>
            刷新
          </Button>
          {canManage && (
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              写公告
            </Button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' }}>
        {/* 左栏：分类 */}
        <div className="bp-card" style={{ ...PANEL_STYLE, flex: '0 0 190px', minWidth: 156 }}>
          <div style={PANEL_HEAD_STYLE}>
            <span className="bp-title" style={{ fontSize: 13 }}>
              分类
            </span>
          </div>
          <div style={{ ...PANEL_BODY_STYLE, padding: '8px 8px 12px' }}>
            {categories.map((item) => {
              const selected = item.key === category;
              return (
                <button
                  key={item.key}
                  type="button"
                  title={item.hint}
                  aria-pressed={selected}
                  onClick={() => changeCategory(item.key)}
                  style={{
                    ...CATEGORY_STYLE,
                    border: `1px solid ${selected ? 'var(--bp-orange)' : 'transparent'}`,
                    background: selected ? 'var(--bp-orange-tint)' : 'transparent',
                  }}
                >
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.key === 'unread' && unread ? (
                    <Badge count={unread} size="small" overflowCount={99} />
                  ) : null}
                </button>
              );
            })}
            <div style={{ ...MUTED_STYLE, marginTop: 10, lineHeight: 1.7 }}>
              系统更新类公告由「系统设置 → 检查更新」自动生成，管理员可在这里归档。
            </div>
          </div>
        </div>

        {/* 中栏：列表 */}
        <div className="bp-card" style={{ ...PANEL_STYLE, flex: '2 1 calc(34% - 8px)', minWidth: 260 }}>
          <div style={PANEL_HEAD_STYLE}>
            <span className="bp-title" style={{ fontSize: 13 }}>
              {activeCategory.label}
            </span>
            <span style={MUTED_STYLE}>
              {rows.length} / {total}
            </span>
            <div style={{ marginLeft: 'auto' }}>
              {unreadIds.length > 0 && (
                <LinkAction
                  style={{ fontSize: 11 }}
                  aria-label="把当前列表里的公告全部标为已读"
                  onClick={() => void markAllRead()}
                >
                  {markingRead ? '处理中…' : `全部已读（${unreadIds.length}）`}
                </LinkAction>
              )}
            </div>
          </div>
          <div style={PANEL_BODY_STYLE}>
            {listLoading ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <Spin />
              </div>
            ) : listError ? (
              <Alert type="error" showIcon message={listError} />
            ) : rows.length === 0 ? (
              <div style={{ padding: '36px 8px' }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                      {category === 'unread'
                        ? '没有未读公告，全部看过了'
                        : category === 'system_update'
                          ? '还没有系统更新公告；检查更新发现新版本时会自动生成'
                          : category === 'draft'
                            ? '没有草稿。新建公告会先落草稿，确认后再发布'
                            : category === 'archived'
                              ? '没有已归档的公告'
                              : '暂时没有公告'}
                    </span>
                  }
                />
              </div>
            ) : (
              rows.map((row) => {
                const unreadRow = isUnread(row);
                const selected = row.id === activeId;
                return (
                  <button
                    key={row.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => openNotice(row)}
                    style={{
                      ...ITEM_STYLE,
                      border: `1px solid ${selected ? 'var(--bp-orange)' : 'transparent'}`,
                      background: selected ? 'var(--bp-orange-tint)' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      {/* 小橙点只是视觉提示，未读状态用读屏可读的文字交代 */}
                      {unreadRow && <span className="sk-sr-only">未读</span>}
                      {unreadRow && (
                        <span
                          aria-hidden="true"
                          title="未读"
                          style={{ width: 6, height: 6, flex: '0 0 auto', background: 'var(--bp-orange)' }}
                        />
                      )}
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: 13,
                          fontWeight: unreadRow ? 600 : 400,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.title || '（无标题）'}
                      </span>
                    </div>
                    {/* 列表不下发正文，只给 120 字摘要，够用户判断要不要点开 */}
                    {row.summary ? (
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--bp-text-soft)',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.summary}
                      </div>
                    ) : null}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexWrap: 'wrap',
                        marginTop: 4,
                        fontSize: 11,
                        color: 'var(--bp-text-soft)',
                      }}
                    >
                      <span>{fmtTime(row.publishAt || row.createAt)}</span>
                      <span>{noticeTypeText(row)}</span>
                      {row.pinned && (
                        <Tag color="orange" style={{ marginInlineEnd: 0 }}>
                          置顶
                        </Tag>
                      )}
                      {row.status === 'draft' && <Tag style={{ marginInlineEnd: 0 }}>草稿</Tag>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          {total > PAGE_SIZE && (
            <div style={{ padding: '8px 10px', borderTop: '1px dashed var(--bp-line-soft)', textAlign: 'right' }}>
              <Pagination
                size="small"
                current={page}
                pageSize={PAGE_SIZE}
                total={total}
                showSizeChanger={false}
                onChange={(next) => setPage(next)}
              />
            </div>
          )}
        </div>

        {/* 右栏：详情 */}
        <div className="bp-card" style={{ ...PANEL_STYLE, flex: '3 1 calc(40% - 8px)', minWidth: 300 }}>
          <div style={PANEL_HEAD_STYLE}>
            <span className="bp-title" style={{ fontSize: 13 }}>
              公告详情
            </span>
            {detail && canEdit(detail) && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {/* 系统更新公告的正文由「检查更新」生成，后端也拒绝人工写入该类型
                    （NoticeServiceImpl#normalizeType），所以只给归档 / 删除，不给编辑 */}
                {detail.type !== 'system_update' && (
                  <LinkAction style={{ fontSize: 11 }} onClick={() => openEdit(detail)}>
                    编辑
                  </LinkAction>
                )}
                {(detail.status === 'draft' || detail.status === 'archived') && (
                  <LinkAction style={{ fontSize: 11 }} onClick={() => void publishNotice(detail)}>
                    {detail.status === 'archived' ? '重新发布' : '发布'}
                  </LinkAction>
                )}
                {detail.status !== 'archived' && (
                  <Popconfirm
                    title="归档这条公告？"
                    description="归档后不再出现在「全部公告」里，需要时可以到「已归档」分类重新发布。"
                    okText="归档"
                    cancelText="取消"
                    onConfirm={() => void archiveNotice(detail)}
                  >
                    <LinkAction style={{ fontSize: 11 }}>归档</LinkAction>
                  </Popconfirm>
                )}
                <LinkAction
                  style={{ fontSize: 11, color: 'var(--bp-orange)' }}
                  onClick={() => confirmDelete(detail)}
                >
                  删除
                </LinkAction>
              </div>
            )}
          </div>
          <div style={PANEL_BODY_STYLE}>
            {!activeId ? (
              <div style={{ padding: '48px 12px' }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                      点左边列表里的任意一条公告，正文显示在这里
                    </span>
                  }
                />
              </div>
            ) : detailLoading ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <Spin />
              </div>
            ) : detailError ? (
              <Alert type="error" showIcon message={detailError} />
            ) : detail ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span className="bp-title" style={{ fontSize: 16 }}>
                    {detail.title || '（无标题）'}
                  </span>
                  <Tag style={{ marginInlineEnd: 0 }}>{noticeTypeText(detail)}</Tag>
                  {detail.pinned && (
                    <Tag color="orange" style={{ marginInlineEnd: 0 }}>
                      置顶
                    </Tag>
                  )}
                  {noticeStatusText(detail) && (
                    <Tag color={detail.status === 'draft' ? 'orange' : undefined} style={{ marginInlineEnd: 0 }}>
                      {noticeStatusText(detail)}
                    </Tag>
                  )}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 14,
                    flexWrap: 'wrap',
                    fontSize: 11,
                    color: 'var(--bp-text-soft)',
                    margin: '8px 0 12px',
                  }}
                >
                  {/* 草稿还没有 publishAt：显示创建时间，不要假装已发布 */}
                  {detail.publishAt ? (
                    <span>发布：{fmtTime(detail.publishAt)}</span>
                  ) : (
                    <span>创建：{fmtTime(detail.createAt)}</span>
                  )}
                  <span>受众：{noticeAudienceText(detail)}</span>
                  <span>范围：{noticeScopeText(detail)}</span>
                  {noticeAuthor(detail) && <span>发布人：{noticeAuthor(detail)}</span>}
                  {detail.expireAt && <span>过期：{fmtTime(detail.expireAt)}</span>}
                </div>
                <div style={{ borderTop: '1px dashed var(--bp-line-soft)', paddingTop: 12 }}>
                  {/* 正文渲染前 RichTextContent 会再消毒一次；服务端入库时已经消毒过一遍 */}
                  <RichTextContent
                    html={detail.content}
                    className="rich-text-content"
                    style={{ fontSize: 13, lineHeight: 1.8, overflowWrap: 'anywhere', overflowX: 'auto' }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 写公告：只有 notice:manage:* 才挂载，没有权限的人连组件都不出现 */}
      {canManage && (
        <NoticeEditor
          open={editorOpen}
          notice={editing}
          onClose={() => setEditorOpen(false)}
          onSaved={(publish) => void handleSaved(publish)}
        />
      )}
    </div>
  );
}
