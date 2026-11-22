import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Alert, App, Badge, Button, Empty, Pagination, Popconfirm, Spin, Tag } from 'antd';
import { EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { get, getSystem, post } from '../../api';
import { can, loadAuthorities } from '../../auth/permissions';
import { PERMISSION_CODES } from '../../auth/permission-codes';
import { useIsMobile } from '../../hooks/useIsMobile';
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
  type NoticeMode,
  type NoticeView,
} from './types';


const PAGE_SIZE = 10;








const CATEGORIES: NoticeCategoryDef[] = [
  { key: 'all', label: '全部公告', hint: '我能看到的全部已发布公告，置顶在前', managerOnly: false },
  { key: 'system_update', label: '系统更新', hint: '检查更新发现新版本时自动生成的系统公告', managerOnly: false },
  { key: 'unread', label: '未读', hint: '只显示我还没读过的公告', managerOnly: false },
  { key: 'draft', label: '草稿', hint: '新建公告先落草稿，确认无误后再发布', managerOnly: true },
  { key: 'archived', label: '已归档', hint: '归档后不再出现在列表里，可在这里重新发布', managerOnly: true },
];


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

/** 公告页的共用实现：左分类、中列表、右详情（实施计划 4.6） */
export default function NoticeCenter({ mode = 'read' }: { mode?: NoticeMode }) {
  const isMobile = useIsMobile();
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const isManage = mode === 'manage';
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

  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const [editorOpen, setEditorOpen] = useState(false);

  const [editing, setEditing] = useState<NoticeView>();
  const [markingRead, setMarkingRead] = useState(false);


  const [authorities, setAuthorities] = useState<string[]>([]);
  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);





  const [aiEnabled, setAiEnabled] = useState<boolean>();
  useEffect(() => {
    if (!isManage) return;
    let alive = true;
    getSystem()
      .then((info) => {
        if (alive) setAiEnabled(info?.aiEnabled);
      })
      // 拿不到就不藏按钮：真关着时后端会用中文原因拒绝，别让一次网络抖动把功能藏掉
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [isManage]);


  const canManageSystem = can(authorities, PERMISSION_CODES.noticeManageSystem);
  const canManageClass = can(authorities, PERMISSION_CODES.noticeManageClass);




  const canWrite = isManage && (canManageSystem || canManageClass);

  /** 左栏可见分类： */
  const categories = useMemo(
    () =>
      CATEGORIES.filter((item) => {
        if (item.key === 'system_update') return canManageSystem;
        if (item.managerOnly) return canWrite;
        return true;
      }),
    [canManageSystem, canWrite],
  );


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

        type: category === 'system_update' ? 'system_update' : undefined,

        status: category === 'draft' || category === 'archived' ? category : undefined,
      });
      const list = Array.isArray(res) ? res : (res?.list ?? []);
      const serverTotal = Array.isArray(res) ? list.length : Number(res?.total ?? list.length);
      const filtered =
        category === 'system_update' ? list.filter((item) => item.type === 'system_update') : list;
      setRows(filtered);
      setTotal(Number.isFinite(serverTotal) ? serverTotal : filtered.length);

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

  /** markRead=false 用于「编辑/发布后回读」，那次不该重复广播未读数变化 */
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





          if (res.read === false) {
            void post('/api/notice/read', { ids: [id] }).catch(() => undefined);
          }
          void loadUnread();

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

    setActiveId(undefined);
    setDetail(undefined);
    setDetailError(undefined);
  };

  /** 未读判定：优先用后端下发的 read 字段； 后端没给时，「未读」分类里的一律算未读（这个分类本身就是服务端按未读筛出来的） */
  const isUnread = (notice: NoticeView) => {
    if (readIds.has(notice.id)) return false;
    if (typeof notice.read === 'boolean') return !notice.read;
    if (notice.readAt) return false;
    return category === 'unread';
  };

  const unreadIds = useMemo(
    () => rows.filter((row) => isUnread(row)).map((row) => row.id),

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

  /** 能不能改这条公告：优先后端按当前用户算好的 manageable（NoticeServiceImpl#canManage）—— 老师只能改「自己创建的班级公告」，只看权限点会多显示按钮、点下去 403； 后端没下发该字段时再按权限点兜底 */
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

  /** 保存成功：刷新列表；编辑过的那条回读一次，保证右边是新正文 */
  const handleSaved = async (publish: boolean) => {
    const editedId = editing?.id;
    setEditorOpen(false);
    if (!publish && !editedId && category !== 'draft') {

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

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
            {isManage ? 'NOTICE / 公告管理' : 'NOTICE / 公告中心'}
          </div>
          <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
            {isManage ? '公告管理' : '公告中心'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginTop: 4 }}>
            {isManage
              ? '管理员可发全站公告，老师只能发自己带的班；新建先存草稿，确认无误再发布。'
              : canManageSystem || canManageClass
                ? '这里只负责看通知：发通知请到 系统管理 → 公告管理。'
                : '打开详情即视为已读，顶栏铃铛会同步更新。'}
          </div>
          {unread !== undefined && unread > 0 && (
            <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginTop: 2 }}>
              还有 {unread} 条未读，打开详情即视为已读。
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button size="small" icon={<ReloadOutlined />} loading={listLoading} onClick={() => void refresh()}>
            刷新
          </Button>

          {!isManage && (canManageSystem || canManageClass) && (
            <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => navigate('/system/notice')}>
              去公告管理
            </Button>
          )}
          {canWrite && (
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              写公告
            </Button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' }}>

        <div
          className="bp-card sk-notice-panel"
          style={{
            ...PANEL_STYLE,
            flex: isMobile ? '0 0 auto' : '0 0 190px',
            minWidth: isMobile ? 0 : 156,
            height: isMobile ? 'auto' : PANEL_STYLE.height,
          }}
        >
          <div style={PANEL_HEAD_STYLE}>
            <span className="bp-title" style={{ fontSize: 13 }}>
              分类
            </span>
          </div>
          <div className="sk-notice-cats" style={{ ...PANEL_BODY_STYLE, padding: '8px 8px 12px' }}>
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
              {canWrite
                ? '系统更新类公告由「系统设置 → 检查更新」自动生成，管理员可在这里归档。'
                : '系统更新类公告由「系统设置 → 检查更新」自动生成。'}
            </div>
          </div>
        </div>


        <div
          className="bp-card sk-notice-panel"
          style={{
            ...PANEL_STYLE,
            flex: isMobile ? '1 1 auto' : '2 1 calc(34% - 8px)',
            minWidth: isMobile ? 0 : 260,
            height: isMobile ? 'auto' : PANEL_STYLE.height,
          }}
        >
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
              <Alert type="error" showIcon title={listError} />
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


        <div
          className="bp-card sk-notice-panel"
          style={{
            ...PANEL_STYLE,
            flex: isMobile ? '1 1 auto' : '3 1 calc(40% - 8px)',
            minWidth: isMobile ? 0 : 300,
            height: isMobile ? 'auto' : PANEL_STYLE.height,
            maxWidth: '100%',
          }}
        >
          <div style={PANEL_HEAD_STYLE}>
            <span className="bp-title" style={{ fontSize: 13 }}>
              公告详情
            </span>

            {canWrite && detail && canEdit(detail) && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>


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
              <Alert type="error" showIcon title={detailError} />
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


      {canWrite && (
        <NoticeEditor
          open={editorOpen}
          notice={editing}
          aiEnabled={aiEnabled}
          onClose={() => setEditorOpen(false)}
          onSaved={(publish) => void handleSaved(publish)}
        />
      )}
    </div>
  );
}
