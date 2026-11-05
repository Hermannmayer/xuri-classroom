/**
 * 规则引擎自检（零框架）。运行：npm run test:rules
 * 覆盖：引用解析、表达式求值、布尔 key 语义、编译器输出、端到端规则。
 */
import { buildExpression, type RuleConfig } from '../src/schema/rules/buildExpression';
import { evaluate, evaluateRule, parseRef, type EvalContext } from '../src/schema/rules/engine';

let failed = 0;
const ok = (name: string, pass: boolean, actual?: unknown, expected?: unknown) => {
  if (pass) {
    console.log(`✓ ${name}`);
  } else {
    failed++;
    console.error(`✗ ${name}\n  实际: ${JSON.stringify(actual)}\n  期望: ${JSON.stringify(expected)}`);
  }
};

const eq = (name: string, actual: unknown, expected: unknown) =>
  ok(name, JSON.stringify(actual) === JSON.stringify(expected), actual, expected);

// ---------- 引用解析 ----------
const r1 = parseRef('#{q1.o1}');
eq('parseRef #{q1.o1}', [r1?.qId, r1?.oId], ['q1', 'o1']);

const r2 = parseRef('#{q1.o1.s1}');
eq('parseRef #{q1.o1.s1}', [r2?.qId, r2?.oId, r2?.subId], ['q1', 'o1', 's1']);

eq('parseRef #{+q2} 前缀', parseRef('#{+q2}')?.prefix, '+');
eq('parseRef #{q1|默认}', parseRef('#{q1|默认}')?.defaultValue, '默认');

// ---------- 求值 ----------
const ctx: EvalContext = {
  values: {
    q1: { o1: 'A' },
    q2: { o1: true, o2: true },
    q3: { o1: false }, // 布尔选项：key 存在即算选中
    q4: '5',
  },
  displays: { q1: 'visible', q2: 'hidden' },
  titles: { q1: '题目一' },
};

eq('选项被选中 → true', evaluate('#{q2.o1}', ctx).result, true);
eq('选项不在答案里 → false', evaluate('#{q2.o3}', ctx).result, false);
eq('布尔选项看 key 存在（值为 false）→ true', evaluate('#{q3.o1}', ctx).result, true);
eq('单选取值 #{q1} → 首个值', evaluate('#{q1} == A', ctx).result, true);
eq('已作答 #{+q2} → true', evaluate('#{+q2}', ctx).result, true);
eq('未作答 #{+q9} → false', evaluate('#{+q9}', ctx).result, false);
eq('已显示 #{-q1} → true', evaluate('#{-q1}', ctx).result, true);
eq('未显示 #{-q2} → false', evaluate('#{-q2}', ctx).result, false);
eq('题目标题 #{_q1}', evaluate('#{_q1} == 题目一', ctx).result, true);

eq('AND(真,真)', evaluate('AND(#{q2.o1} ,#{q2.o2})', ctx).result, true);
eq('AND(真,假)', evaluate('AND(#{q2.o1} ,#{q2.o3})', ctx).result, false);
eq('OR(假,真)', evaluate('OR(#{q2.o3} ,#{q2.o1})', ctx).result, true);
eq('NOT(真)', evaluate('NOT(#{q2.o1})', ctx).result, false);
eq('比较 #{q4} > 5', evaluate('#{q4} > 5', ctx).result, false);
eq('比较 #{q4} == 5', evaluate('#{q4} == 5', ctx).result, true);
eq('解析失败 success=false', evaluate('AND(', ctx).success, false);

// ---------- 编译器 ----------
eq(
  'CHECKED 多选项',
  buildExpression({
    conditionLogic: 'AND',
    conditionItem: [{ qId: 'q1', condition: 'CHECKED', oId: ['o1', 'o2'] }],
  }),
  'AND(AND(#{q1.o1} ,#{q1.o2}))',
);
eq(
  'ANSWERED',
  buildExpression({ conditionLogic: 'AND', conditionItem: [{ qId: 'q2', condition: 'ANSWERED' }] }),
  'AND(AND(#{+q2}))',
);
eq(
  '比较 + OR 组合',
  buildExpression({
    conditionLogic: 'OR',
    conditionItem: [
      { qId: 'q3', condition: '>', compare: '5' },
      { qId: 'q4', condition: 'HIDE' },
    ],
  }),
  'OR(#{q3} > 5 ,NOT(#{-q4}))',
);
eq('空条件列表', buildExpression({ conditionLogic: 'AND', conditionItem: [] }), 'AND()');

// ---------- 端到端：设计器存的 JSON 字符串 ----------
const rule: RuleConfig = {
  conditionLogic: 'AND',
  conditionItem: [{ qId: 'q2', condition: 'CHECKED', oId: ['o1'] }],
};
eq('evaluateRule 走 JSON 字符串', evaluateRule(JSON.stringify(rule), ctx).result, true);
eq('evaluateRule 空规则 → false', evaluateRule('', ctx).result, false);
eq('evaluateRule 坏 JSON 不更新 UI → result=false', evaluateRule('{bad', ctx).result, false);

console.log(failed === 0 ? '\n全部通过' : `\n失败 ${failed} 项`);
process.exit(failed === 0 ? 0 : 1);
