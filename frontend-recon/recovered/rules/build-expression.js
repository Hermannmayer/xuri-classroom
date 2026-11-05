// 问卷规则 → 表达式 编译器
//
// 来源：SurveyKing 闭源前端构建产物，模块 86343 内部函数 d(rule, questions)
// 这里是去除 React 依赖后的等价实现，语义与原文逐条对齐。
//
// 输入：设计器保存的 RuleConfig（JSON）
// 输出：交给求值器解析的表达式字符串

/**
 * @typedef {Object} ConditionItem
 * @property {string} qId                    目标题目 id
 * @property {'CHECKED'|'UNCHECKED'|'ANSWERED'|'NOT_ANSWERED'|'SHOW'|'HIDE'|'>'|'<'|'=='} condition
 * @property {string[]} [oId]                选项 id（CHECKED / UNCHECKED 使用）
 * @property {string} [compare]              比较值（> < == 使用）
 *
 * @typedef {Object} RuleConfig
 * @property {'AND'|'OR'} conditionLogic
 * @property {ConditionItem[]} conditionItem
 */

/**
 * 把规则配置编译成表达式字符串。
 *
 * 输出形如：
 *   AND(AND(#{q1.o1} ,#{q1.o2}) ,NOT(#{+q2}))
 *
 * @param {RuleConfig} rule
 * @returns {string}
 */
export function buildExpression(rule) {
  const parts = [];

  for (const item of rule.conditionItem) {
    const qId = item.qId;
    const cond = item.condition;

    if (cond === 'CHECKED' || cond === 'UNCHECKED') {
      // 多选：任一选项命中即算命中，所以选项之间用 AND 包裹后整体取反表达 UNCHECKED
      const options = (item.oId ?? []).map((o) => `#{${qId}.${o}}`).join(' ,');
      parts.push(cond === 'CHECKED' ? `AND(${options})` : `NOT(AND(${options}))`);
    } else if (cond === 'ANSWERED') {
      parts.push(`AND(#{+${qId}})`);
    } else if (cond === 'NOT_ANSWERED') {
      parts.push(`NOT(#{+${qId}})`);
    } else if (cond === 'SHOW') {
      parts.push(`AND(#{-${qId}})`);
    } else if (cond === 'HIDE') {
      parts.push(`NOT(#{-${qId}})`);
    } else if (cond === '>' || cond === '<' || cond === '==') {
      parts.push(`#{${qId}} ${cond} ${item.compare}`);
    }
  }

  // 注意原文的分隔符是 " ,"（空格 + 逗号），求值器按此切分，不要改成 ","
  return rule.conditionLogic === 'AND'
    ? `AND(${parts.join(' ,')})`
    : `OR(${parts.join(' ,')})`;
}

// ---------------------------------------------------------------------------
// 自检：node recovered/rules/build-expression.js
// ---------------------------------------------------------------------------
import { pathToFileURL } from 'node:url';

const isEntry = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntry) {
  const assert = (name, actual, expected) => {
    if (actual !== expected) {
      console.error(`✗ ${name}\n  实际: ${actual}\n  期望: ${expected}`);
      process.exitCode = 1;
    } else {
      console.log(`✓ ${name}`);
    }
  };

  assert(
    'CHECKED 多选项',
    buildExpression({ conditionLogic: 'AND', conditionItem: [{ qId: 'q1', condition: 'CHECKED', oId: ['o1', 'o2'] }] }),
    'AND(AND(#{q1.o1} ,#{q1.o2}))'
  );
  assert(
    'ANSWERED',
    buildExpression({ conditionLogic: 'AND', conditionItem: [{ qId: 'q2', condition: 'ANSWERED' }] }),
    'AND(AND(#{+q2}))'
  );
  assert(
    '比较运算 + OR 组合',
    buildExpression({
      conditionLogic: 'OR',
      conditionItem: [
        { qId: 'q3', condition: '>', compare: '5' },
        { qId: 'q4', condition: 'HIDE' },
      ],
    }),
    'OR(#{q3} > 5 ,NOT(#{-q4}))'
  );
  assert(
    '空条件列表',
    buildExpression({ conditionLogic: 'AND', conditionItem: [] }),
    'AND()'
  );
}
