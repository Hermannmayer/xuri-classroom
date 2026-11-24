import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  App,
  Button,
  Card,
  Drawer,
  Empty,
  message,
  Popconfirm,
  Segmented,
  Space,
  Spin,
  Table,
  Tag,
} from 'antd';
import { formatScore, isManualGraded } from '../../utils/scoring';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  RestOutlined,
  RobotOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import BackButton from '../../components/BackButton';
import MobileBatchBar from '../../components/MobileBatchBar';
import LinkAction from '../../components/LinkAction';
import TableScrollRegion from '../../components/TableScrollRegion';
import { get, getWithPagination, post } from '../../api';
import { can, loadAuthorities } from '../../auth/permissions';
import type { Answer, Project } from '../../schema/project';
import { flattenSchema } from '../../schema/flatten';
import type { AnswerValue } from '../../renderer/types';
import { TABLE_COMPONENTS } from '../repo/table';
import AnswerEditorModal from './data/AnswerEditorModal';
import AnswerCards from './data/AnswerCards';
import TrashDrawer from './data/TrashDrawer';
import GradeDrawer, { type GradableAnswer } from './data/GradeDrawer';
import AiGradeBatchModal from './data/AiGradeBatchModal';
import FilterBar from './data/FilterBar';
import ExportModal from './data/ExportModal';
import UnsubmittedPanel from './data/UnsubmittedPanel';
import {
  INITIAL_FILTERS,
  flattenClassLeaves,
  hasActiveFilter,
  toFilterParams,
  type AnswerFilterParams,
  type ClassNode,
  type ClassOption,
  type FilterState,
} from './data/filters';
import {
  EMPTY,
  compareText,
  formatAnswer,
  isDataQuestion,
  questionHeader,
} from './data/format';
import { PERMISSION_CODES } from '../../auth/permission-codes';

const MOBILE_QUERY = '(max-width: 767.98px)';

/** 批改状态还没进公共 Answer 类型（公共类型在 schema/project.ts，本次不改）， 这里集中一处取值，避免每个用到的地方都写一遍断言 */
function gradeStatusOf(row: Answer): string | undefined {
  return (row as GradableAnswer).gradeStatus;
}

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

/** 数据列表 */
export default function SurveyData() {
  const { id = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { modal } = App.useApp();
  const mobile = useIsMobile();




  const classId = searchParams.get('classId') || undefined;

  const [batchOpen, setBatchOpen] = useState(false);

  const [project, setProject] = useState<Project>();
  const scoringEnabled =
    project?.mode === 'exam' ? project.setting?.examSetting?.scoringEnabled !== false : project?.setting?.examSetting?.scoringEnabled === true;
  const [rows, setRows] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<string[]>([]);

  /** 过滤条件（classId 不在里面，走 URL） */
  const [filters, setFilters] = useState<FilterState>(() => {

    const preset = searchParams.get('gradeStatus');
    return preset === 'pending' || preset === 'graded' || preset === 'ai'
      ? { ...INITIAL_FILTERS, gradeStatus: preset }
      : INITIAL_FILTERS;
  });

  const [nameInput, setNameInput] = useState('');
  const [nameQuery, setNameQuery] = useState('');

  const [timeOnServer, setTimeOnServer] = useState(true);

  const brokenTimeRange = useRef('');
  const degradedWarned = useRef(false);


  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);

  const [detail, setDetail] = useState<Answer>();

  /** 关闭详情抽屉：除了清状态，**必须把 URL 里的 answerId 一起去掉** */
  const closeDetail = useCallback(() => {
    setDetail(undefined);
    if (searchParams.get('answerId')) {
      const next = new URLSearchParams(searchParams);
      next.delete('answerId');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);





  useEffect(() => {
    const answerId = searchParams.get('answerId');
    if (!answerId || rows.length === 0) return;
    const row = rows.find((item) => item.id === answerId);
    if (row && detail?.id !== answerId) setDetail(row);
  }, [searchParams, rows, detail]);

  const [grading, setGrading] = useState<string>();
  const [editor, setEditor] = useState<EditorState>();
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);


  const [authorities, setAuthorities] = useState<string[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<{
    filters: AnswerFilterParams;
    count: number;
    ids: string[];
  }>();

  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);


  const canExport = can(authorities, PERMISSION_CODES.answerExport);
  const canCreate = can(authorities, PERMISSION_CODES.answerCreate);
  const canUpdate = can(authorities, PERMISSION_CODES.answerUpdate);
  const canDelete = can(authorities, PERMISSION_CODES.answerDelete);



  const canUpload = can(authorities, PERMISSION_CODES.answerUpload);
  const canRestore = can(authorities, PERMISSION_CODES.answerRestore);

  const canGrade = can(authorities, PERMISSION_CODES.answerGrade);

  const canOpenTrash = canRestore || canDelete;

  const canUseAi = can(authorities, PERMISSION_CODES.aiUse);
  const canBatchGrade = canGrade && canUseAi;



  useEffect(() => {
    if (canBatchGrade && searchParams.get('ai') === 'grade') setBatchOpen(true);
  }, [canBatchGrade, searchParams]);

  /** 关掉批量批改弹窗：顺手把 ?ai= 抹掉 */
  const closeBatch = useCallback(() => {
    setBatchOpen(false);
    if (searchParams.get('ai') === 'grade') {
      const next = new URLSearchParams(searchParams);
      next.delete('ai');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  /* ------ 过滤条件 ------ */

  /** 选班级只改 URL，不另存一份 state：报表页带着 ?classId= 跳过来时不用做「同步」这件事， */
  const setClassFilter = useCallback(
    (next?: string) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next) params.set('classId', next);
          else params.delete('classId');
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const patchFilters = useCallback((patch: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);


  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setNameInput('');
    setNameQuery('');
    setClassFilter(undefined);
  }, [setClassFilter]);


  useEffect(() => {
    const timer = window.setTimeout(() => setNameQuery(nameInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [nameInput]);


  useEffect(() => {
    let alive = true;
    void get<ClassNode[]>('/api/teaching/classes/tree')
      .then((list) => {
        if (alive) setClassOptions(flattenClassLeaves(Array.isArray(list) ? list : []));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  /** URL 里的班级不在候选里（换班 / 权限变了 / 树没拉到）：补一项出来，别让人看不到当前筛的是哪个班 */
  const classSelectOptions = useMemo<ClassOption[]>(() => {
    if (!classId || classOptions.some((item) => item.value === classId)) return classOptions;
    return [{ value: classId, label: `班级 ${classId.slice(0, 8)}`, name: '' }, ...classOptions];
  }, [classOptions, classId]);

  /** 服务端过滤参数：列表、Excel、PDF 三处共用同一份口径（见 data/filters.ts） */
  const filterParams = useMemo<AnswerFilterParams>(
    () => toFilterParams(filters, classId, nameQuery),
    [filters, classId, nameQuery],
  );


  const rangeKey = `${filterParams.startTime ?? ''}|${filterParams.endTime ?? ''}`;
  const hasTimeFilter = Boolean(filterParams.startTime || filterParams.endTime);

  /** 取一份答卷列表 */
  const fetchAnswers = useCallback(
    (withTime: boolean) => {
      const { startTime, endTime, ...rest } = filterParams;
      return getWithPagination<Answer>('/api/answer/list', {
        projectId: id,
        current: 1,
        pageSize: -1,
        ...rest,
        startTime: withTime ? startTime : undefined,
        endTime: withTime ? endTime : undefined,
      });
    },
    [id, filterParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {

      void get<Project>('/api/project', { id })
        .then((value) => setProject(value))
        .catch(() => undefined);
      let list: Answer[] = [];

      if (hasTimeFilter && brokenTimeRange.current !== rangeKey) {
        try {
          list = (await fetchAnswers(true)).data;
          setTimeOnServer(true);
        } catch (e) {
          const code = (e as { code?: number }).code;
          if (code === 401 || code === 403 || code === -1) throw e;
          brokenTimeRange.current = rangeKey;
          list = (await fetchAnswers(false)).data;
          setTimeOnServer(false);
          if (!degradedWarned.current) {
            degradedWarned.current = true;
            message.warning('按交卷时间过滤暂时只在前端生效（后端未接受该参数），筛选结果仍然准确');
          }
        }
      } else {
        list = (await fetchAnswers(false)).data;
        setTimeOnServer(!hasTimeFilter);
      }
      setRows(list);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [fetchAnswers, hasTimeFilter, rangeKey, id]);

  useEffect(() => {
    void load();
  }, [load]);


  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [filterParams]);


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

  /** 前端只留三道兜底（服务端已经过滤过一遍）： */
  const filtered = useMemo(() => {
    const [from, to] = filters.range ?? [];
    return rows.filter((row) => {
      if (filters.submitStatus === 'submitted' && row.tempSave !== 1) return false;

      if (filters.gradeStatus !== 'all' && filters.gradeStatus !== 'ai' && gradeStatusOf(row) !== filters.gradeStatus) {
        return false;
      }
      if (!timeOnServer && (from || to)) {
        const at = row.createAt ? dayjs(row.createAt) : undefined;
        if (!at?.isValid()) return false;
        if (from && at.isBefore(from.startOf('day'))) return false;
        if (to && at.isAfter(to.endOf('day'))) return false;
      }
      return true;
    });
  }, [rows, filters.submitStatus, filters.gradeStatus, filters.range, timeOnServer]);

  /** 顶部提示用：当前拉取范围内有多少份匿名答卷（不随日期/姓名筛选变化） */
  const anonymousCount = useMemo(() => rows.filter((row) => row.isAnonymous).length, [rows]);


  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(
    () => (mobile ? filtered.slice((page - 1) * pageSize, page * pageSize) : []),
    [mobile, filtered, page, pageSize],
  );


  const unsubmittedMode = filters.submitStatus === 'unsubmitted';

  const filtering = hasActiveFilter(filters, classId, nameInput);

  const aiEmptyText = '「AI 待复核」只显示已由 AI 预批改、等待人工复核的答卷，可先用「批量 AI 批改」生成';

  const emptyText = rows.length
    ? filters.gradeStatus === 'pending'
      ? '没有待批改的答卷'
      : filters.gradeStatus === 'ai'
        ? aiEmptyText
        : '当前筛选没有匹配的答卷'
    : filtering
      ? filters.gradeStatus === 'ai'
        ? aiEmptyText
        : '当前筛选没有匹配的答卷'
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


        sorter: (a: Answer, b: Answer) => (a.createAt ?? '').localeCompare(b.createAt ?? ''),
        render: (v?: string) => <span style={{ fontSize: 12 }}>{v || EMPTY}</span>,
      },
      {
        title: '答卷人',
        dataIndex: 'createByName',
        width: 110,

        fixed: 'left',
        sorter: (a: Answer, b: Answer) =>
          (a.answererName ?? a.createByName ?? a.createBy ?? '').localeCompare(
            b.answererName ?? b.createByName ?? b.createBy ?? '',
            'zh-Hans-CN',
          ),
        render: (v: string | undefined, row: Answer) => {
          const typed = (row.answererName ?? '').trim();
          return (
            <span style={{ fontSize: 12 }}>
              {typed || (!row.isAnonymous && (v || row.createBy?.slice(0, 8))) || '匿名'}
              {row.isAnonymous && typed && (
                <Tag color="default" style={{ marginInlineStart: 6 }}>
                  匿名
                </Tag>
              )}
            </span>
          );
        },
      },
      {
        title: '状态',
        dataIndex: 'tempSave',
        width: 132,
        render: (v: number | undefined, row: Answer) => (
          <Space size={4}>
            {v === 1 ? <Tag color="success">已提交</Tag> : <Tag color="warning">暂存</Tag>}
            {gradeStatusOf(row) === 'pending' && <Tag color="processing">待批改</Tag>}
            {(row as { aiGraded?: boolean }).aiGraded && <Tag color="purple">AI 待复核</Tag>}
          </Space>
        ),
      },
      ...(scoringEnabled
        ? [
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
          ]
        : []),
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
        width: canGrade ? 108 : 64,
        fixed: 'right',
        render: (_: unknown, row: Answer) => (
          <Space size={8}>

            {canGrade && gradeStatusOf(row) && gradeStatusOf(row) !== 'none' && (
              <LinkAction onClick={() => setGrading(row.id)}>
                {gradeStatusOf(row) === 'pending' ? '批改' : '复核'}
              </LinkAction>
            )}
            <LinkAction onClick={() => setDetail(row)}>详情</LinkAction>
          </Space>
        ),
      },
    ];

    return [...fixedColumns, ...questionColumns, ...opsColumn];
  }, [questions, cells, page, pageSize, scoringEnabled, canGrade]);

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
          setPage(1);
          await load();
        } catch (e) {
          message.error((e as Error).message);
        }
      },
    });
  };

  const removeSelected = () => removeRows(selected);

  /** 导出弹窗自己管密码/令牌/进度（见 data/ExportModal），这里只负责开；范围在打开时快照，避免后台筛选/自动填充把范围改掉 */
  const openExport = () => {
    setExportScope({ filters: filterParams, count: filtered.length, ids: selected });
    setExportOpen(true);
  };

  /** 切到分析页时带上当前班级：老师看的就是同一个班，过去不该再选一次 */
  const goReport = () => {
    const params = new URLSearchParams();
    if (classId) {
      params.set('classId', classId);
      const current = classSelectOptions.find((item) => item.value === classId);
      if (current?.name) params.set('className', current.name);
    }
    const query = params.toString();
    navigate(`/survey/${id}/report${query ? `?${query}` : ''}`);
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

  const detailQuestions = useMemo(() => {


    const schema = detail?.survey ?? project?.survey;
    return schema ? flattenSchema(schema).filter(isDataQuestion) : [];
  }, [detail, project]);

  /** 逐题得分：examInfo 是弱类型（Record），这里收窄一次给详情抽屉用 */
  const detailScores = useMemo(
    () => (detail?.examInfo as { questionScore?: Record<string, number> } | undefined)?.questionScore ?? {},
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
        /* 表格单元格是透明的（主题 colorBgContainer: transparent），固定列横向滚动时会透出下层内容，这里补底色。
           底色走主题变量，不能再写死暗色蓝图的值：亮色主题下 #263f62 会变成深蓝底 + 深灰字，几乎看不清。 */
        .sk-data-grid .ant-table-thead > tr > th {
          background: var(--bp-panel-strong) !important;
          color: var(--bp-text-soft) !important;
        }
        .sk-data-grid .ant-table-thead > tr > .ant-table-cell-fix-left,
        .sk-data-grid .ant-table-thead > tr > .ant-table-cell-fix-right {
          background: var(--bp-panel-strong) !important;
          color: var(--bp-text-soft) !important;
        }
        .sk-data-grid .ant-table-tbody > tr > .ant-table-cell-fix-left,
        .sk-data-grid .ant-table-tbody > tr > .ant-table-cell-fix-right { background: var(--bp-panel); }
        .sk-data-grid .ant-table-tbody > tr:hover > .ant-table-cell-fix-left,
        .sk-data-grid .ant-table-tbody > tr:hover > .ant-table-cell-fix-right { background: var(--bp-blue-weak); }
        .sk-data-grid .ant-table-tbody > tr.ant-table-row-selected > .ant-table-cell-fix-left,
        .sk-data-grid .ant-table-tbody > tr.ant-table-row-selected > .ant-table-cell-fix-right {
          background: var(--bp-option-hover);
        }
        /* 手机上工具条按钮要够 36px 才好点 */
        .sk-data-toolbar-mobile .ant-btn { height: 36px; }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <BackButton label="返回" fallback={'/survey/' + id} style={{ paddingLeft: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
            DATA / 数据与分析
          </div>
          <div
            className="bp-title"
            style={{ fontSize: 16, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {project?.name || id} · 共 {rows.length} 份
            {anonymousCount > 0 ? `（含匿名 ${anonymousCount} 份）` : ''}
            {!unsubmittedMode && filtering && filtered.length !== rows.length
              ? ` · 筛选后 ${filtered.length} 份`
              : ''}
          </div>
        </div>
        <div style={{ flex: 1 }} />

        <Segmented
          value="data"
          options={[
            { label: '数据', value: 'data' },
            { label: '分析', value: 'report' },
          ]}
          onChange={(value) => {
            if (value === 'report') goReport();
          }}
        />


        {canBatchGrade && !unsubmittedMode ? (
          <Button
            icon={<RobotOutlined />}
            disabled={rows.length === 0}
            title={rows.length === 0 ? '还没有答卷，没有可批改的内容' : undefined}
            onClick={() => setBatchOpen(true)}
          >
            批量 AI 批改
          </Button>
        ) : null}
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
          刷新
        </Button>
      </div>

      <Card className="bp-corners bp-card">

        <FilterBar
          mobile={mobile}
          classOptions={classSelectOptions}
          classId={classId}
          onClassChange={setClassFilter}
          value={filters}
          onPatch={patchFilters}
          nameValue={nameInput}
          onNameChange={setNameInput}
          onReset={resetFilters}
          resetVisible={filtering}
        />

        <div
          className={mobile ? 'sk-data-toolbar-mobile' : undefined}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}
        >
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditor({ mode: 'create' })}>
              添加数据
            </Button>
          )}

          {!mobile && canUpdate && !unsubmittedMode && (
            <Button icon={<EditOutlined />} disabled={selected.length !== 1} onClick={editSelected}>
              编辑数据
            </Button>
          )}
          {!mobile && !unsubmittedMode && deleteButton}
          {canUpload && (
            <Button icon={<UploadOutlined />} loading={importing} onClick={() => fileRef.current?.click()}>
              导入数据
            </Button>
          )}
          {canExport && !unsubmittedMode && (
            <Button icon={<DownloadOutlined />} disabled={filtered.length === 0} onClick={openExport}>
              导出数据
            </Button>
          )}
          {canOpenTrash && (
            <Button icon={<RestOutlined />} onClick={() => setTrashOpen(true)}>
              回收站
            </Button>
          )}
          {mobile && !unsubmittedMode && deleteButton}
          {!mobile && <div style={{ flex: 1 }} />}
        </div>

        {!mobile && !unsubmittedMode && selected.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--bp-orange)', marginBottom: 8 }}>
            已选中 {selected.length} 条
          </div>
        )}

        {unsubmittedMode ? (
          <UnsubmittedPanel projectId={id} classId={classId} mobile={mobile} />
        ) : mobile ? (
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


                style: mobile ? { paddingBottom: 56 } : undefined,
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


      <ExportModal
        open={exportOpen}
        projectId={id}
        projectName={project?.name}
        filters={exportScope?.filters ?? filterParams}
        filteredCount={exportScope?.count ?? filtered.length}
        selectedIds={exportScope?.ids ?? selected}
        onClose={() => {
          setExportOpen(false);
          setExportScope(undefined);
        }}
      />


      <AiGradeBatchModal
        open={batchOpen}
        projectId={id}
        classId={classId}
        onClose={closeBatch}
        onChanged={() => void load()}
        onReview={(answerId) => setGrading(answerId)}
      />

      {mobile && !unsubmittedMode && (
        <MobileBatchBar
          allIds={filtered.map((row) => row.id)}
          selected={selected}
          onChange={setSelected}
          unit="条"
          actions={
            <>
              {canExport && (
                <Button size="small" onClick={openExport}>
                  导出勾选
                </Button>
              )}
              {canDelete && (
                <Popconfirm
                  title={`删除选中的 ${selected.length} 份答卷？`}
                  description="可在回收站恢复（有权限时）。"
                  okText="删除"
                  cancelText="取消"
                  onConfirm={removeSelected}
                >
                  <Button danger size="small">
                    删除
                  </Button>
                </Popconfirm>
              )}
            </>
          }
        />
      )}

      <GradeDrawer
        open={Boolean(grading)}
        answerId={grading}
        onClose={() => setGrading(undefined)}
        onChanged={() => void load()}
      />

      <Drawer
        title="答卷详情"
        placement="right"
        size="min(520px, 100vw)"
        open={Boolean(detail)}
        onClose={closeDetail}
      >
        {detail && (
          <Space orientation="vertical" size={14} style={{ width: '100%' }}>
            <div style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
              提交时间 {detail.createAt || EMPTY}
              {detail.answererName || detail.createByName ? ` · ${detail.answererName || detail.createByName}` : ''}
              {scoringEnabled && typeof detail.examScore === 'number' && detail.examScore > 0
                ? ` · 得分 ${detail.examScore}`
                : ''}
            </div>
            <hr className="bp-dim" style={{ margin: 0 }} />
            {detailQuestions.map((q, i) => {
              const got = detailScores[q.id];
              const max = q.schema.attribute?.examScore;
              const manual = isManualGraded(q.schema.attribute);

              const verdict =
                manual && typeof got !== 'number'
                  ? { text: '待批改', color: 'processing' as const }
                  : typeof got !== 'number'
                    ? { text: '未判分', color: 'default' as const }
                    : typeof max === 'number' && max > 0
                      ? got >= max
                        ? { text: `正确 ${formatScore(got)}/${formatScore(max)}`, color: 'success' as const }
                        : got > 0
                          ? { text: `部分得分 ${formatScore(got)}/${formatScore(max)}`, color: 'warning' as const }
                          : { text: `错误 0/${formatScore(max)}`, color: 'error' as const }
                      : { text: `得分 ${formatScore(got)}`, color: 'default' as const };
              return (
                <div key={q.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12, marginBottom: 4 }}>
                    <span className="bp-tag">{q.number ?? i + 1}</span>
                    <span style={{ flex: '1 1 auto', minWidth: 0 }}>{q.title || q.type}</span>
                    <Tag color={verdict.color} style={{ marginInlineEnd: 0, fontSize: 10 }}>
                      {verdict.text}
                    </Tag>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--bp-text)', paddingLeft: 2 }}>
                    {formatAnswer(q, (detail.answer ?? {})[q.id] as AnswerValue)}
                  </div>
                </div>
              );
            })}
            {detailQuestions.length === 0 && <Empty description="这份答卷没有可展示的题目" />}
          </Space>
        )}
      </Drawer>
    </div>
  );
}
