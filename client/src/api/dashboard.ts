/** 首页统计接口：/api/dashboard/{overview,trend,teacher,teacher/trend,student} */
import dayjs from 'dayjs';
import { get } from './request';
import { num } from '../components/charts/util';


export interface DashboardSection<T> {
  data: T | null;
  error: string | null;
}

export interface DashboardUsers {
  student?: number;
  teacher?: number;
  admin?: number;
  total?: number;

  active7d?: number;
}

export interface DashboardClasses {
  total?: number;
  open?: number;
  students?: number;
  avgSize?: number;
}

export interface DashboardProjects {
  total?: number;
  exam?: number;
  survey?: number;
  folder?: number;
  published?: number;

  running?: number;
}

export interface DashboardAnswers {
  total?: number;
  today?: number;
  last7d?: number;
  last30d?: number;
  graded?: number;
  pending?: number;
}

export interface DashboardQuestions {
  repos?: number;
  templates?: number;
}

export interface DashboardScores {
  avg?: number;

  passRate?: number;
  max?: number;
  min?: number;
  scoredCount?: number;
}

export interface DashboardAi {
  calls7d?: number;
  tokens7d?: number;
}

export interface DashboardOverview {
  users?: DashboardUsers | null;
  classes?: DashboardClasses | null;
  projects?: DashboardProjects | null;
  answers?: DashboardAnswers | null;
  questions?: DashboardQuestions | null;
  scores?: DashboardScores | null;
  ai?: DashboardAi | null;
}

export interface DashboardTrend {
  days?: string[] | null;
  answers?: Array<number | null> | null;
  graded?: Array<number | null> | null;
  avgScores?: Array<number | null> | null;
  activeUsers?: Array<number | null> | null;
}

export interface TeacherRecentRow {
  projectId?: string;
  projectName?: string;
  status?: number;
  answerCount?: number;
  avgScore?: number | null;
  pendingGrading?: number;

  lastAnswerAt?: string | number | null;
}

export interface TeacherDashboard {
  classes?: number;
  students?: number;
  published?: number;
  projects?: number;
  answers?: number;
  pendingGrading?: number;
  graded7d?: number;
  avgScore?: number | null;
  recent?: TeacherRecentRow[] | null;
}

export interface StudentRecentRow {
  projectId?: string;
  projectName?: string;
  examScore?: number | null;
  createAt?: string | number | null;
}

export interface StudentDashboard {
  answers?: number;
  avgScore?: number | null;
  bestScore?: number | null;
  practiceCount?: number;
  practiceQuestions?: number;
  classes?: number;
  todoExams?: number;
  recent?: StudentRecentRow[] | null;
}


export interface TrendSeries {
  days: string[];
  answers: Array<number | null>;
  graded: Array<number | null>;
  avgScores: Array<number | null>;
  activeUsers: Array<number | null>;
}

async function section<T>(request: Promise<T>): Promise<DashboardSection<T>> {
  try {
    const data = await request;
    return { data: data ?? null, error: null };
  } catch (error) {
    const message = (error as Error)?.message;
    return { data: null, error: message && message.trim() ? message : '统计接口暂不可用' };
  }
}

/** 天数参数归一：1~90，默认 14（与后端契约一致） */
export function normalizeDays(days: number | undefined): number {
  const value = Number.isFinite(days) ? Math.round(days as number) : 14;
  return Math.min(90, Math.max(1, value));
}

export const fetchOverview = (days = 14) =>
  section(get<DashboardOverview>('/api/dashboard/overview', { days: normalizeDays(days) }));

export const fetchTrend = (days = 14) =>
  section(get<DashboardTrend>('/api/dashboard/trend', { days: normalizeDays(days) }));

export const fetchTeacherBoard = () => section(get<TeacherDashboard>('/api/dashboard/teacher'));

/** 老师首页趋势：只统计当前老师可见的项目（后端 DashboardStatsService#teacherTrend） */
export const fetchTeacherTrend = (days = 14) =>
  section(get<DashboardTrend>('/api/dashboard/teacher/trend', { days: normalizeDays(days) }));

export const fetchStudentBoard = () => section(get<StudentDashboard>('/api/dashboard/student'));

function alignSeries(
  series: ReadonlyArray<number | null | undefined> | null | undefined,
  length: number,
): Array<number | null> {
  const source = (series ?? []).map((value) => num(value));
  if (source.length === length) return source;

  if (source.length > length) return source.slice(source.length - length);
  return [...Array<number | null>(length - source.length).fill(null), ...source];
}

/** 趋势序列对齐：days 是横轴基准 */
export function normalizeTrend(trend: DashboardTrend | null, days = 14, today = dayjs()): TrendSeries {
  const count = normalizeDays(days);
  const rawDays = (trend?.days ?? []).filter((day): day is string => typeof day === 'string' && day !== '');
  const labels =
    rawDays.length > 0
      ? rawDays.length > count
        ? rawDays.slice(rawDays.length - count)
        : rawDays
      : Array.from({ length: count }, (_, index) =>
          today.subtract(count - 1 - index, 'day').format('MM-DD'),
        );

  return {
    days: labels,
    answers: alignSeries(trend?.answers, labels.length),
    graded: alignSeries(trend?.graded, labels.length),
    avgScores: alignSeries(trend?.avgScores, labels.length),
    activeUsers: alignSeries(trend?.activeUsers, labels.length),
  };
}

/** createAt 可能是 'yyyy-MM-dd HH:mm:ss'、ISO 串或毫秒时间戳，统一成毫秒 */
function toMillis(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (!value) return null;
  const text = String(value).trim();
  if (text === '') return null;
  const parsed = Date.parse(text.includes('T') ? text : text.replace(' ', 'T'));
  return Number.isFinite(parsed) ? parsed : null;
}

/** 时间字段格式化 */
export function fmtDateTime(value: string | number | null | undefined, fallback = '—'): string {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'number') {
    const millis = toMillis(value);
    return millis === null ? fallback : dayjs(millis).format('YYYY-MM-DD HH:mm');
  }
  return String(value);
}

export interface ScoreTrend {
  labels: string[];
  values: Array<number | null>;

  tooltips: string[];
}







export const STUDENT_RECENT_LIMIT = 20;

/** 学员首页的「我的成绩走势」：把 /api/dashboard/student 的 recent 按时间正序摊平 */
export function scoreTrend(rows: StudentRecentRow[] | null | undefined, limit = STUDENT_RECENT_LIMIT): ScoreTrend {
  const list = (rows ?? [])
    .map((row, index) => ({ row, index, at: toMillis(row.createAt) }))
    .sort((a, b) => {
      if (a.at === null && b.at === null) return a.index - b.index;
      if (a.at === null) return -1;
      if (b.at === null) return 1;
      return a.at - b.at;
    })
    .slice(-limit);

  return {
    labels: list.map((item) => {
      const at = item.at;
      return at === null ? `第${item.index + 1}次` : dayjs(at).format('MM-DD');
    }),
    values: list.map((item) => num(item.row.examScore)),
    tooltips: list.map((item) => item.row.projectName || `第${item.index + 1}次作答`),
  };
}
