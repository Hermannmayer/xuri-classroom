/**
 * 数据页的过滤条件：班级树怎么拍平、服务端参数怎么拼。
 *
 * <p>为什么单独一个文件：同一组条件要喂三个地方——列表取数（/api/answer/list）、Excel 导出
 * （/api/answer/download）、PDF 任务（/api/answer/export/pdf-job）。三处的口径必须一模一样，
 * 尤其是 endTime 为什么要取「次日零点」这种细节，散在页面里迟早写歪一处。
 */
import type { Dayjs } from 'dayjs';


export interface ClassNode {
  id: string;
  name?: string;

  accessible?: boolean;
  children?: ClassNode[];
}


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

    if (children.length > 0) {
      result.push(...flattenClassLeaves(children, label));
      continue;
    }
    if (node.accessible === false) continue;
    result.push({ value: node.id, label, name });
  }
  return result;
}


export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';


export type SubmitStatus = 'all' | 'submitted' | 'unsubmitted';





export type GradeStatus = 'all' | 'pending' | 'graded' | 'ai';







export interface FilterState {

  range: [Dayjs | null, Dayjs | null] | null;
  submitStatus: SubmitStatus;
  gradeStatus: GradeStatus;
  minScore?: number;
  maxScore?: number;

  includeAnonymous: boolean;
}

export const INITIAL_FILTERS: FilterState = {
  range: null,
  submitStatus: 'all',
  gradeStatus: 'all',
  includeAnonymous: true,
};


export interface AnswerFilterParams {
  classId?: string;
  startTime?: string;
  endTime?: string;

  gradeStatus?: string;

  aiReview?: boolean;

  createByName?: string;
  minScore?: number;
  maxScore?: number;
  includeAnonymous: boolean;
}

/**
 * 时间范围 → 服务端参数。
 *

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
    gradeStatus:
      filters.gradeStatus === 'pending' || filters.gradeStatus === 'graded' ? filters.gradeStatus : undefined,
    aiReview: filters.gradeStatus === 'ai' ? true : undefined,
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
