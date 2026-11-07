import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  App,
  Button,
  Card,
  DatePicker,
  Drawer,
  Empty,
  Input,
  message,
  Modal,
  Segmented,
  Space,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  RestOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import LinkAction from '../../components/LinkAction';
import TableScrollRegion from '../../components/TableScrollRegion';
import { download, get, getWithPagination, post } from '../../api';
import { can, loadAuthorities } from '../../auth/permissions';
import type { Answer, Project } from '../../schema/project';
import { flattenSchema } from '../../schema/flatten';
import type { AnswerValue } from '../../renderer/types';
import { TABLE_COMPONENTS } from '../repo/table';
import AnswerEditorModal from './data/AnswerEditorModal';
import AnswerCards from './data/AnswerCards';
import TrashDrawer from './data/TrashDrawer';
import {
  EMPTY,
  compareText,
  formatAnswer,
  isDataQuestion,
  questionHeader,
} from './data/format';

const { RangePicker } = DatePicker;

const MOBILE_QUERY = '(max-width: 767.98px)';

/** 手机端换卡片布局：390px 下横向滚动的表格点不准 */
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (event: MediaQueryListEvent) => setMobile(event.matches);
    setMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return mobile;
}

type EditorState = { mode: 'create' } | { mode: 'edit'; row: Answer };

/**
 * 列表一次拉全量，筛选/排序/分页都在前端做：
 * - 答卷人只能按姓名搜，后端 AnswerQuery.createBy 是 userId 精确匹配，搜不到名字；
 * - 表头排序要覆盖全部答卷，走服务端分页会把排序限制在当前页。
 * ponytail: 全量进内存，答卷上万条再换服务端分页 + 服务端排序。
 */
export default function SurveyData() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { modal } = App.useApp();
  const mobile = useIsMobile();

  const [project, setProject] = useState<Project>();
  const [rows, setRows] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<string[]>([]);
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [author, setAuthor] = useState('');

  const [detail, setDetail] = useState<Answer>();
  const [editor, setEditor] = useState<EditorState>();
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 导出权限细分：没有 answer:export 就不渲染导出按钮
  const [authorities, setAuthorities] = useState<string[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportPwd, setExportPwd] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);

  // 按钮级权限闸门：没有权限的写操作按钮直接不渲染，避免「看得见、点了 403」
  const canExport = can(authorities, 'answer:export');
  const canCreate = can(authorities, 'answer:create');
  const canUpdate = can(authorities, 'answer:update');
  const canDelete = can(authorities, 'answer:delete');
  const canUpload = can(authorities, 'answer:upload');
  const canRestore = can(authorities, 'answer:restore');
  /** 恢复和彻底删除都没有权限时，回收站入口本身也没东西可做，不渲染 */
  const canOpenTrash = canRestore || canDelete;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [, res] = await Promise.all([
        get<Project>('/api/project', { id })
          .then((p) => setProject(p))
          .catch(() => undefined),
        // pageSize=-1 → 后端返回全量（见 PageQuery.getPageSize）
        getWithPagination<Answer>('/api/answer/list', { projectId: id, current: 1, pageSize: -1 }),
      ]);
      setRows(res.data);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // 换筛选条件回到第一页，避免停在空白页
  useEffect(() => {
    setPage(1);
  }, [range, author]);

  /** 列结构取当前问卷；问卷拉不到时退回最新一份答卷的快照 */
  const survey = project?.survey ?? rows[0]?.survey;

  const questions = useMemo(
    () => (survey ? flattenSchema(survey).filter(isDataQuestion) : []),
    [survey],
  );

  /** 每行每题的单元格文本只算一次，排序和渲染共用 */
  const cells = useMemo(() => {
    const map = new Map<string, Record<string, string>>();
    for (const row of rows) {
      const texts: Record<string, string> = {};
      for (const q of questions) {
        texts[q.id] = formatAnswer(q, (row.answer ?? {})[q.id] as AnswerValue);
      }
      map.set(row.id, texts);
    }
    return map;
  }, [rows, questions]);

  const filtered = useMemo(() => {
    const [from, to] = range ?? [];
    const keyword = author.trim().toLowerCase();
    return rows.filter((row) => {
      if (from || to) {
        const at = row.createAt ? dayjs(row.createAt) : undefined;
        if (!at?.isValid()) return false;
        if (from && at.isBefore(from.startOf('day'))) return false;
        if (to && at.isAfter(to.endOf('day'))) return false;
      }
      if (keyword) {
        const who = (row.createByName || row.createBy || '匿名').toLowerCase();
        if (!who.includes(keyword)) return false;
      }
      return true;
    });
  }, [rows, range, author]);

  /** 手机端分页在前端切页；桌面端交给 Table 自己的分页 */
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(
    () => (mobile ? filtered.slice((page - 1) * pageSize, page * pageSize) : []),
    [mobile, filtered, page, pageSize],
  );
  const emptyText = rows.length
    ? '当前筛选没有匹配的答卷'
    : canCreate
      ? '还没有答卷，点「添加数据」补录一份'
      : '还没有答卷';

  const columns = useMemo<ColumnsType<Answer>>(() => {
    const fixedColumns: ColumnsType<Answer> = [
      {
        title: '#',
        key: 'index',
        width: 56,
        fixed: 'left',
        align: 'center',
        render: (_: unknown, __: Answer, index: number) => (
          <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
            {(page - 1) * pageSize + index + 1}
          </span>
        ),
      },
      {
        title: '提交时间',
        dataIndex: 'createAt',
        width: 160,
        fixed: 'left',
        sorter: (a: Answer, b: Answer) => (a.createAt ?? '').localeCompare(b.createAt ?? ''),
        render: (v?: string) => <span style={{ fontSize: 12 }}>{v || EMPTY}</span>,
      },
      {
        title: '答卷人',
        dataIndex: 'createByName',
        width: 110,
        sorter: (a: Answer, b: Answer) =>
          (a.createByName ?? a.createBy ?? '').localeCompare(
            b.createByName ?? b.createBy ?? '',
            'zh-Hans-CN',
          ),
        render: (v: string | undefined, row: Answer) => (
          <span style={{ fontSize: 12 }}>{v || row.createBy?.slice(0, 8) || '匿名'}</span>
        ),
      },
      {
        title: '状态',
        dataIndex: 'tempSave',
        width: 88,
        render: (v?: number) =>
          v === 1 ? <Tag color="success">已提交</Tag> : <Tag color="warning">暂存</Tag>,
      },
      {
        title: '得分',
        dataIndex: 'examScore',
        width: 76,
        sorter: (a: Answer, b: Answer) => (a.examScore ?? 0) - (b.examScore ?? 0),
        render: (v?: number) =>
          typeof v === 'number' && v > 0 ? (
            <span style={{ color: 'var(--bp-orange)' }}>{v}</span>
          ) : (
            <span style={{ color: 'var(--bp-text-soft)' }}>{EMPTY}</span>
          ),
      },
    ];

    const questionColumns: ColumnsType<Answer> = questions.map((q) => ({
      title: questionHeader(q),
      key: q.id,
      ellipsis: true,
      width: Math.min(320, Math.max(140, (q.title?.length ?? 0) * 14 + 48)),
      sorter: (a: Answer, b: Answer) =>
        compareText(cells.get(a.id)?.[q.id] ?? EMPTY, cells.get(b.id)?.[q.id] ?? EMPTY),
      render: (_: unknown, row: Answer) => {
        const text = cells.get(row.id)?.[q.id] ?? EMPTY;
        return (
          <span style={{ fontSize: 12, color: text === EMPTY ? 'var(--bp-text-soft)' : undefined }}>
            {text}
          </span>
        );
      },
    }));

    const opsColumn: ColumnsType<Answer> = [
      {
        title: '',
        key: 'ops',
        width: 64,
        fixed: 'right',
        render: (_: unknown, row: Answer) => <LinkAction onClick={() => setDetail(row)}>详情</LinkAction>,
      },
    ];

    return [...fixedColumns, ...questionColumns, ...opsColumn];
  }, [questions, cells, page, pageSize]);

  const submitAnswer = async (values: Record<string, AnswerValue>) => {
    if (!editor) return;
    setSubmitting(true);
    try {
      await post(editor.mode === 'edit' ? '/api/answer/update' : '/api/answer/create', {
        id: editor.mode === 'edit' ? editor.row.id : undefined,
        projectId: id,
        answer: values,
        survey,
        tempSave: 1,
      });
      message.success(editor.mode === 'edit' ? '已保存' : '已补录 1 份');
      setEditor(undefined);
      setSelected([]);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const editSelected = () => {
    const row = rows.find((r) => r.id === selected[0]);
    if (!row) {
      message.warning('先选择一行再编辑');
      return;
    }
    setEditor({ mode: 'edit', row });
  };

  /** 批量删：桌面端用勾选，手机端用卡片上的「删除」单条删 */
  const removeRows = (ids: string[]) => {
    if (ids.length === 0) return;
    modal.confirm({
      title: `删除 ${ids.length} 份答卷？`,
      content: '删除后进回收站，可以恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await post('/api/answer/delete', { ids });
          message.success(`已移入回收站 ${ids.length} 份`);
          setSelected((prev) => prev.filter((x) => !ids.includes(x)));
          setPage(1); // 删到当前页空掉时别停在空白页
          await load();
        } catch (e) {
          message.error((e as Error).message);
        }
      },
    });
  };

  const removeSelected = () => removeRows(selected);

  /** 答卷导出：先弹密码框（系统设置没配密码时留空即可），密码换一次性 token 后随下载 query 传递 */
  const openExport = () => {
    setExportPwd('');
    setExportOpen(true);
  };

  const submitExport = async () => {
    const [from, to] = range ?? [];
    const params: Record<string, unknown> = {
      projectId: id,
      type: 'answer',
      // 后端 DownloadQuery 默认 pageSize=20，只导当页；-1 才是全量
      pageSize: -1,
      startTime: from ? from.startOf('day').format('YYYY-MM-DD HH:mm:ss') : undefined,
      endTime: to ? to.endOf('day').format('YYYY-MM-DD HH:mm:ss') : undefined,
      ids: selected.length ? selected.join(',') : undefined,
    };
    setExporting(true);
    try {
      // 密码只走 POST body 换一次性 token，避免密码出现在下载 URL（服务器日志/浏览器历史）
      const tokenRes = await post<{ exportToken?: string }>('/api/repo/export/token', {
        exportPassword: exportPwd.trim() || undefined,
      });
      if (tokenRes?.exportToken) params.exportToken = tokenRes.exportToken;
      // 公共 download()：content-type 为 JSON 时按后端错误抛中文，不再把错误存成 .xlsx
      await download('/api/answer/download', params, `${project?.name || '答卷'}.xlsx`);
      setExportOpen(false);
      setExportPwd('');
      message.success('导出已开始');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const importFile = async (file: File) => {
    setImporting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('projectId', id);
      await post('/api/answer/upload', form);
      message.success('导入完成');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const detailQuestions = useMemo(
    () => (detail?.survey ? flattenSchema(detail.survey).filter(isDataQuestion) : []),
    [detail],
  );

  const deleteButton = canDelete ? (
    <Button danger icon={<DeleteOutlined />} disabled={selected.length === 0} onClick={removeSelected}>
      删除数据
    </Button>
  ) : null;

  return (
    <div>
      <style>{`
        /* 表格单元格是透明的（主题 colorBgContainer: transparent），固定列横向滚动时会透出下层内容，这里补底色 */
        .sk-data-grid .ant-table-thead > tr > .ant-table-cell-fix-left,
        .sk-data-grid .ant-table-thead > tr > .ant-table-cell-fix-right { background: #263f62; }
        .sk-data-grid .ant-table-tbody > tr > .ant-table-cell-fix-left,
        .sk-data-grid .ant-table-tbody > tr > .ant-table-cell-fix-right { background: var(--bp-bg); }
        .sk-data-grid .ant-table-tbody > tr:hover > .ant-table-cell-fix-left,
        .sk-data-grid .ant-table-tbody > tr:hover > .ant-table-cell-fix-right { background: #23446e; }
        .sk-data-grid .ant-table-tbody > tr.ant-table-row-selected > .ant-table-cell-fix-left,
        .sk-data-grid .ant-table-tbody > tr.ant-table-row-selected > .ant-table-cell-fix-right { background: rgb(36,57,79); }
        /* 手机上工具条按钮要够 36px 才好点 */
        .sk-data-toolbar-mobile .ant-btn { height: 36px; }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/survey/${id}`)} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
            DATA / 数据与分析
          </div>
          <div
            className="bp-title"
            style={{ fontSize: 16, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {project?.name || id} · 共 {rows.length} 份
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {/* 「分析」不再是列表里独立按钮，入口收在这里，切到统计报表 */}
        <Segmented
          value="data"
          options={[
            { label: '数据', value: 'data' },
            { label: '分析', value: 'report' },
          ]}
          onChange={(value) => {
            if (value === 'report') navigate(`/survey/${id}/report`);
          }}
        />
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
          刷新
        </Button>
      </div>

      <Card className="bp-corners bp-card">
        <div
          className={mobile ? 'sk-data-toolbar-mobile' : undefined}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}
        >
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditor({ mode: 'create' })}>
              添加数据
            </Button>
          )}
          {!mobile && canUpdate && (
            <Button icon={<EditOutlined />} disabled={selected.length !== 1} onClick={editSelected}>
              编辑数据
            </Button>
          )}
          {!mobile && deleteButton}
          {canUpload && (
            <Button icon={<UploadOutlined />} loading={importing} onClick={() => fileRef.current?.click()}>
              导入数据
            </Button>
          )}
          {canExport && (
            <Button icon={<DownloadOutlined />} disabled={rows.length === 0} onClick={openExport}>
              导出数据
            </Button>
          )}
          {canOpenTrash && (
            <Button icon={<RestOutlined />} onClick={() => setTrashOpen(true)}>
              回收站
            </Button>
          )}
          {mobile && deleteButton}
          {!mobile && <div style={{ flex: 1 }} />}
          <RangePicker
            value={range}
            allowClear
            placeholder={['开始日期', '结束日期']}
            style={{ width: mobile ? '100%' : 236 }}
            onChange={(dates) => setRange((dates ?? null) as [Dayjs | null, Dayjs | null] | null)}
          />
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="答卷人"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            style={{ width: mobile ? '100%' : 160 }}
          />
        </div>

        {selected.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--bp-orange)', marginBottom: 8 }}>
            已选中 {selected.length} 条
          </div>
        )}

        {mobile ? (
          <>
            <Spin spinning={loading}>
              {pageRows.length === 0 ? (
                <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <AnswerCards
                  rows={pageRows}
                  questions={questions}
                  cells={cells}
                  selected={selected}
                  onSelect={setSelected}
                  onDetail={setDetail}
                  onEdit={(row) => setEditor({ mode: 'edit', row })}
                  onDelete={(row) => removeRows([row.id])}
                  canEdit={canUpdate}
                  canDelete={canDelete}
                />
              )}
            </Spin>
            {filtered.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Button
                  style={{ height: 36 }}
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  上一页
                </Button>
                <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'var(--bp-text-soft)' }}>
                  第 {Math.min(page, pageCount)} / {pageCount} 页 · 共 {filtered.length} 条
                </div>
                <Button
                  style={{ height: 36 }}
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="sk-data-grid">
            <TableScrollRegion label="答卷列表（可横向滚动）">
            <Table<Answer>
              rowKey="id"
              size="small"
              loading={loading}
              dataSource={filtered}
              columns={columns}
              components={TABLE_COMPONENTS}
              // 固定表头 + 横向滚动：列多时表头贴住表体顶部，手机上左右滑
              scroll={{ x: 'max-content', y: 'max(240px, calc(100vh - 360px))' }}
              rowSelection={{
                selectedRowKeys: selected,
                preserveSelectedRowKeys: true,
                onChange: (keys) => setSelected(keys as string[]),
              }}
              locale={{ emptyText: <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              pagination={{
                current: page,
                pageSize,
                total: filtered.length,
                showSizeChanger: true,
                pageSizeOptions: [20, 50, 100],
                showTotal: (t) => `共 ${t} 条`,
                onChange: (p, ps) => {
                  setPage(p);
                  setPageSize(ps);
                },
              }}
            />
            </TableScrollRegion>
          </div>
        )}
      </Card>

      {canUpload && (
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importFile(file);
          }}
        />
      )}

      <AnswerEditorModal
        open={Boolean(editor)}
        mode={editor?.mode ?? 'create'}
        survey={survey}
        initial={editor?.mode === 'edit' ? editor.row.answer : undefined}
        submitting={submitting}
        onCancel={() => setEditor(undefined)}
        onSubmit={(values) => void submitAnswer(values)}
      />

      <TrashDrawer
        open={trashOpen}
        projectId={id}
        onClose={() => setTrashOpen(false)}
        onChanged={() => void load()}
      />

      {/* 导出密码：系统设置里没配密码时留空直接导出 */}
      <Modal
        title="导出答卷"
        open={exportOpen}
        onCancel={() => setExportOpen(false)}
        onOk={() => void submitExport()}
        okText="导出"
        cancelText="取消"
        confirmLoading={exporting}
        destroyOnClose
      >
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', lineHeight: 1.7, marginBottom: 10 }}>
          管理员可在「系统设置 → 内容与隐私」里设置导出密码；未设置密码时直接留空导出即可。
        </div>
        <Input.Password
          value={exportPwd}
          onChange={(e) => setExportPwd(e.target.value)}
          onPressEnter={() => void submitExport()}
          placeholder="导出密码"
          autoComplete="off"
        />
      </Modal>

      <Drawer
        title="答卷详情"
        placement="right"
        width="min(520px, 100vw)"
        open={Boolean(detail)}
        onClose={() => setDetail(undefined)}
      >
        {detail && (
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <div style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
              提交时间 {detail.createAt || EMPTY}
              {detail.createByName ? ` · ${detail.createByName}` : ''}
              {typeof detail.examScore === 'number' && detail.examScore > 0
                ? ` · 得分 ${detail.examScore}`
                : ''}
            </div>
            <hr className="bp-dim" style={{ margin: 0 }} />
            {detailQuestions.map((q, i) => (
              <div key={q.id}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>
                  <span className="bp-tag" style={{ marginRight: 6 }}>{q.number ?? i + 1}</span>
                  {q.title || q.type}
                </div>
                <div style={{ fontSize: 13, color: 'var(--bp-text)', paddingLeft: 2 }}>
                  {formatAnswer(q, (detail.answer ?? {})[q.id] as AnswerValue)}
                </div>
              </div>
            ))}
            {detailQuestions.length === 0 && <Empty description="这份答卷没有可展示的题目快照" />}
          </Space>
        )}
      </Drawer>
    </div>
  );
}
