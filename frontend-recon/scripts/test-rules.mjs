// 规则引擎行为验证：直接调用逆向出来的 vW / Op / d0
import { JSDOM } from 'jsdom';
import { createRuntime } from './webpack-runtime.mjs';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
dom.window.fetch = globalThis.fetch;
dom.window.URL = globalThis.URL;
dom.window.URLSearchParams = globalThis.URLSearchParams;
dom.window.routerBase = '/';

const def = (n, v) => { try { Object.defineProperty(globalThis, n, { value: v, configurable: true, writable: true }); } catch { globalThis[n] = v; } };
def('window', dom.window);
def('document', dom.window.document);
def('self', dom.window);
def('navigator', dom.window.navigator);
def('location', dom.window.location);
def('history', dom.window.history);
def('localStorage', dom.window.localStorage);
def('sessionStorage', dom.window.sessionStorage);
def('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
def('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
def('requestAnimationFrame', (cb) => setTimeout(cb, 0));
def('cancelAnimationFrame', () => {});

// 把 jsdom 的 DOM 构造函数全部镜像到 global，缺的给空壳
for (const name of [
  'HTMLElement', 'HTMLInputElement', 'HTMLDivElement', 'Element', 'Node', 'DocumentFragment',
  'ShadowRoot', 'Event', 'CustomEvent', 'KeyboardEvent', 'MouseEvent', 'MutationObserver',
  'XMLSerializer', 'DOMParser', 'Range', 'Selection', 'CSSStyleSheet', 'Image', 'Blob', 'File',
  'FileReader', 'FormData', 'DataTransfer',
]) {
  def(name, dom.window[name] ?? class {});
}
for (const name of ['ResizeObserver', 'IntersectionObserver']) {
  def(name, class { observe() {} unobserve() {} disconnect() {} });
}

const rt = createRuntime('modules3');
const E = rt.require(83676);

const results = [];
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ name, ok, actual, expected });
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) console.log(`   实际: ${JSON.stringify(actual)}\n   期望: ${JSON.stringify(expected)}`);
};

// 1) 引用解析 Op
check('Op 解析 #{q1.o1}', E.Op('#{q1.o1}'), ['q1', 'o1']);
check('Op 解析 #{q1.o1.s1}', E.Op('#{q1.o1.s1}'), ['q1', 'o1', 's1']);

// 2) 单条件求值 d0
// 语义（读源码 + 实测确认）：
//   选项类型为 boolean 时，判断的是「答案 map 里有没有这个 key」，
//   因为多选题只把被选中的选项放进来，不存在 false 值。
const optTypes = { o1: 'boolean', o2: 'boolean' };
check(
  '选项被选中 → true',
  E.d0({ optionTypes: optTypes, qValue: { o1: true }, expression: '#{q1.o1}' }),
  true
);
check(
  '选项不在答案里 → false',
  E.d0({ optionTypes: optTypes, qValue: {}, expression: '#{q1.o1}' }),
  false
);
check(
  '单选题取值 #{q1} → 首个值',
  E.d0({ optionTypes: optTypes, qValue: { o1: 'A' }, expression: '#{q1}' }),
  'A'
);

// 3) 表达式求值 vW
const evalExpr = (expr, answers) => {
  const r = E.vW(expr, (leaf) => {
    // leaf 形如 #{q1.o1}，取对应答案
    const parts = E.Op(leaf);
    const qid = parts[0];
    const oid = parts[1];
    const v = answers[qid];
    if (oid) return !!(v && v[oid]);
    return v;
  });
  return r;
};

check('AND(真,真) → success/true', (() => { const r = evalExpr('AND(#{q1.o1},#{q1.o2})', { q1: { o1: true, o2: true } }); return [r.success, r.result]; })(), [true, true]);
check('AND(真,假) → false', (() => { const r = evalExpr('AND(#{q1.o1},#{q1.o2})', { q1: { o1: true, o2: false } }); return [r.success, r.result]; })(), [true, false]);
check('OR(假,真) → true', (() => { const r = evalExpr('OR(#{q1.o1},#{q1.o2})', { q1: { o1: false, o2: true } }); return [r.success, r.result]; })(), [true, true]);
check('NOT(真) → false', (() => { const r = evalExpr('NOT(#{q1.o1})', { q1: { o1: true } }); return [r.success, r.result]; })(), [true, false]);

const passed = results.filter((r) => r.ok).length;
console.log(`\n通过 ${passed}/${results.length}`);
process.exit(passed === results.length ? 0 : 1);

