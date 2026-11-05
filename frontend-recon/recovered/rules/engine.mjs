// 规则表达式求值器 —— 原版实现的可运行封装
//
// 直接加载从 SurveyKing 构建产物里拆出来的模块 83676（未改写），
// 保留原实现的全部语义，包括那些看不出但会踩坑的边界行为。
//
// 用法：
//   import { createRuleEngine } from './engine.mjs';
//   const engine = createRuleEngine();          // 只做一次
//   engine.evalExpression('AND(#{q1.o1})', leaf => ...);
//
// 注意：加载前会安装浏览器垫片；只能在 Node 里跑。

import { installDomShims } from '../../scripts/dom-shim.mjs';
import { createRuntime } from '../../scripts/webpack-runtime.mjs';

/**
 * 创建规则引擎实例。
 * @param {Object} [opts]
 * @param {string} [opts.modulesDir='modules3'] 拆包模块目录（需先跑 npm run unpack）
 */
export function createRuleEngine({ modulesDir = 'modules3' } = {}) {
  installDomShims();
  const rt = createRuntime(modulesDir);
  const m = rt.require(83676);

  return {
    /** 解析单个引用 #{q.o.s} → ['q','o','s'] */
    parseRef: (expr) => m.Op(expr),

    /** 对单个引用求值：{optionTypes, qValue, expression} → 值 */
    evalRef: (args) => m.d0(args),

    /**
     * 解析并求值整条表达式。
     * @param {string} expr 形如 'AND(#{q1.o1} ,#{+q2})'
     * @param {(leaf:string)=>any} resolve 叶子取值回调，收到 '#{...}' 原文
     * @returns {{success:boolean, result:any}}
     */
    evalExpression: (expr, resolve) => m.vW(expr, resolve),

    /** 把整棵问卷 schema 拍平成题目列表 */
    flatten: (schema) => m.Xn(schema),

    /** 原始模块导出，需要更细粒度控制时用 */
    raw: m,
  };
}

// ---------------------------------------------------------------------------
// 自检：node recovered/rules/engine.mjs
// ---------------------------------------------------------------------------
import { pathToFileURL } from 'node:url';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const engine = createRuleEngine();
  const { pathToFileURL: _ } = await import('node:url');

  let failures = 0;
  const assert = (name, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (!ok) failures++;
    console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n  实际 ${JSON.stringify(actual)} / 期望 ${JSON.stringify(expected)}`}`);
  };

  assert('parseRef', engine.parseRef('#{q1.o1}'), ['q1', 'o1']);

  // 布尔选项：判断的是「键是否存在」，不是值真假 —— 最容易踩的坑
  assert(
    '键存在 → true',
    engine.evalRef({ optionTypes: { o1: 'boolean' }, qValue: { o1: true }, expression: '#{q1.o1}' }),
    true
  );
  assert(
    '键不存在 → false',
    engine.evalRef({ optionTypes: { o1: 'boolean' }, qValue: {}, expression: '#{q1.o1}' }),
    false
  );

  const run = (expr, answers) =>
    engine.evalExpression(expr, (leaf) => {
      const [qId, oId] = engine.parseRef(leaf);
      const v = answers[qId];
      return oId ? !!(v && v[oId]) : v;
    });

  assert('AND 全真', run('AND(#{q1.o1} ,#{q1.o2})', { q1: { o1: true, o2: true } }).result, true);
  assert('AND 含假', run('AND(#{q1.o1} ,#{q1.o2})', { q1: { o1: true } }).result, false);
  assert('NOT', run('NOT(#{q1.o1})', { q1: { o1: true } }).result, false);

  console.log(failures ? `\n${failures} 项失败` : '\n全部通过');
  process.exit(failures ? 1 : 0);
}
