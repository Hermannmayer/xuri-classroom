/**
 * 规则表达式求值器。
 *
 * 语法（来自逆向产物，后端只存不算）：
 *   AND(a ,b) / OR(a ,b) / NOT(a)
 *   #{qId} 题目取值      #{qId.oId} 选项是否选中（看 key 是否存在）
 *   #{qId.oId.subId} 矩阵行列       #{_qId} 题目标题
 *   #{$qId} 题目得分    #{qId|默认值}   #{+qId} 已作答   #{-qId} 已显示
 *   #{qId} > 5 / < / ==
 *
 * 关键语义：布尔型选项判断的是「key 是否存在」，不是值真假。
 */
import { buildExpression, parseRule, type RuleConfig } from './buildExpression';
import { isEmptyAnswer } from '../empty';

export interface ParsedRef {
  raw: string;
  /** '+' 已作答 / '-' 已显示 / '$' 得分 / '_' 标题 / '' 取值 */
  prefix: '' | '+' | '-' | '$' | '_';
  qId: string;
  oId?: string;
  subId?: string;
  defaultValue?: string;
}

export interface EvalContext {
  /** questionId -> 答案值（后端格式：{ [optionId]: value }） */
  values: Record<string, unknown>;
  /** questionId -> display 状态 */
  displays?: Record<string, string | undefined>;
  /** questionId -> 标题（#{_qId} 用） */
  titles?: Record<string, string>;
  /** questionId -> 得分（#{$qId} 用） */
  scores?: Record<string, number>;
}

export interface EvalResult {
  success: boolean;
  result: boolean;
}

type Node =
  | { kind: 'fn'; name: 'AND' | 'OR' | 'NOT'; args: Node[] }
  | { kind: 'ref'; raw: string }
  | { kind: 'cmp'; ref: string; op: '==' | '>' | '<'; value: string };

/** `#{q1.o1}` → { qId:'q1', oId:'o1' } */
export function parseRef(expression: string): ParsedRef | undefined {
  const m = /^#\{([^}]*)\}$/.exec(expression.trim());
  if (!m) return undefined;
  let body = m[1].trim();
  if (!body) return undefined;

  let prefix: ParsedRef['prefix'] = '';
  if (body[0] === '+' || body[0] === '-' || body[0] === '$' || body[0] === '_') {
    prefix = body[0];
    body = body.slice(1);
  }

  let defaultValue: string | undefined;
  const bar = body.indexOf('|');
  if (bar >= 0) {
    defaultValue = body.slice(bar + 1);
    body = body.slice(0, bar);
  }

  const [qId, oId, subId] = body.split('.');
  if (!qId) return undefined;
  return { raw: expression.trim(), prefix, qId, oId, subId, defaultValue };
}

function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  return parts.map((s) => s.trim()).filter(Boolean);
}

function parse(src: string): Node {
  const s = src.trim();
  const fn = /^(AND|OR|NOT)\s*\(/.exec(s);
  if (fn) {
    const open = s.indexOf('(');
    let depth = 0;
    let end = -1;
    for (let i = open; i < s.length; i++) {
      if (s[i] === '(') depth++;
      else if (s[i] === ')') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end < 0) throw new Error(`括号不匹配: ${s}`);
    const body = s.slice(open + 1, end);
    return { kind: 'fn', name: fn[1] as 'AND' | 'OR' | 'NOT', args: splitTopLevel(body).map(parse) };
  }

  const cmp = /^(#\{[^}]*\})\s*(==|>|<)\s*(.+)$/.exec(s);
  if (cmp) {
    return { kind: 'cmp', ref: cmp[1], op: cmp[2] as '==' | '>' | '<', value: cmp[3].trim() };
  }
  if (/^#\{[^}]*\}$/.test(s)) return { kind: 'ref', raw: s };
  throw new Error(`无法解析表达式: ${s}`);
}

function truthy(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

function firstValue(value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value as object);
    return keys.length ? (value as Record<string, unknown>)[keys[0]] : undefined;
  }
  return value;
}

export function resolveRef(ref: ParsedRef, ctx: EvalContext): unknown {
  const { prefix, qId, oId, subId, defaultValue } = ref;
  const value = ctx.values[qId];

  if (prefix === '+') return !isEmptyAnswer(value);
  if (prefix === '-') return (ctx.displays?.[qId] ?? 'visible') === 'visible';
  if (prefix === '$') return ctx.scores?.[qId] ?? 0;
  if (prefix === '_') return ctx.titles?.[qId] ?? '';

  if (!oId) {
    const v = firstValue(value);
    return v === undefined || v === null || v === '' ? defaultValue : v;
  }

  if (value === null || value === undefined) return false;

  // 数组形态（部分题型直接存数组）
  if (Array.isArray(value)) {
    if (subId) return value.some((row) => row && typeof row === 'object' && (row as Record<string, unknown>)[subId]);
    return value.includes(oId);
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const cell = record[oId];

    // 矩阵：value = { rowId: { colId: v } }，按列聚合
    if (cell && typeof cell === 'object' && !Array.isArray(cell)) {
      if (subId) return truthy((cell as Record<string, unknown>)[subId]);
      return Object.values(cell as Record<string, unknown>).some((v) => truthy(v ?? true));
    }

    if (subId) return false;
    // 布尔选项：判断 key 是否存在（不是值真假）
    return Object.prototype.hasOwnProperty.call(record, oId);
  }

  return false;
}

function compare(left: unknown, op: '==' | '>' | '<', right: string): boolean {
  const leftText = Array.isArray(left) ? left.join('') : left === undefined || left === null ? '' : String(left);
  const ln = Number(leftText);
  const rn = Number(right);
  const numeric = leftText !== '' && right !== '' && !Number.isNaN(ln) && !Number.isNaN(rn);

  if (op === '==') return numeric ? ln === rn : leftText === right;
  if (op === '>') return numeric ? ln > rn : leftText > right;
  return numeric ? ln < rn : leftText < right;
}

function evalNode(node: Node, ctx: EvalContext): unknown {
  if (node.kind === 'fn') {
    const args = node.args.map((a) => evalNode(a, ctx));
    if (node.name === 'AND') return args.every(truthy);
    if (node.name === 'OR') return args.some(truthy);
    return !truthy(args[0]);
  }
  if (node.kind === 'ref') {
    const ref = parseRef(node.raw);
    return ref ? resolveRef(ref, ctx) : false;
  }
  const ref = parseRef(node.ref);
  if (!ref) return false;
  return compare(resolveRef(ref, ctx), node.op, node.value);
}

/** 求值一条表达式；解析失败返回 success=false，调用方据此决定要不要更新 UI 状态 */
export function evaluate(expression: string, ctx: EvalContext): EvalResult {
  if (!expression?.trim()) return { success: true, result: false };
  try {
    const node = parse(expression);
    return { success: true, result: truthy(evalNode(node, ctx)) };
  } catch {
    return { success: false, result: false };
  }
}

/** RuleConfig（设计器结构）或 JSON 字符串 → 布尔 */
export function evaluateRule(raw: string | RuleConfig | undefined, ctx: EvalContext): EvalResult {
  const rule = parseRule(raw);
  if (!rule || !rule.conditionItem?.length) return { success: true, result: false };
  return evaluate(buildExpression(rule), ctx);
}

/** 从项目 schema 里取出所有规则，供设计器/答题页复用 */
export function evaluateVisible(
  rules: Record<string, string | undefined>,
  ctx: EvalContext,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [qId, rule] of Object.entries(rules)) {
    const { success, result } = evaluateRule(rule, ctx);
    if (success) out[qId] = result;
  }
  return out;
}
