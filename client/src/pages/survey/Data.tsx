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
  Space,
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
import { download, get, getWithPagination, post } from '../../api';
import type { Answer, Project } from '../../schema/project';
import { flattenSchema } from '../../schema/flatten';
import type { AnswerValue } from '../../renderer/types';
import { TABLE_COMPONENTS } from '../repo/table';
import AnswerEditorModal from './data/AnswerEditorModal';
import TrashDrawer from './data/TrashDrawer';
import {
  EMPTY,
  compareText,
  formatAnswer,
  isDataQuestion,
  questionHeader,
} from './data/format';

const { RangePicker } = DatePicker;

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
        render: (_: unknown, row: Answer) => <a onClick={() => setDetail(row)}>详情</a>,
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

  const removeSelected = () => {
    if (selected.length === 0) return;
    modal.confirm({
      title: `删除 ${selected.length} 份答卷？`,
      content: '删除后进回收站，可以恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await post('/api/answer/delete', { ids: selected });
          message.success(`已移入回收站 ${selected.length} 份`);
          setSelected([]);
          setPage(1); // 删到当前页空掉时别停在空白页
          await load();
        } catch (e) {
          message.error((e as Error).message);
        }
      },
    });
  };

  const exportXlsx = () => {
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
    download('/api/answer/download', params, `${project?.name || '答卷'}.xlsx`).catch((e: Error) =>
      message.error(e.message),
    );
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/survey/${id}/edit`)} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
            DATA / 答卷
          </div>
          <div
            className="bp-title"
            style={{ fontSize: 16, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {project?.name || id} · 共 {rows.length} 份
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
          刷新
        </Button>
      </div>

      <Card
        className="bp-corners"
        style={{ border: '1px solid var(--bp-line)', background: 'rgba(30,58,95,0.55)' }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditor({ mode: 'create' })}>
            添加数据
          </Button>
          <Button icon={<EditOutlined />} disabled={selected.length !== 1} onClick={editSelected}>
            编辑数据
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            disabled={selected.length === 0}
            onClick={removeSelected}
          >
            删除数据
          </Button>
          <Button
            icon={<UploadOutlined />}
            loading={importing}
            onClick={() => fileRef.current?.click()}
          >
            导入数据
          </Button>
          <Button icon={<DownloadOutlined />} disabled={rows.length === 0} onClick={exportXlsx}>
            导出数据
          </Button>
          <Button icon={<RestOutlined />} onClick={() => setTrashOpen(true)}>
            回收站
          </Button>
          <div style={{ flex: 1 }} />
          <RangePicker
            value={range}
            allowClear
            placeholder={['开始日期', '结束日期']}
            style={{ width: 236 }}
            onChange={(dates) => setRange((dates ?? null) as [Dayjs | null, Dayjs | null] | null)}
          />
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="答卷人"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            style={{ width: 160 }}
          />
        </div>

        {selected.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--bp-orange)', marginBottom: 8 }}>
            已选中 {selected.length} 条
          </div>
        )}

        <div className="sk-data-grid">
          {/* 表格单元格是透明的（主题 colorBgContainer: transparent），固定列横向滚动时会透出下层内容，这里补底色 */}
          <style>{`
            .sk-data-grid .ant-table-thead > tr > .ant-table-cell-fix-left,
            .sk-data-grid .ant-table-thead > tr > .ant-table-cell-fix-right { background: #263f62; }
            .sk-data-grid .ant-table-tbody > tr > .ant-table-cell-fix-left,
            .sk-data-grid .ant-table-tbody > tr > .ant-table-cell-fix-right { background: var(--bp-bg); }
            .sk-data-grid .ant-table-tbody > tr:hover > .ant-table-cell-fix-left,
            .sk-data-grid .ant-table-tbody > tr:hover > .ant-table-cell-fix-right { background: #23446e; }
            .sk-data-grid .ant-table-tbody > tr.ant-table-row-selected > .ant-table-cell-fix-left,
            .sk-data-grid .ant-table-tbody > tr.ant-table-row-selected > .ant-table-cell-fix-right { background: rgb(36,57,79); }
          `}</style>
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
            locale={{
              emptyText: (
                <Empty
                  description={rows.length ? '当前筛选没有匹配的答卷' : '还没有答卷，点「添加数据」补录一份'}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
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
        </div>
      </Card>

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

      <Drawer
        title="答卷详情"
        placement="right"
        width={520}
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
