/**
 * 答案空值判断的唯一实现。
 *
 * 默认浅判断：null/undefined/''、空数组、空对象算空；答题进度与规则 `#{+qId}` 用。
 * deep=true 时递归检查对象/数组，并把纯空白字符串也算空；公开查询条件用。
 */
export function isEmptyAnswer(value: unknown, deep = false): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return deep ? value.trim() === '' : value === '';
  if (Array.isArray(value)) {
    return value.length === 0 || (deep && value.every((item) => isEmptyAnswer(item, true)));
  }
  if (typeof value === 'object') {
    const values = Object.values(value as Record<string, unknown>);
    return values.length === 0 || (deep && values.every((item) => isEmptyAnswer(item, true)));
  }
  return false;
}
