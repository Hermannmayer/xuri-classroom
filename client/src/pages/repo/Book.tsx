import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Key } from 'react';
import {
  Button,
  Checkbox,
  DatePicker,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getWithPagination, post } from '../../api';
import { pager, TABLE_COMPONENTS } from './table';

const { RangePicker } = DatePicker;

/** 与后端 UserBookView 对齐 */
export interface UserBookView {
  id: string;
  templateId?: string;
  name?: string;
  wrongTimes?: number;
  note?: string;
  status?: number;
  type?: number;
  /** 来源考试 id（题库练习 / 历史数据为空） */
  projectId?: string;
  createAt?: string;
  /** 后端只在记录被更新时刷新，近似「最近一次错误时间」 */
  updateAt?: string;
  qscore?: number;
}

/** 错题本状态约定（后端 UserBook.status）：1 = 已掌握（标记为简单），2 = 重点标记，0/null = 普通 */
export const BOOK_STATUS_MASTERED = 1;
export const BOOK_STATUS_FOCUS = 2;

/** UserBook.type：1 = 错题，2 = 收藏 */
export const BOOK_TYPE_WRONG = 1;
export const BOOK_TYPE_FAVORITE = 2;

/**
 * 错题本筛选条件。列表页和练习页共用同一份定义，
 * 保证「按当前筛选结果练习」和列表看到的是同一批题。
 */
export interface BookFilter {
  type?: number;
  name?: string;
  /** 后端新增参数：错误次数下限（≥2 / ≥3） */
  wrongTimesMin?: number;
  /** 后端新增参数：状态（2 = 只看重点） */
  status?: number;
  /** yyyy-MM-dd，后端按 00:00 解析，结束日已 +1 天，包含当天 */
  startDate?: string;
  endDate?: string;
  /** 姓名以外的笔记内容过滤：后端 UserBookQuery 还没有 note 字段，只能前端过滤 */
  note?: string;
  /** 来源考试 id：只看某一场考试产生的错题（后端 UserBookQuery.projectId） */
  projectId?: string;
}

/** 列表接口参数（未设置的项交给 request 的 qs 丢弃） */
export function bookListParams(filter: BookFilter): Record<string, unknown> {
  return {
    type: filter.type,
    name: filter.name || undefined,
    startDate: filter.startDate,
    endDate: filter.endDate,
    wrongTimesMin: filter.wrongTimesMin,
    status: filter.status,
    projectId: filter.projectId || undefined,
  };
}

/**
 * 这几个条件是「新加的」：wrongTimesMin / status / projectId / note。
 * 后端可能还没上线（Query DTO 里没有字段时 Spring 会静默忽略），
 * 所以只要用到它们就改成拉全量再前端过滤，两种后端都能得到正确结果。
 * 错题本量级是「个人错题」，拉全量可以接受。
 */
export function bookNeedsClientFilter(filter: BookFilter): boolean {
  return (
    filter.wrongTimesMin != null ||
    filter.status != null ||
    Boolean(filter.note) ||
    Boolean(filter.projectId)
  );
}

/** 前端兜底过滤：与后端 SQL 的 ge(wrongTimes) / eq(status) / eq(projectId) / like(note) 语义一致 */
export function bookRowMatches(row: UserBookView, filter: BookFilter): boolean {
  if (filter.wrongTimesMin != null && (row.wrongTimes ?? 0) < filter.wrongTimesMin) return false;
  if (filter.status != null && (row.status ?? 0) !== filter.status) return false;
  if (filter.projectId && (row.projectId ?? '') !== filter.projectId) return false;
  const needle = filter.note?.trim().toLowerCase();
  if (needle && !(row.note ?? '').toLowerCase().includes(needle)) return false;
  return true;
}

/** 从 URL 还原筛选条件（练习页用） */
export function bookFilterFromParams(params: URLSearchParams): BookFilter {
  const num = (key: string) => {
    const raw = params.get(key);
    if (raw === null || raw === '') return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };
  return {
    type: num('type'),
    wrongTimesMin: num('wrongTimesMin'),
    status: num('status'),
    name: params.get('name') || undefined,
    note: params.get('note') || undefined,
    startDate: params.get('startDate') || undefined,
    endDate: params.get('endDate') || undefined,
    projectId: params.get('projectId') || undefined,
  };
}

/**
 * 筛选条件 → 练习页查询串。
 * scope=all 表示不带上筛选（整本错题都练）；scope=project 表示只练某一场考试的错题。
 */
export function bookQueryString(filter: BookFilter, scope: 'filter' | 'all' | 'project' = 'filter'): string {
  const params = new URLSearchParams();
  params.set('scope', scope);
  if (scope === 'all') return params.toString();
  if (filter.type != null) params.set('type', String(filter.type));
  if (filter.wrongTimesMin != null) params.set('wrongTimesMin', String(filter.wrongTimesMin));
  if (filter.status != null) params.set('status', String(filter.status));
  if (filter.name) params.set('name', filter.name);
  if (filter.note) params.set('note', filter.note);
  if (filter.startDate) params.set('startDate', filter.startDate);
  if (filter.endDate) params.set('endDate', filter.endDate);
  if (filter.projectId) params.set('projectId', filter.projectId);
  return params.toString();
}

/**
 * 学员可见的考试列表（错题本的「来源考试」筛选与列展示都要用）。
 * 后端 UserBookView 只带 projectId 不带名字（避免为展示再给 RepoServiceImpl 加依赖），
 * 这里用学员本来就能访问的 /api/project/list 建一份映射；拿不到就退化显示 id 前缀。
 */
export interface ProjectOption {
  id: string;
  name: string;
  mode?: string;
}

export async function loadProjectOptions(): Promise<ProjectOption[]> {
  try {
    const res = await getWithPagination<{ id: string; name?: string; mode?: string }>('/api/project/list', {
      current: 1,
      pageSize: 200,
    });
    return res.data
      .filter((project) => Boolean(project.name))
      .map((project) => ({ id: project.id, name: project.name as string, mode: project.mode }));
  } catch {
    return [];
  }
}

type TypeFilter = 'all' | 'wrong' | 'favorite';
type RangePreset = 'all' | '7d' | '30d' | 'custom';

/** 预设时间窗 → 后端要的日期区间。结束日 +1 天：后端按 00:00 解析，不加会漏掉当天 */
function presetRange(preset: RangePreset): { startDate?: string; endDate?: string } {
  if (preset === '7d') {
    return { startDate: dayjs().subtract(6, 'day').format('YYYY-MM-DD'), endDate: dayjs().add(1, 'day').format('YYYY-MM-DD') };
  }
  if (preset === '30d') {
    return { startDate: dayjs().subtract(29, 'day').format('YYYY-MM-DD'), endDate: dayjs().add(1, 'day').format('YYYY-MM-DD') };
  }
  return {};
}

export default function RepoBook() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<UserBookView[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // 筛选区
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [timesMin, setTimesMin] = useState(0);
  const [rangePreset, setRangePreset] = useState<RangePreset>('all');
  const [customRange, setCustomRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [focusOnly, setFocusOnly] = useState(false);
  const [nameKeyword, setNameKeyword] = useState('');
  const [noteKeyword, setNoteKeyword] = useState('');

  // 来源考试：可以由外部链接带进来（?projectId=xxx&projectName=xxx，例如交卷页的「练本场错题」）
  const [searchParams] = useSearchParams();
  const projectParam = searchParams.get('projectId') || '';
  const nameParam = searchParams.get('projectName') || '';
  const [projectId, setProjectId] = useState<string | undefined>(projectParam || undefined);
  const [projectName, setProjectName] = useState<string | undefined>(nameParam || undefined);
  /** 学员可见的考试（来源考试筛选的下拉项 + 名称展示） */
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const projectNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const project of projects) map[project.id] = project.name;
    return map;
  }, [projects]);

  // 同一路由内换 projectId（SPA 跳转）时同步，别停留在上一场的筛选上
  useEffect(() => {
    setProjectId(projectParam || undefined);
    setProjectName(nameParam || undefined);
  }, [projectParam, nameParam]);

  // 「来源考试」下拉与列展示要考试名；拿不到就退化显示 id 前缀
  useEffect(() => {
    let alive = true;
    void loadProjectOptions().then((list) => {
      if (alive && list.length) setProjects(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 多选
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);

  const [editing, setEditing] = useState<UserBookView | null>(null);
  // 声明式 Modal 的 onOk 不会自动锁按钮：自己控制 loading，防止双击重复保存笔记
  const [noteSaving, setNoteSaving] = useState(false);
  const [editForm] = Form.useForm<{ note?: string }>();

  const filter = useMemo<BookFilter>(() => {
    const type =
      typeFilter === 'wrong' ? BOOK_TYPE_WRONG : typeFilter === 'favorite' ? BOOK_TYPE_FAVORITE : undefined;
    const custom =
      rangePreset === 'custom' && customRange?.[0] && customRange?.[1]
        ? {
            startDate: customRange[0].format('YYYY-MM-DD'),
            endDate: customRange[1].add(1, 'day').format('YYYY-MM-DD'),
          }
        : undefined;
    return {
      type,
      wrongTimesMin: timesMin || undefined,
      status: focusOnly ? BOOK_STATUS_FOCUS : undefined,
      name: nameKeyword.trim() || undefined,
      note: noteKeyword.trim() || undefined,
      projectId,
      ...(custom ?? presetRange(rangePreset)),
    };
  }, [typeFilter, timesMin, focusOnly, nameKeyword, noteKeyword, rangePreset, customRange, projectId]);

  // 改筛选会先按旧页码发一次请求、再按第 1 页发一次；用序号丢弃过期响应，避免旧数据盖掉新数据
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    const ticket = ++requestSeq.current;
    setLoading(true);
    try {
      const clientFilter = bookNeedsClientFilter(filter);
      const res = await getWithPagination<UserBookView>('/api/repo/book/list', {
        current: clientFilter ? 1 : page,
        pageSize: clientFilter ? -1 : pageSize,
        ...bookListParams(filter),
      });
      if (ticket !== requestSeq.current) return;
      if (!clientFilter) {
        setRows(res.data);
        setTotal(res.total);
        return;
      }
      const matched = res.data.filter((row) => bookRowMatches(row, filter));
      const start = (page - 1) * pageSize;
      setTotal(matched.length);
      setRows(matched.slice(start, start + pageSize));
    } catch (e) {
      if (ticket === requestSeq.current) message.error((e as Error).message);
    } finally {
      if (ticket === requestSeq.current) setLoading(false);
    }
  }, [filter, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  // 条件一变就回到第一页，并丢掉上一批选择，避免批量操作打到看不见的行
  useEffect(() => {
    setPage(1);
    setSelectedKeys([]);
  }, [filter]);

  // Modal 关闭时会销毁 Form，等它挂载后再回填，避免 useForm 未连接警告
  useEffect(() => {
    if (editing) {
      editForm.setFieldsValue({ note: editing.note || '' });
    }
  }, [editing, editForm]);

  const submitEdit = async () => {
    if (!editing || noteSaving) return;
    let note: string | undefined;
    try {
      const values = await editForm.validateFields();
      note = values.note;
    } catch {
      return; // 校验提示已经在字段上
    }
    setNoteSaving(true);
    try {
      await post('/api/repo/book/update', { id: editing.id, note: note ?? '' });
      message.success('笔记已保存');
      setEditing(null);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setNoteSaving(false);
    }
  };

  /** 行内星标：重点 ↔ 普通。status 用 2/0，不动笔记与正确次数 */
  const toggleFocus = async (row: UserBookView) => {
    const next = (row.status ?? 0) === BOOK_STATUS_FOCUS ? 0 : BOOK_STATUS_FOCUS;
    try {
      await post('/api/repo/book/update', { id: row.id, status: next });
      message.success(next === BOOK_STATUS_FOCUS ? '已标为重点' : '已取消重点');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  /**
   * 批量改状态。后端只有单条 update（body { id, status }），
   * 因此按 id 顺序逐条提交，统计成功数；失败的不中断整批。
   */
  const batchStatus = async (status: number) => {
    const ids = selectedKeys.map(String);
    if (!ids.length) return;
    setBusy(true);
    let done = 0;
    try {
      for (const id of ids) {
        try {
          await post('/api/repo/book/update', { id, status });
          done += 1;
        } catch {
          // 单条失败继续，最后统一提示
        }
      }
      if (done === ids.length) {
        message.success(status === BOOK_STATUS_FOCUS ? `已标为重点 ${done} 条` : `已取消重点 ${done} 条`);
      } else {
        message.warning(`完成 ${done} / ${ids.length} 条，其余失败请重试`);
      }
      setSelectedKeys([]);
      await load();
    } finally {
      setBusy(false);
    }
  };

  /** 批量删除：POST /api/repo/book/delete，body { ids } （后端 in(ids) + 限本人） */
  const batchDelete = async () => {
    const ids = selectedKeys.map(String);
    if (!ids.length) return;
    setBusy(true);
    try {
      await post('/api/repo/book/delete', { ids });
      message.success(`已删除 ${ids.length} 条错题记录`);
      setSelectedKeys([]);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** 单条移除，复用批量接口（ids 只放一个） */
  const removeOne = async (row: UserBookView) => {
    try {
      await post('/api/repo/book/delete', { ids: [row.id] });
      message.success('已从错题本移除');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const startPractice = (scope: 'filter' | 'all') => {
    // 只看某一场考试时用 scope=project，练习页据此显示「本场考试错题」
    const practiceScope = scope === 'all' ? 'all' : projectId ? 'project' : 'filter';
    const query = bookQueryString(filter, practiceScope);
    // 带上考试名，练习页顶部就能直接显示「来源考试：xxx」，不必再查一次
    const extra =
      practiceScope !== 'all' && projectId && projectName ? `&projectName=${encodeURIComponent(projectName)}` : '';
    navigate(`/repo/book/practice?${query}${extra}`);
  };
  const practiceOne = (row: UserBookView) =>
    navigate(`/repo/book/practice?scope=filter&ids=${encodeURIComponent(row.id)}`);

  /** 来源考试显示名：考试名 → id 前缀；历史/题库练习产生的错题显示「题库/历史」 */
  const projectLabel = (id?: string) => {
    if (!id) return '题库/历史';
    if (projectNames[id]) return projectNames[id];
    if (projectName && id === projectId) return projectName;
    return `考试 ${id.slice(0, 6)}`;
  };

  const clearProject = () => {
    setProjectId(undefined);
    setProjectName(undefined);
  };

  const hasFilter = Boolean(
    filter.type != null ||
      filter.wrongTimesMin != null ||
      filter.status != null ||
      filter.name ||
      filter.note ||
      filter.startDate ||
      filter.endDate ||
      filter.projectId,
  );

  const isFocus = (row: UserBookView) => (row.status ?? 0) === BOOK_STATUS_FOCUS;
  const statusTag = (row: UserBookView) => {
    const status = row.status ?? 0;
    if (status === BOOK_STATUS_FOCUS) return <Tag color="orange">重点</Tag>;
    if (status === BOOK_STATUS_MASTERED) return <Tag color="blue">已掌握</Tag>;
    return <Tag>未标记</Tag>;
  };

  return (
    <>
      <div
        style={{
          marginBottom: 18,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>BOOK / 错题本</div>
          <h2 className="bp-title" style={{ fontSize: 18, margin: '6px 0 0', letterSpacing: '0.06em' }}>
            错题本
          </h2>
          <div style={{ fontSize: 11, color: 'rgba(160,196,232,0.7)', marginTop: 4 }}>
            练习时做错的题会收进这里；可以直接开练，也可以标重点、写笔记。
            {projectId ? '当前只看某一场考试的错题。' : ''}
          </div>
        </div>
        <Space size={8} wrap>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            disabled={loading || total === 0}
            onClick={() => startPractice('filter')}
          >
            {projectId ? '练本场错题' : '继续练习'}
          </Button>
          <Button icon={<PlayCircleOutlined />} disabled={loading} onClick={() => startPractice('all')}>
            全部练习
          </Button>
        </Space>
      </div>

      <hr className="bp-dim" style={{ margin: '0 0 16px' }} />

      <div
        className="bp-card"
        style={{
          padding: '10px 12px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>类型</span>
        <Segmented<TypeFilter>
          value={typeFilter}
          onChange={(value) => setTypeFilter(value)}
          options={[
            { label: '全部', value: 'all' },
            { label: '错题', value: 'wrong' },
            { label: '收藏', value: 'favorite' },
          ]}
        />
        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>来源考试</span>
        <Select<string>
          value={projectId || ''}
          style={{ width: 176 }}
          showSearch
          optionFilterProp="label"
          onChange={(value) => {
            setProjectId(value || undefined);
            setProjectName(undefined);
          }}
          options={[
            { label: '全部', value: '' },
            ...projects
              .filter((project) => project.mode !== 'survey')
              .map((project) => ({ label: project.name, value: project.id })),
          ]}
        />
        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>错误次数</span>
        <Select<number>
          value={timesMin}
          style={{ width: 132 }}
          onChange={setTimesMin}
          options={[
            { label: '全部', value: 0 },
            { label: '累计 ≥ 2 次', value: 2 },
            { label: '累计 ≥ 3 次', value: 3 },
          ]}
        />
        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>时间</span>
        <Select<RangePreset>
          value={rangePreset}
          style={{ width: 122 }}
          onChange={setRangePreset}
          options={[
            { label: '全部', value: 'all' },
            { label: '近 7 天', value: '7d' },
            { label: '近 30 天', value: '30d' },
            { label: '自定义', value: 'custom' },
          ]}
        />
        {rangePreset === 'custom' && (
          <RangePicker
            value={customRange}
            placeholder={['开始日期', '结束日期']}
            style={{ width: 236 }}
            onChange={(dates) => setCustomRange((dates ?? null) as [Dayjs | null, Dayjs | null] | null)}
          />
        )}
        <Checkbox checked={focusOnly} onChange={(e) => setFocusOnly(e.target.checked)}>
          <span style={{ fontSize: 12 }}>只看重点</span>
        </Checkbox>
      </div>

      {selectedKeys.length > 0 && (
        <div
          className="bp-card"
          style={{
            padding: '8px 12px',
            marginBottom: 12,
            borderColor: 'var(--bp-orange-line)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--bp-orange)', letterSpacing: '0.08em' }}>
            已选 {selectedKeys.length} 条
          </span>
          <Button size="small" icon={<StarOutlined />} loading={busy} onClick={() => void batchStatus(BOOK_STATUS_FOCUS)}>
            批量标为重点
          </Button>
          <Button size="small" icon={<StarOutlined />} loading={busy} onClick={() => void batchStatus(0)}>
            批量取消重点
          </Button>
          <Popconfirm
            title={`删除选中的 ${selectedKeys.length} 条错题记录？`}
            description="只从你的错题本里移除，题库里的题目不受影响。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => void batchDelete()}
          >
            <Button size="small" danger icon={<DeleteOutlined />} disabled={busy}>
              批量删除
            </Button>
          </Popconfirm>
          <a style={{ fontSize: 11 }} onClick={() => setSelectedKeys([])}>
            取消选择
          </a>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>共 {total} 条记录</span>
        {projectId && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--bp-orange)',
              border: '1px solid var(--bp-orange-line)',
              padding: '0 6px',
              lineHeight: '18px',
            }}
            title={projectId}
          >
            来源考试：{projectLabel(projectId)}
            <a style={{ marginLeft: 8 }} onClick={clearProject}>
              清除
            </a>
          </span>
        )}
        <div style={{ flex: 1, minWidth: 12 }} />
        <Input.Search
          allowClear
          placeholder="搜索题目名称"
          style={{ width: 190 }}
          onSearch={(value) => setNameKeyword(value.trim())}
          onChange={(e) => {
            if (!e.target.value) setNameKeyword('');
          }}
        />
        <Input.Search
          allowClear
          placeholder="搜索笔记内容"
          style={{ width: 190 }}
          onSearch={(value) => setNoteKeyword(value.trim())}
          onChange={(e) => {
            if (!e.target.value) setNoteKeyword('');
          }}
        />
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
          刷新
        </Button>
      </div>

      <Table<UserBookView>
        rowKey="id"
        size="middle"
        components={TABLE_COMPONENTS}
        loading={loading}
        dataSource={rows}
        scroll={{ x: 980 }}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: (keys) => setSelectedKeys(keys),
        }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={hasFilter ? '没有符合条件的错题' : '练习后错题会出现在这里'}
            >
              {!hasFilter && (
                <Button type="primary" onClick={() => navigate('/repo/index')}>
                  去题库练习
                </Button>
              )}
            </Empty>
          ),
        }}
        pagination={pager(page, pageSize, total, setPage, setPageSize, (n) => `共 ${n} 条记录`)}
        columns={[
          {
            title: '题目',
            dataIndex: 'name',
            render: (_: unknown, row) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <a
                  style={{
                    fontWeight: 500,
                    fontSize: 13,
                    lineHeight: 1.6,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                  title={row.name}
                  onClick={() => practiceOne(row)}
                >
                  {row.name || '(无标题)'}
                </a>
                <span style={{ fontSize: 10, color: 'var(--bp-text-soft)', letterSpacing: '0.08em' }}>
                  {row.type === BOOK_TYPE_FAVORITE ? '收藏' : '错题'}
                  {' · 来源：'}
                  <span title={row.projectId || ''}>{projectLabel(row.projectId)}</span>
                </span>
              </div>
            ),
          },
          {
            title: '重点',
            width: 56,
            align: 'center',
            render: (_: unknown, row) => (
              <a
                title={isFocus(row) ? '取消重点' : '标为重点'}
                onClick={() => void toggleFocus(row)}
                style={{ fontSize: 15, lineHeight: 1 }}
              >
                {isFocus(row) ? (
                  <StarFilled style={{ color: 'var(--bp-orange)' }} />
                ) : (
                  <StarOutlined style={{ color: 'var(--bp-text-soft)' }} />
                )}
              </a>
            ),
          },
          {
            title: '错误次数',
            dataIndex: 'wrongTimes',
            width: 88,
            render: (value: number | undefined) => {
              const times = value ?? 0;
              return <Tag color={times >= 3 ? 'orange' : 'default'}>{times} 次</Tag>;
            },
          },
          { title: '状态', dataIndex: 'status', width: 84, render: (_: unknown, row) => statusTag(row) },
          {
            title: '笔记',
            dataIndex: 'note',
            width: 200,
            render: (value: string | undefined, row) => (
              <div onClick={() => setEditing(row)} title="点击编辑笔记" style={{ cursor: 'pointer' }}>
                {value ? (
                  <Typography.Paragraph
                    ellipsis={{ rows: 2, expandable: true }}
                    style={{ marginBottom: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                  >
                    {value}
                  </Typography.Paragraph>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>＋ 添加笔记</span>
                )}
              </div>
            ),
          },
          {
            title: '最近错误时间',
            dataIndex: 'updateAt',
            width: 130,
            render: (_: unknown, row) => (
              <span style={{ fontSize: 12 }}>{row.updateAt || row.createAt || '—'}</span>
            ),
          },
          {
            title: '操作',
            width: 120,
            render: (_: unknown, row) => (
              <Space size={10} style={{ fontSize: 12 }}>
                <a onClick={() => practiceOne(row)}>练这题</a>
                <Popconfirm
                  title="从错题本移除这条记录？"
                  description="题库里的题目不受影响。"
                  okText="移除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => void removeOne(row)}
                >
                  <a style={{ color: 'var(--bp-orange)' }}>移除</a>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title="编辑笔记"
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={submitEdit}
        confirmLoading={noteSaving}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        {editing?.name && (
          <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 12 }}>{editing.name}</div>
        )}
        <Form form={editForm} layout="vertical" preserve={false}>
          <Form.Item name="note" label="笔记内容">
            <Input.TextArea
              autoSize={{ minRows: 4, maxRows: 10 }}
              maxLength={2000}
              showCount
              placeholder="写下你的理解、易错点…"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
