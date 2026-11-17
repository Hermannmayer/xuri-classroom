/**
 * 班级答卷抽屉：按 projectId + deptId 查看本班答卷（顶部统计条 + 可筛选列表 + 未交名单），
 * 并支持一次导出多种格式（Excel 明细 / 成绩单 PDF / 答题卷 PDF / 长图 PNG / 成绩确认单）。
 *
 * <p>这里是三份互相独立的数据：答卷列表（统计条与表格都基于它）、未交名单（应考/已交/未交）、
 * 项目详情（及格线与满分）。任一请求失败只让对应的数字变「—」并给「重试」，不牵连其它区块——
 * 未交名单接口要 class:detail，题库练习（projectId=exercise）根本调不通，不能因此整页报错。
 *
 * <p>导出只有两个出口：Excel 明细走同步下载 /api/answer/download；其余四种「每人一份」的产物
 * 合成**一个** pdf-job（outputs 数组），后端一次渲染完打成 ZIP。拆成四次导出只是在 4 核机器上
 * 把同一批答卷多渲染三遍、多等三倍，没有任何收益。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  App,
  Button,
  Checkbox,
  DatePicker,
  Drawer,
  Empty,
  Input,
  Modal,
  Progress,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CopyOutlined,
  DownloadOutlined,
  FileImageOutlined,
  PaperClipOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  cancelAnswerPdfJob,
  createAnswerPdfJob,
  download,
  downloadAnswerPdfJob,
  get,
  getAnswerPdfJob,
  getWithPagination,
  post,
} from '../../api';
import type { AnswerExportOutput, AnswerPdfJobRequest, AnswerPdfJobView } from '../../api';
import { flattenSchema } from '../../schema/flatten';
import type { Project } from '../../schema/project';
import type { QuestionType, SurveySchema } from '../../schema/types';

/** 与后端班级答卷列表项对齐（AnswerView） */
interface ClassAnswerRow {
  id: string;
  projectId?: string;
  createBy?: string;
  createByName?: string;
  answererName?: string;
  isAnonymous?: boolean;
  examScore?: number | null;
  /** 后端 Date 序列化：字符串或 epoch 毫秒 */
  createAt?: string | number;
  tempSave?: number;
  /** none 无需批改 / pending 待批改 / graded 已批改 */
  gradeStatus?: string;
  /**
   * 第几次作答（从 0 开始）。后端 t_answer 有这个字段，但 AnswerView 目前没下发，
   * 所以声明成可选：有就用后端的，没有就按同一学员的交卷顺序在前端推导。
   */
  attemptNo?: number;
  metaInfo?: { answerInfo?: { startTime?: number; endTime?: number } } | null;
  /** 每题分值（questionId → 分），用于推卷面满分 */
  examInfo?: { questionScore?: Record<string, number> } | null;
  /** 答案原文：附件列要从这里看签名/上传题有没有 fileId */
  answer?: Record<string, unknown> | null;
  /** 交卷时的题树快照：附件列据此分清哪些题存的是文件 id */
  survey?: SurveySchema | null;
  /** 客观题机器分小计 / 主观题人工分小计：接口暂未下发，哪天给了就直接显示 */
  objectiveScore?: number | null;
  manualScore?: number | null;
}

/** 未交名单接口的行（后端 UnsubmittedStudentView.Student） */
interface RosterStudent {
  id: string;
  name?: string;
  phone?: string;
}

/** 未交名单接口（后端 UnsubmittedStudentView） */
interface RosterView {
  /** 班级学员总数（主组 + 兼报组） */
  total?: number;
  /** 其中已正式交卷的人数 */
  submitted?: number;
  /** 还没交的人；班级人多时后端只回前 500 条 */
  list?: RosterStudent[];
}

/** 表格里的一行：原始答卷 + 前端推导出来的展示字段 */
interface AnswerRowView extends ClassAnswerRow {
  /** 第几次作答（从 0 开始） */
  attempt?: number;
  /** 作答用时（毫秒） */
  duration?: number;
  /** 有手写签名 */
  hasSignature: boolean;
  /** 上传题图片/文件个数 */
  uploadCount: number;
}

type TabKey = 'answers' | 'unsubmitted';
type StatusFilter = 'all' | 'submitted' | 'pending';

/**
 * pdf-job 的 outputs 取值（后端契约已冻结），每个值产出「每人一份」的东西。
 * 名字是后端的，别改；界面文案见 PDF_FORMATS。
 */
type PdfOutput = AnswerExportOutput;

/**
 * 四种异步产物的界面配置。
 *
 * <p>dir 是后端 ZIP 里的子目录名（契约固定），提示文案照着它写——老师拿到 ZIP 会按目录名认东西。
 * 数组顺序 = 勾选顺序 = ZIP 子目录的列举顺序。
 */
const PDF_FORMATS: { key: PdfOutput; label: string; dir: string }[] = [
  { key: 'answerPdf', label: '成绩单 PDF（每人一份，含分数摘要）', dir: '成绩单' },
  { key: 'answerSheetPdf', label: '答题卷 PDF（和学员答题时一样）', dir: '答题卷' },
  { key: 'answerImage', label: '答卷长图（PNG，每人一张，省纸）', dir: '长图' },
  { key: 'confirmSheetPdf', label: '成绩确认单（一页，可打印签字）', dir: '确认单' },
];

/** 导出设置：弹窗里的选择 */
interface ExportOptions {
  /** 第几次作答（从 0 开始）；undefined = 全部轮次 */
  attemptNo?: number;
  range?: [Dayjs, Dayjs] | null;
  includeAnalysis: boolean;
  /** Excel 明细（.xlsx，同步下载） */
  excel: boolean;
  /** 以下四种合成一个异步任务，勾几种生成几种 */
  answerPdf: boolean;
  answerSheetPdf: boolean;
  answerImage: boolean;
  confirmSheetPdf: boolean;
}

const DEFAULT_OPTIONS: ExportOptions = {
  attemptNo: undefined,
  range: null,
  // 解析默认关：考试没结束时放解析等于泄题，老师要显式勾
  includeAnalysis: false,
  // 默认「Excel 明细 + 成绩单 PDF」：日常最常用的两样，一个进表格、一个发学员/归档
  excel: true,
  answerPdf: true,
  answerSheetPdf: false,
  answerImage: false,
  confirmSheetPdf: false,
};

/**
 * 一次拉多少份答卷。
 *
 * <p>统计条（应考/已交/平均/最高/最低/及格率）与姓名、状态、时间筛选都要求拿到整班数据，
 * 所以这里不分页，一次拉回来在前端分页；500 和未交名单接口的硬上限对齐，够一个教学班用。
 * 真超过 500 份（大量补考）时列表上方会写清「统计基于已加载的最近 500 份」，不装作是全部。
 */
const ANSWER_LIMIT = 500;

/**
 * 题库练习的哨兵 projectId：班级资源面板打开「练习记录」时传的就是这个值。
 * 它不是真项目（没有 setting、没有班级花名册），未交名单接口对它只会报「项目不存在」，
 * 所以干脆不发这个请求，也就不会在抽屉顶上挂一条永远消不掉的错误提示。
 */
const EXERCISE_PROJECT_ID = 'exercise';

/**
 * 附件列关心的题型：只有手写签名与上传题才是老师要核对的原件。
 * 条码（Barcode）虽然也存文件 id，但那是系统生成的图，不该在「附件」里出现。
 */
const FILE_TYPES = new Set<QuestionType>(['Signature', 'Upload']);

const ATTEMPT_OPTIONS = [1, 2, 3, 4, 5].map((ordinal) => ({ value: ordinal - 1, label: `第 ${ordinal} 次作答` }));

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'submitted', label: '已交' },
  { value: 'pending', label: '待批改' },
];

/** 批改状态 → 标签（none = 卷里没有人工评分题，不是「没批」） */
const GRADE_TAGS: Record<string, { color: string; text: string }> = {
  none: { color: 'default', text: '无主观题' },
  pending: { color: 'warning', text: '待批改' },
  graded: { color: 'success', text: '已批改' },
};

const scoreText = (value?: number | null) =>
  value === null || value === undefined || Number.isNaN(Number(value)) ? '—' : Number(value).toFixed(1);

/** 「12 分 30 秒」：老师看的是人能读的时长，不是 750000 */
function formatDuration(ms?: number): string {
  if (!ms || ms <= 0 || Number.isNaN(ms)) return '—';
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours} 小时 ${minutes} 分`;
  if (minutes > 0) return `${minutes} 分 ${seconds} 秒`;
  return `${seconds} 秒`;
}

/** 交卷时间戳（毫秒）；拿不到就当 0，排序与时间筛选都会把它排到最后 */
const timeOf = (row: ClassAnswerRow): number => {
  if (!row.createAt) return 0;
  const parsed = dayjs(row.createAt).valueOf();
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * 「同一个人」的判定键。
 *
 * <p>有账号就用 createBy（补考也只有 createBy 相同）；匿名答卷没有 createBy，
 * 按行拆开算，避免把两个同名的陌生人当成一个人的多次作答。
 */
const personKey = (row: ClassAnswerRow): string => row.createBy || `row:${row.id}`;

/** 从签名/上传题的答案里取出 fileId（答案里存的是文件 id） */
function fileIdsOf(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return typeof value === 'string' && value ? [value] : [];
  }
  const out: string[] = [];
  for (const item of Object.values(value as Record<string, unknown>)) {
    if (typeof item === 'string' && item) out.push(item);
    else if (Array.isArray(item)) {
      for (const sub of item) if (typeof sub === 'string' && sub) out.push(sub);
    }
  }
  return out;
}

const jobStatusText = (status: AnswerPdfJobView['status']): string => {
  switch (status) {
    case 'queued':
      return '排队中';
    case 'running':
      return '生成中';
    case 'done':
      return '已完成';
    case 'failed':
      return '失败';
    case 'canceled':
      return '已取消';
    default:
      return status;
  }
};

/** 复制到剪贴板的文本：制表符分隔，粘进 Excel / 微信都能直接用 */
function rosterClipboardText(list: RosterStudent[]): string {
  const header = '姓名\t手机号';
  const lines = list.map((item) => (item.name || '') + '\t' + (item.phone || ''));
  return [header, ...lines].join('\n');
}

/**
 * 导出本班答卷（Excel 明细）：先用 POST /api/answer/export/token 换一次性 token，
 * 再走带 cookie 的 download 下载 xlsx（后端错误会以 JSON 返回并转成中文提示）。
 *
 * <p>startTime / endTime / attemptNo 都是可选：不传就是「整班、全部轮次」。
 * 轮次与时间对按班导出是后端 downloadByClass 里已经支持的过滤条件，不是前端假筛。
 */
export async function downloadClassAnswers(params: {
  projectId: string;
  deptId: string;
  projectName?: string;
  deptName?: string;
  startTime?: string;
  endTime?: string;
  attemptNo?: number;
}) {
  const tokenRes = await post<{ exportToken?: string; expiresIn?: number }>('/api/answer/export/token', {});
  const fileName = `${params.projectName || '考试'}-${params.deptName || '班级'}-答卷.xlsx`;
  await download(
    '/api/answer/download',
    {
      projectId: params.projectId,
      classId: params.deptId,
      type: 'answer',
      exportToken: tokenRes?.exportToken,
      startTime: params.startTime,
      endTime: params.endTime,
      attemptNo: params.attemptNo,
    },
    fileName,
  );
}

/** 统计条里的一格：一行数字，点得动的格子（未交）带 pointer 与键盘操作 */
function Metric({
  label,
  value,
  hint,
  tone,
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'warn' | 'ok';
  onClick?: () => void;
}) {
  const color = tone === 'warn' ? 'var(--bp-orange)' : tone === 'ok' ? 'var(--bp-blue)' : undefined;
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      title={typeof hint === 'string' ? hint : undefined}
      style={{
        minWidth: 0,
        padding: '8px 10px',
        borderRadius: 8,
        border: '1px solid var(--bp-line-soft)',
        background: 'var(--bp-panel-soft)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.35, color }}>{value}</div>
      {hint && (
        <div
          style={{
            fontSize: 10,
            color: 'var(--bp-text-soft)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

/**
 * 某个班的答卷抽屉：查看本班学员答卷（统计/筛选在前端做），并支持导出本班答卷
 * （Excel 明细走同步下载；PDF/长图/确认单走异步任务 + 进度轮询，产物是一个 ZIP）。
 */
export default function ClassAnswersDrawer({
  open,
  projectId,
  deptId,
  deptName,
  projectName,
  onClose,
}: {
  open: boolean;
  projectId: string;
  deptId: string;
  deptName?: string;
  projectName?: string;
  onClose: () => void;
}) {
  const { message } = App.useApp();

  /* ------ 数据：答卷列表 / 未交名单 / 项目详情，各自独立失败 ------ */
  const [rows, setRows] = useState<ClassAnswerRow[]>([]);
  const [rowsTotal, setRowsTotal] = useState(0);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState<string>();

  const [roster, setRoster] = useState<RosterView>();
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string>();

  /** 项目详情只用来读及格线与满分：拿不到就按答卷里的每题分值兜底，不阻塞任何东西 */
  const [project, setProject] = useState<Project>();

  /** 两个重试计数器：重试一个请求不要连带把另一个也刷一遍 */
  const [answersReload, setAnswersReload] = useState(0);
  const [rosterReload, setRosterReload] = useState(0);

  /* ------ 列表筛选（都在前端做：数据本来就整班拉回来了） ------ */
  const [tab, setTab] = useState<TabKey>('answers');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  /* ------ 导出弹窗与异步任务 ------ */
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_OPTIONS);
  const [job, setJob] = useState<AnswerPdfJobView | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const pollTimer = useRef<number | null>(null);
  const polling = useRef(false);
  const jobRef = useRef<AnswerPdfJobView | null>(null);
  const running = !!job && (job.status === 'queued' || job.status === 'running');

  useEffect(() => {
    if (!open || !projectId || !deptId) return;
    let alive = true;
    setRowsLoading(true);
    setRowsError(undefined);
    getWithPagination<ClassAnswerRow>('/api/teaching/classes/answers', {
      projectId,
      deptId,
      current: 1,
      pageSize: ANSWER_LIMIT,
    })
      .then((res) => {
        if (!alive) return;
        setRows(Array.isArray(res?.data) ? res.data : []);
        setRowsTotal(res?.total ?? 0);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setRowsError((e as Error).message);
        setRows([]);
        setRowsTotal(0);
      })
      .finally(() => {
        if (alive) setRowsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, projectId, deptId, answersReload]);

  useEffect(() => {
    if (!open || !projectId || !deptId) return;
    if (projectId === EXERCISE_PROJECT_ID) {
      // 题库练习没有花名册：统计条里应考/未交留「—」，也不去撞一个必然失败的接口
      setRoster(undefined);
      setRosterError(undefined);
      setRosterLoading(false);
      return;
    }
    let alive = true;
    setRosterLoading(true);
    setRosterError(undefined);
    get<RosterView>('/api/teaching/classes/unsubmitted', { projectId, deptId })
      .then((res) => {
        if (!alive) return;
        setRoster(res ?? undefined);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        // 只影响应考/已交/未交三个数字，不顶掉答卷列表
        setRosterError((e as Error).message);
        setRoster(undefined);
      })
      .finally(() => {
        if (alive) setRosterLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, projectId, deptId, rosterReload]);

  useEffect(() => {
    if (!open || !projectId) return;
    let alive = true;
    setProject(undefined);
    get<Project>('/api/project', { id: projectId })
      .then((detail) => {
        if (alive) setProject(detail);
      })
      .catch(() => {
        // 只是拿及格线：项目读不到就退回「满分 60%」的兜底，不打扰老师
        if (alive) setProject(undefined);
      });
    return () => {
      alive = false;
    };
  }, [open, projectId]);

  // 换班/换考试或重新打开时回到默认筛选：上一个班的搜索词带到下一个班只会让人以为没数据
  useEffect(() => {
    if (!open) return;
    setTab('answers');
    setKeyword('');
    setStatusFilter('all');
    setRange(null);
    setPage(1);
  }, [open, projectId, deptId]);

  useEffect(() => {
    jobRef.current = job;
  }, [job]);

  /* ------ 前端推导：轮次 / 用时 / 附件 ------ */
  const fileQuestions = useMemo(() => {
    // 题 id → 题型：附件列要知道哪些题存的是文件 id（不同试卷/不同版本各建一次，别重复拍平）
    const map = new Map<string, QuestionType>();
    const seen = new Set<SurveySchema>();
    for (const row of rows) {
      const survey = row.survey;
      if (!survey || seen.has(survey)) continue;
      seen.add(survey);
      for (const question of flattenSchema(survey)) {
        if (FILE_TYPES.has(question.type)) map.set(question.id, question.type);
      }
    }
    return map;
  }, [rows]);

  const rowsView = useMemo<AnswerRowView[]>(() => {
    const byPerson = new Map<string, ClassAnswerRow[]>();
    for (const row of rows) {
      const key = personKey(row);
      const list = byPerson.get(key);
      if (list) list.push(row);
      else byPerson.set(key, [row]);
    }
    // 轮次：后端按「同一人 + 交卷顺序」分配 attempt_no，前端用同样的口径补一遍
    const attemptOf = new Map<string, number>();
    for (const list of byPerson.values()) {
      [...list]
        .sort((left, right) => timeOf(left) - timeOf(right))
        .forEach((row, index) => attemptOf.set(row.id, index));
    }
    return rows.map((row) => {
      const info = row.metaInfo?.answerInfo;
      const duration =
        typeof info?.startTime === 'number' && typeof info?.endTime === 'number' && info.endTime > info.startTime
          ? info.endTime - info.startTime
          : undefined;
      let hasSignature = false;
      let uploadCount = 0;
      for (const [questionId, type] of fileQuestions) {
        const value = row.answer?.[questionId];
        if (value === undefined || value === null) continue;
        const ids = fileIdsOf(value);
        if (ids.length === 0) continue;
        if (type === 'Signature') hasSignature = true;
        else uploadCount += ids.length;
      }
      return {
        ...row,
        attempt: typeof row.attemptNo === 'number' ? row.attemptNo : attemptOf.get(row.id),
        duration,
        hasSignature,
        uploadCount,
      };
    });
  }, [rows, fileQuestions]);

  /* ------ 统计：每人取最好一次成绩，和「已交人数」同一口径 ------ */
  const statistics = useMemo(() => {
    const submittedRows = rows.filter((row) => row.tempSave === 1);
    const bestByPerson = new Map<string, number>();
    for (const row of submittedRows) {
      const raw = row.examScore;
      if (typeof raw !== 'number' || Number.isNaN(raw)) continue;
      const key = personKey(row);
      const previous = bestByPerson.get(key);
      if (previous === undefined || raw > previous) bestByPerson.set(key, raw);
    }
    const scores = [...bestByPerson.values()];
    return {
      submittedPeople: new Set(submittedRows.map(personKey)).size,
      scored: scores.length,
      scores,
      average: scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : undefined,
      max: scores.length ? Math.max(...scores) : undefined,
      min: scores.length ? Math.min(...scores) : undefined,
    };
  }, [rows]);

  /** 卷面满分：优先按当前项目的评分题分值算；项目读不到（题库练习）就按答卷里记的每题分值兜底 */
  const fullScore = useMemo(() => {
    if (project?.survey) {
      const fromSurvey = flattenSchema(project.survey).reduce((sum, question) => {
        const examScore = question.schema.attribute?.examScore;
        return sum + (typeof examScore === 'number' ? examScore : 0);
      }, 0);
      if (fromSurvey > 0) return fromSurvey;
    }
    let best = 0;
    for (const row of rows) {
      const perQuestion = row.examInfo?.questionScore;
      if (!perQuestion) continue;
      const sum = Object.values(perQuestion).reduce(
        (total, value) => total + (typeof value === 'number' ? value : 0),
        0,
      );
      if (sum > best) best = sum;
    }
    return best > 0 ? best : undefined;
  }, [project, rows]);

  /**
   * 及格线：
   * 1. 项目设置 examSetting.passScore（老师自己填的，最准）；
   * 2. 没配就按满分 60% 推算；
   * 3. 连满分都算不出来（问卷没有分值）→ 不显示及格率，只留平均/最高/最低。
   */
  const passLine = useMemo(() => {
    const configured = Number((project?.setting?.examSetting as { passScore?: number } | undefined)?.passScore);
    if (Number.isFinite(configured) && configured > 0) {
      return { value: configured, fromConfig: true };
    }
    if (fullScore && fullScore > 0) {
      return { value: Math.round(fullScore * 0.6 * 10) / 10, fromConfig: false };
    }
    return undefined;
  }, [project, fullScore]);

  const passCount =
    passLine && statistics.scored > 0 ? statistics.scores.filter((value) => value >= passLine.value).length : undefined;
  const passRate =
    passLine && passCount !== undefined && statistics.scored > 0 ? (passCount * 100) / statistics.scored : undefined;

  /* ------ 未交名单 ------ */
  const rosterList = useMemo<RosterStudent[]>(() => (Array.isArray(roster?.list) ? roster!.list : []), [roster]);
  const rosterTotal = typeof roster?.total === 'number' ? roster.total : undefined;
  const rosterSubmitted = typeof roster?.submitted === 'number' ? roster.submitted : undefined;
  // 后端名单最多 500 条，展示与复制都以「total - submitted」为准，至少不会比列出来的人还少
  const unsubmittedCount =
    rosterTotal !== undefined ? Math.max(rosterTotal - (rosterSubmitted ?? 0), rosterList.length) : undefined;

  /* ------ 筛选 + 前端分页 ------ */
  const filteredRows = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    const from = range?.[0]?.valueOf();
    const to = range?.[1]?.valueOf();
    return rowsView.filter((row) => {
      if (statusFilter === 'submitted' && row.tempSave !== 1) return false;
      if (statusFilter === 'pending' && row.gradeStatus !== 'pending') return false;
      if (needle) {
        const haystack = `${row.answererName ?? ''} ${row.createByName ?? ''} ${row.createBy ?? ''}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (from !== undefined || to !== undefined) {
        const at = timeOf(row);
        if (!at) return false;
        if (from !== undefined && at < from) return false;
        if (to !== undefined && at > to) return false;
      }
      return true;
    });
  }, [rowsView, keyword, statusFilter, range]);

  // 筛选变化后回到第 1 页；越界（例如筛完只剩 3 条）也夹回最后一页，别给一张空表
  useEffect(() => {
    setPage(1);
  }, [keyword, statusFilter, range]);
  const lastPage = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, lastPage);
  const pagedRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  /* ------ 异步导出任务：轮询 / 下载 / 取消 ------ */
  const stopPolling = useCallback(() => {
    if (pollTimer.current !== null) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    polling.current = false;
  }, []);

  /** 下载 ZIP：token 是一次性的，下载前重新换一个 */
  const downloadJob = useCallback(
    async (current: AnswerPdfJobView) => {
      const tokenRes = await post<{ exportToken?: string }>('/api/answer/export/token', {});
      // 产物可能混着 PDF 和长图，名字别再写死 PDF
      const fallbackName = `${projectName || '考试'}-${deptName || '班级'}-答卷导出.zip`;
      await downloadAnswerPdfJob(current.jobId, tokenRes?.exportToken, current.fileName || fallbackName);
    },
    [deptName, projectName],
  );

  /** 任务跑完：自动下载；失败：把后端的中文原因留在弹窗里 */
  const finishJob = useCallback(
    async (current: AnswerPdfJobView) => {
      stopPolling();
      if (current.done <= 0) {
        setJobError(current.error || current.message || '这个班还没有可导出的答卷');
        setJob(null);
        return;
      }
      try {
        await downloadJob(current);
        message.success(current.message ? `${current.message}，已开始下载` : '导出完成，已开始下载');
        setJob(null);
        setExportOpen(false);
      } catch (e) {
        setJobError((e as Error).message);
        setJob(null);
      }
      if (current.failed > 0) {
        message.warning(current.message || '部分答卷生成失败，已跳过');
      }
    },
    [downloadJob, message, stopPolling],
  );

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      // 2 秒一轮：太密会把 4 核机器拖慢，太疏进度条看起来像卡住
      pollTimer.current = window.setInterval(
        () => {
          if (polling.current) return;
          polling.current = true;
          void (async () => {
            try {
              const view = await getAnswerPdfJob(jobId);
              setJob(view);
              if (view.status === 'done') {
                await finishJob(view);
              } else if (view.status === 'failed' || view.status === 'canceled') {
                stopPolling();
                setJobError(view.error || view.message || (view.status === 'canceled' ? '导出已取消' : '导出失败'));
                setJob(null);
              }
            } catch (e) {
              stopPolling();
              setJobError((e as Error).message);
              setJob(null);
            } finally {
              polling.current = false;
            }
          })();
        },
        2000,
      );
    },
    [finishJob, stopPolling],
  );

  /** 关弹窗/关抽屉时清理：还在跑的先把任务取消，别让它在后台白烧 CPU */
  const abortRunningJob = useCallback(() => {
    const current = jobRef.current;
    stopPolling();
    setJob(null);
    if (current && (current.status === 'queued' || current.status === 'running')) {
      void cancelAnswerPdfJob(current.jobId).catch(() => undefined);
    }
  }, [stopPolling]);

  useEffect(() => {
    if (!open) abortRunningJob();
  }, [open, abortRunningJob]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const openExportModal = () => {
    setJobError(null);
    setJob(null);
    setOptions(DEFAULT_OPTIONS);
    setExportOpen(true);
  };

  const closeExportModal = () => {
    if (exporting) return;
    abortRunningJob();
    setJobError(null);
    setExportOpen(false);
  };

  /** 勾了哪几种异步产物：顺序按 PDF_FORMATS，正好也是 ZIP 子目录的顺序 */
  const outputs = PDF_FORMATS.filter((format) => options[format.key]).map((format) => format.key);
  /** 需要解析的只有 PDF（长图/确认单按后端契约不带解析） */
  const analysisApplies = options.answerPdf || options.answerSheetPdf;

  const submitExport = async () => {
    if (exporting || running) return;
    if (!options.excel && outputs.length === 0) {
      setJobError('请至少选择一种导出格式');
      return;
    }
    if (!projectId || !deptId) return;
    setJobError(null);
    setExporting(true);
    const startTime = options.range?.[0]?.format('YYYY-MM-DD HH:mm:ss');
    const endTime = options.range?.[1]?.format('YYYY-MM-DD HH:mm:ss');
    let excelFailed: string | null = null;
    try {
      if (options.excel) {
        try {
          await downloadClassAnswers({
            projectId,
            deptId,
            projectName,
            deptName,
            startTime,
            endTime,
            attemptNo: options.attemptNo,
          });
          message.success('Excel 明细已开始下载');
        } catch (e) {
          excelFailed = (e as Error).message;
        }
      }

      if (outputs.length > 0) {
        const tokenRes = await post<{ exportToken?: string }>('/api/answer/export/token', {});
        /**
         * 冻结契约：{ projectId, classId?, ids?, startTime?, endTime?, attemptNo?, includeAnalysis?,
         * outputs? }。includeImages 已废弃：后端永远带签名/上传图片，前端不再传，也不再给开关。
         * outputs 传了就走多格式；不传时后端按 type 走老逻辑（只出成绩单）。
         */
        const body: AnswerPdfJobRequest = {
          projectId,
          classId: deptId,
          attemptNo: options.attemptNo,
          startTime,
          endTime,
          includeAnalysis: options.includeAnalysis,
          outputs,
        };
        const created = await createAnswerPdfJob(body, tokenRes?.exportToken);
        const initial: AnswerPdfJobView = {
          jobId: created.jobId,
          status: 'queued',
          total: 0,
          done: 0,
          failed: 0,
          progress: 0,
        };
        setJob(initial);
        jobRef.current = initial;
        startPolling(created.jobId);
      } else {
        // 只导 Excel：已经在下载了，直接收尾
        setExportOpen(false);
      }

      if (excelFailed) {
        // Excel 失败但 PDF 已经在跑：把原因留在弹窗里，不要直接吞掉
        setJobError(`Excel 明细导出失败：${excelFailed}`);
      }
    } catch (e) {
      // 后端的中文提示（例如「当前有考试进行中，答卷 PDF 导出已暂停…」）原样展示
      setJobError((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  /* ------ 表格列 ------ */
  const columns: ColumnsType<AnswerRowView> = [
    {
      title: '学员',
      dataIndex: 'createByName',
      width: 168,
      render: (_: unknown, row) => {
        const name = row.answererName || row.createByName || '—';
        // 学员的登录账号就是手机号，第二行直接当「账号」给老师核对/催交用
        const account = row.createBy && row.createBy !== name ? row.createBy : undefined;
        return (
          <div style={{ lineHeight: 1.35 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13 }}>{name}</span>
              {row.isAnonymous && <Tag style={{ marginInlineEnd: 0 }}>匿名</Tag>}
            </div>
            {account && <div style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>{account}</div>}
          </div>
        );
      },
    },
    {
      title: '轮次',
      key: 'attempt',
      width: 76,
      render: (_: unknown, row) => (row.attempt === undefined ? '—' : `第 ${row.attempt + 1} 次`),
    },
    {
      title: '交卷时间',
      dataIndex: 'createAt',
      width: 150,
      render: (value?: string | number) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—'),
    },
    {
      title: '用时',
      key: 'duration',
      width: 104,
      render: (_: unknown, row) => {
        if (!row.duration) return '—';
        const info = row.metaInfo?.answerInfo;
        const hint =
          info?.startTime && info?.endTime
            ? `${dayjs(info.startTime).format('HH:mm:ss')} 开始 · ${dayjs(info.endTime).format('HH:mm:ss')} 交卷`
            : undefined;
        return hint ? <Tooltip title={hint}>{formatDuration(row.duration)}</Tooltip> : formatDuration(row.duration);
      },
    },
    {
      title: '分数',
      dataIndex: 'examScore',
      width: 112,
      render: (value: number | null | undefined, row) => {
        if (value === null || value === undefined) return '—';
        const parts: string[] = [];
        if (typeof row.objectiveScore === 'number') parts.push(`客观 ${scoreText(row.objectiveScore)}`);
        if (typeof row.manualScore === 'number') parts.push(`主观 ${scoreText(row.manualScore)}`);
        if (fullScore) parts.push(`满分 ${scoreText(fullScore)}`);
        const main = <span style={{ fontWeight: 600 }}>{scoreText(value)}</span>;
        const hasSubtotal = typeof row.objectiveScore === 'number' || typeof row.manualScore === 'number';
        return (
          <Tooltip title={parts.length > 0 ? parts.join(' · ') : undefined}>
            <span>
              {main}
              {/* 后端哪天下发客观/主观小计就用次行展示；没下发不留空行，避免表格高度跳动 */}
              {hasSubtotal && (
                <div style={{ fontSize: 10, color: 'var(--bp-text-soft)', whiteSpace: 'nowrap' }}>
                  客观 {scoreText(row.objectiveScore)} / 主观 {scoreText(row.manualScore)}
                </div>
              )}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: '批改状态',
      dataIndex: 'gradeStatus',
      width: 100,
      render: (value?: string) => {
        const tag = value ? GRADE_TAGS[value] : undefined;
        return tag ? <Tag color={tag.color}>{tag.text}</Tag> : '—';
      },
    },
    {
      title: '附件',
      key: 'attachment',
      width: 78,
      render: (_: unknown, row) => {
        if (!row.hasSignature && row.uploadCount === 0) {
          return <span style={{ color: 'var(--bp-text-soft)' }}>—</span>;
        }
        return (
          <Space size={6}>
            {row.hasSignature && (
              <Tooltip title="含手写签名">
                <FileImageOutlined style={{ color: 'var(--bp-blue)' }} />
              </Tooltip>
            )}
            {row.uploadCount > 0 && (
              <Tooltip title={`含 ${row.uploadCount} 个上传图片/文件`}>
                <PaperClipOutlined style={{ color: 'var(--bp-orange)' }} />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'tempSave',
      width: 88,
      render: (value?: number) => (value === 1 ? <Tag color="success">已交卷</Tag> : <Tag>暂存</Tag>),
    },
  ];

  const rosterColumns: ColumnsType<RosterStudent> = [
    {
      title: '姓名',
      dataIndex: 'name',
      render: (value?: string) => <span style={{ fontSize: 13 }}>{value || '—'}</span>,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 140,
      render: (value?: string) => <span style={{ fontSize: 12 }}>{value || '—'}</span>,
    },
    {
      title: '未交提示',
      key: 'hint',
      render: (_: unknown, row) => (
        <Space size={6}>
          <Tag color="warning" style={{ marginInlineEnd: 0 }}>
            未交卷
          </Tag>
          <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
            {row.phone ? '可发短信/微信提醒' : '没有手机号，只能线下提醒'}
          </span>
        </Space>
      ),
    },
  ];

  /* ------ 复制未交名单（浏览器不让复制时如实提示，别假装成功） ------ */
  const copyRoster = async () => {
    if (rosterList.length === 0) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('浏览器不支持剪贴板');
      await navigator.clipboard.writeText(rosterClipboardText(rosterList));
      message.success(`已复制 ${rosterList.length} 人的名单`);
    } catch {
      // 非 https / 旧浏览器拿不到剪贴板权限
      message.warning('当前环境不能自动复制，请手动选择表格内容');
    }
  };

  const percent = job && job.total > 0 ? Math.min(100, Math.round((job.done * 100) / job.total)) : 0;
  const truncated = rowsTotal > rows.length;
  const passLineText = passLine
    ? `${scoreText(passLine.value)} 分${passLine.fromConfig ? '' : '（按满分 60% 推算）'}`
    : undefined;

  const unsubmittedText = unsubmittedCount === undefined ? '—' : `${unsubmittedCount}${rosterLoading ? '…' : ' 人'}`;
  const submittedText =
    rosterSubmitted !== undefined ? `${rosterSubmitted} 人` : rowsError ? '—' : `${statistics.submittedPeople} 人`;

  return (
    <Drawer
      title={`答卷：${projectName || '考试'} / ${deptName || '班级'}`}
      open={open}
      onClose={onClose}
      size="min(1180px, 96vw)"
      destroyOnHidden
      styles={{ body: { paddingTop: 12 } }}
    >
      {/* ① 统计条：应考/已交/未交按「人」算，平均/最高/最低/及格率按「每人最好一次」算 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <Metric
          label="应考人数"
          value={rosterTotal === undefined ? '—' : `${rosterTotal} 人`}
          hint="班级在册学员（含兼报）"
        />
        <Metric
          label="已交"
          value={submittedText}
          hint={rosterSubmitted === undefined ? '按答卷人次去重' : '已正式交卷'}
        />
        <Metric
          label="未交"
          value={unsubmittedText}
          hint={
            unsubmittedCount === undefined
              ? '未交名单没读取到'
              : unsubmittedCount > 0
                ? '点击查看未交名单'
                : '这个班的人都交了'
          }
          tone={unsubmittedCount ? 'warn' : undefined}
          onClick={() => setTab('unsubmitted')}
        />
        <Metric label="平均分" value={scoreText(statistics.average)} hint={`${statistics.scored} 人有成绩`} />
        <Metric label="最高" value={scoreText(statistics.max)} hint="每人取最好一次" />
        <Metric label="最低" value={scoreText(statistics.min)} hint="每人取最好一次" />
        {passLine && passRate !== undefined && (
          <Metric
            label="及格率"
            value={`${passRate.toFixed(0)}%`}
            hint={`及格线 ${passLineText} · 及格 ${passCount}/${statistics.scored}`}
            tone="ok"
          />
        )}
      </div>

      {rowsError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 8 }}
          title={`答卷列表读取失败：${rowsError}`}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={() => setAnswersReload((value) => value + 1)}>
              重试
            </Button>
          }
        />
      )}
      {rosterError && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 8 }}
          title={`未交名单读取失败（应考 / 已交 / 未交显示「—」）：${rosterError}`}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={() => setRosterReload((value) => value + 1)}>
              重试
            </Button>
          }
        />
      )}

      {/* ② 导出入口放在标签页外面：在「未交名单」里也能直接导出 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
          {rowsLoading
            ? '正在读取答卷…'
            : `共 ${truncated ? `${rows.length}/${rowsTotal}` : rowsTotal} 份答卷`}
          {truncated ? `（统计与筛选基于已加载的 ${rows.length} 份）` : ''}
        </span>
        <div style={{ flex: 1 }} />
        <Button icon={<DownloadOutlined />} onClick={openExportModal}>
          导出本班答卷
        </Button>
      </div>

      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as TabKey)}
        items={[
          {
            key: 'answers',
            label: '答卷列表',
            children: (
              <>
                {/* ③ 筛选条：姓名/状态/交卷时间；整班数据都在手上，全部前端过滤，改条件立刻见结果 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <Input
                    allowClear
                    placeholder="搜索姓名 / 账号"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    style={{ width: 180 }}
                  />
                  <Select
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(value as StatusFilter)}
                    options={STATUS_OPTIONS}
                    style={{ width: 118 }}
                  />
                  <DatePicker.RangePicker
                    showTime
                    value={range ?? undefined}
                    placeholder={['交卷时间起', '交卷时间止']}
                    onChange={(value) => setRange(value && value[0] && value[1] ? [value[0], value[1]] : null)}
                    style={{ width: 320 }}
                  />
                  {(keyword || statusFilter !== 'all' || range) && (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => {
                        setKeyword('');
                        setStatusFilter('all');
                        setRange(null);
                      }}
                    >
                      清空筛选
                    </Button>
                  )}
                </div>

                <Table<AnswerRowView>
                  rowKey="id"
                  size="small"
                  loading={rowsLoading}
                  dataSource={pagedRows}
                  columns={columns}
                  scroll={{ x: 900 }}
                  pagination={{
                    current: safePage,
                    pageSize,
                    total: filteredRows.length,
                    size: 'small',
                    pageSizeOptions: [20, 50, 100],
                    showSizeChanger: true,
                    showTotal: (count) => `共 ${count} 份`,
                    onChange: (nextPage, nextSize) => {
                      setPage(nextPage);
                      if (nextSize && nextSize !== pageSize) setPageSize(nextSize);
                    },
                  }}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          rowsError
                            ? '答卷读取失败，先点上面的「重试」'
                            : rows.length > 0
                              ? '没有符合筛选条件的答卷'
                              : '这个班还没有答卷'
                        }
                      />
                    ),
                  }}
                />
              </>
            ),
          },
          {
            key: 'unsubmitted',
            label: `未交名单（共 ${unsubmittedCount ?? '—'} 人）`,
            children: (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                    {projectId === EXERCISE_PROJECT_ID
                      ? '题库练习没有班级花名册，不统计未交'
                      : rosterTotal === undefined
                        ? '班级花名册读取中…'
                        : `班级 ${rosterTotal} 人 · 已交 ${rosterSubmitted ?? 0} 人`}
                    {rosterList.length < (unsubmittedCount ?? 0) ? ` · 只列出前 ${rosterList.length} 条` : ''}
                  </span>
                  <div style={{ flex: 1 }} />
                  <Button icon={<CopyOutlined />} disabled={rosterList.length === 0} onClick={() => void copyRoster()}>
                    复制名单
                  </Button>
                </div>
                <Table<RosterStudent>
                  rowKey="id"
                  size="small"
                  loading={rosterLoading}
                  dataSource={rosterList}
                  columns={rosterColumns}
                  scroll={{ x: 460 }}
                  pagination={rosterList.length > 20 ? { pageSize: 20, size: 'small', showSizeChanger: false } : false}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          projectId === EXERCISE_PROJECT_ID
                            ? '题库练习是按题作答的练习记录，没有花名册'
                            : rosterError
                              ? '名单读取失败，先点上面的「重试」'
                              : '这个班的人都交了'
                        }
                      />
                    ),
                  }}
                />
              </>
            ),
          },
        ]}
      />

      <Modal
        title="导出本班答卷"
        open={exportOpen}
        onCancel={closeExportModal}
        onOk={() => void submitExport()}
        okText={running ? '生成中…' : '开始导出'}
        cancelText={running ? '取消导出' : '关闭'}
        confirmLoading={exporting}
        okButtonProps={{ disabled: running }}
        mask={{ closable: false }}
        destroyOnHidden
        width={540}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ marginBottom: 6 }}>作答轮次</div>
            <Select
              style={{ width: '100%' }}
              allowClear
              placeholder="全部轮次"
              value={options.attemptNo}
              onChange={(value?: number) => setOptions((prev) => ({ ...prev, attemptNo: value }))}
              options={ATTEMPT_OPTIONS}
              disabled={running}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--bp-text-soft)' }}>
              补考才有第 2 次及以后；轮次与下面的时间范围对 Excel 和 PDF / 长图都生效
            </div>
          </div>
          <div>
            <div style={{ marginBottom: 6 }}>交卷时间范围</div>
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              showTime
              value={options.range ?? undefined}
              onChange={(value) =>
                setOptions((prev) => ({
                  ...prev,
                  range: value && value[0] && value[1] ? [value[0], value[1]] : null,
                }))
              }
              disabled={running}
            />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>导出格式（可多选）</div>
            <Space orientation="vertical" size={4}>
              <Checkbox
                checked={options.excel}
                disabled={running}
                onChange={(event) => setOptions((prev) => ({ ...prev, excel: event.target.checked }))}
              >
                Excel 明细（.xlsx，每题一列，含分数与提交信息）
              </Checkbox>
              {PDF_FORMATS.map((format) => (
                <Checkbox
                  key={format.key}
                  checked={options[format.key]}
                  disabled={running}
                  onChange={(event) => setOptions((prev) => ({ ...prev, [format.key]: event.target.checked }))}
                >
                  {format.label}
                </Checkbox>
              ))}
            </Space>
            {/* 格式一多，光看名字分不清用途：把「拿它干什么」直接写在弹窗里 */}
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--bp-text-soft)' }}>
              长图适合微信发送、省纸；确认单用来打印签字（一页，带签字栏）。
            </div>
            {outputs.length > 0 && (
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--bp-text-soft)' }}>
                PDF / 长图会打包成一个 ZIP，内部按格式分子目录：
                {PDF_FORMATS.filter((format) => options[format.key])
                  .map((format) => `${format.dir}/`)
                  .join('、')}
                ；签名题 / 上传题的图片始终包含，不用再选。
              </div>
            )}
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>PDF 内容</div>
            <Checkbox
              checked={options.includeAnalysis}
              disabled={running || !analysisApplies}
              onChange={(event) => setOptions((prev) => ({ ...prev, includeAnalysis: event.target.checked }))}
            >
              附答案解析（考试未结束时请勿勾选）
            </Checkbox>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--bp-text-soft)' }}>
              {analysisApplies
                ? '对「成绩单 PDF」「答题卷 PDF」都生效；长图与确认单按后端契约不带解析。'
                : '先勾选成绩单 PDF 或答题卷 PDF，解析才有地方放。'}
            </div>
          </div>

          {jobError && <Alert type="error" showIcon title={jobError} />}

          {job && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>{jobStatusText(job.status)}</span>
                <span>
                  {job.total > 0 ? `已生成 ${job.done}/${job.total}` : '正在统计份数…'}
                  {job.failed > 0 ? `，失败 ${job.failed}` : ''}
                </span>
              </div>
              <Progress percent={percent} status={job.status === 'failed' ? 'exception' : undefined} size="small" />
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--bp-text-soft)' }}>
                关闭弹窗会取消正在生成的任务
              </div>
            </div>
          )}

          {!job && outputs.length > 0 && !running && (
            <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
              每份答卷都是逐份渲染的（几十份 × 几种格式要等一会儿），生成期间可以关掉弹窗取消。
            </div>
          )}
        </div>
      </Modal>
    </Drawer>
  );
}
