/**
 * 数据页的过滤条件：班级树怎么拍平、服务端参数怎么拼。
 *
 * <p>为什么单独一个文件：同一组条件要喂三个地方——列表取数（/api/answer/list）、Excel 导出
 * （/api/answer/download）、PDF 任务（/api/answer/export/pdf-job）。三处的口径必须一模一样，
 * 尤其是 endTime 为什么要取「次日零点」这种细节，散在页面里迟早写歪一处。
 */
import type { Dayjs } from 'dayjs';

/** 与后端 ClassNodeView 对齐的最小字段集（选班只用这几项） */
export interface ClassNode {
  id: string;
  name?: string;
  /** false = 后端为了让树有路径而补出来的祖先节点，选它会 403，不能进候选 */
  accessible?: boolean;
  children?: ClassNode[];
}

/** 下拉候选项：label 是带路径的全名（班级重名时能分清），name 是叶子班自己的名字（报表页抬头用） */
export interface ClassOption {
  value: string;
  label: string;
  name?: string;
}

/**
 * 班级树拍平成下拉候选项。
 *
 * <p>只收「叶子班」：有 children 的节点只是分组（例如年级），选中它导不出任何东西。
 * 路径拼进 label，是为了两个年级下都叫「一班」时不至于选错。
 */
export function flattenClassLeaves(nodes: ClassNode[], prefix = ''): ClassOption[] {
  const result: ClassOption[] = [];
  for (const node of nodes ?? []) {
    const name = node.name || node.id;
    const label = prefix ? `${prefix} / ${name}` : name;
    const children = node.children ?? [];
    // 先递归再判 accessible：accessible=false 的分组节点下面仍可能有授权的子班
    if (children.length > 0) {
      result.push(...flattenClassLeaves(children, label));
      continue;
    }
    if (node.accessible === false) continue;
    result.push({ value: node.id, label, name });
  }
  return result;
}

/** 后端 Date 参数的格式：DownloadQuery / AnswerQuery 的 @DateTimeFormat 都是这一条 */
export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/** 交卷状态：unsubmitted 不是「过滤答卷」，而是把列表换成未交名单视图 */
export type SubmitStatus = 'all' | 'submitted' | 'unsubmitted';

/** 批改状态：all 不下推，pending / graded 原样传给 gradeStatus */
export type GradeStatus = 'all' | 'pending' | 'graded';

/**
 * 页面上的过滤条件。
 *
 * <p>classId 不放这里：它是 URL（?classId=）的一份镜像，刷新/跳转都要靠它；
 * createByName 也不放这里：它是防抖后的值，属于取数细节而不是「页面上的状态」（见 Data.tsx）。
 */
export interface FilterState {
  /** 交卷时间范围；[null, null] 或 null 都表示不过滤 */
  range: [Dayjs | null, Dayjs | null] | null;
  submitStatus: SubmitStatus;
  gradeStatus: GradeStatus;
  minScore?: number;
  maxScore?: number;
  /** 是否包含匿名答卷；默认 true（管理端看不到匿名等于少一半数据） */
  includeAnonymous: boolean;
}

export const INITIAL_FILTERS: FilterState = {
  range: null,
  submitStatus: 'all',
  gradeStatus: 'all',
  includeAnonymous: true,
};

/** 下推给后端的筛选参数：undefined 的键会被 api 层的 qs() 丢掉，不用自己删键 */
export interface AnswerFilterParams {
  classId?: string;
  startTime?: string;
  endTime?: string;
  /** pending / graded，对应 t_answer.grade_status */
  gradeStatus?: string;
  /** 姓名模糊匹配（服务端按 answerer_name / 用户姓名 like） */
  createByName?: string;
  minScore?: number;
  maxScore?: number;
  includeAnonymous: boolean;
}

/**
 * 时间范围 → 服务端参数。
 *
 * <p>后端的范围是开区间（t_answer.create_at > startTime、< endTime），所以终点取「次日 00:00:00」：
 * 写成当天 23:59:59 会把 23:59:59.5 这种带毫秒的答卷漏掉。
 */
export function toRangeParams(range: FilterState['range']): { startTime?: string; endTime?: string } {
  const from = range?.[0] ?? null;
  const to = range?.[1] ?? null;
  return {
    startTime: from ? from.startOf('day').format(DATE_TIME_FORMAT) : undefined,
    endTime: to ? to.add(1, 'day').startOf('day').format(DATE_TIME_FORMAT) : undefined,
  };
}

/**
 * 把页面状态摊成后端参数。
 *
 * <p>classId 由调用方从 URL 取（保持「URL 是唯一真源」），createByName 也单独传：
 * 它是 300ms 防抖后的值，不属于页面上的即时状态。
 */
export function toFilterParams(
  filters: FilterState,
  classId?: string,
  createByName?: string,
): AnswerFilterParams {
  const { startTime, endTime } = toRangeParams(filters.range);
  return {
    classId,
    startTime,
    endTime,
    gradeStatus: filters.gradeStatus === 'all' ? undefined : filters.gradeStatus,
    createByName: createByName?.trim() || undefined,
    minScore: filters.minScore ?? undefined,
    maxScore: filters.maxScore ?? undefined,
    includeAnonymous: filters.includeAnonymous,
  };
}

/** 有没有「非默认」条件：用来决定要不要显示「清空筛选」 */
export function hasActiveFilter(filters: FilterState, classId?: string, createByName?: string): boolean {
  return Boolean(
    classId ||
      filters.range?.[0] ||
      filters.range?.[1] ||
      filters.submitStatus !== 'all' ||
      filters.gradeStatus !== 'all' ||
      filters.minScore !== undefined ||
      filters.maxScore !== undefined ||
      createByName?.trim() ||
      !filters.includeAnonymous,
  );
}
