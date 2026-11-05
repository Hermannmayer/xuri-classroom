// 在 Node 里跑通逆向出来的规则引擎：最小浏览器垫片 + webpack 运行时
import { createRuntime } from './webpack-runtime.mjs';

function installShims() {
  const noop = () => {};
  const el = () => {
    const style = new Proxy(
      { setProperty: noop, removeProperty: noop, getPropertyValue: () => '' },
      { get: (t, k) => (k in t ? t[k] : ''), set: () => true }
    );
    return {
      style,
      dataset: {},
      classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
      appendChild: (x) => x,
      removeChild: noop,
      setAttribute: noop,
      getAttribute: () => null,
      removeAttribute: noop,
      hasAttribute: () => false,
      addEventListener: noop,
      removeEventListener: noop,
      insertBefore: (x) => x,
      querySelector: () => null,
      querySelectorAll: () => [],
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }),
      focus: noop,
      click: noop,
      attachShadow: () => el(),
      innerHTML: '',
      textContent: '',
      children: [],
      childNodes: [],
      parentNode: null,
      ownerDocument: null,
    };
  };

  const document_ = {
    createElement: el,
    createElementNS: el,
    createTextNode: el,
    createDocumentFragment: el,
    head: el(),
    body: el(),
    documentElement: el(),
    querySelector: () => el(),
    querySelectorAll: () => [],
    getElementById: () => el(),
    addEventListener: noop,
    removeEventListener: noop,
    dispatchEvent: () => true,
    cookie: '',
    title: '',
    createEvent: () => ({ initEvent: noop }),
  };
  document_.defaultView = globalThis;

  const g = globalThis;
  const def = (name, value) => {
    try {
      g[name] = value;
    } catch {
      Object.defineProperty(g, name, { value, configurable: true, writable: true });
    }
  };
  def('window', g);
  def('document', document_);
  def('self', g);
  def('addEventListener', noop);
  def('removeEventListener', noop);
  def('dispatchEvent', () => true);
  def('navigator', { userAgent: 'node', language: 'zh-CN', languages: ['zh-CN'], platform: 'node' });
  g.location = { href: 'http://localhost/', origin: 'http://localhost', pathname: '/', search: '', hash: '', protocol: 'http:', host: 'localhost' };
  g.history = { pushState: noop, replaceState: noop, back: noop, go: noop };
  g.localStorage = {
    _d: new Map(),
    getItem(k) { return this._d.has(k) ? this._d.get(k) : null; },
    setItem(k, v) { this._d.set(k, String(v)); },
    removeItem(k) { this._d.delete(k); },
    clear() { this._d.clear(); },
    get length() { return this._d.size; },
    key(i) { return [...this._d.keys()][i] ?? null; },
  };
  g.sessionStorage = g.localStorage;
  g.HTMLElement = class HTMLElement {};
  g.Element = class Element {};
  g.Node = class Node {};
  g.CustomEvent = class CustomEvent { constructor(t, o) { this.type = t; Object.assign(this, o); } };
  g.MutationObserver = class MutationObserver { observe() {} disconnect() {} };
  g.ResizeObserver = class ResizeObserver { observe() {} disconnect() {} };
  g.IntersectionObserver = class IntersectionObserver { observe() {} disconnect() {} };
  g.matchMedia = () => ({ matches: false, addListener: noop, removeListener: noop, addEventListener: noop, removeEventListener: noop });
  g.getComputedStyle = () => ({ getPropertyValue: () => '' });
  g.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  g.cancelAnimationFrame = noop;
  g.console = console;
  g.window.routerBase = '/';
}

installShims();

const rt = createRuntime('modules3');
const engine = rt.require(83676);

console.log('=== 规则引擎模块 83676 导出 ===');
console.log(Object.keys(engine).join(', '));
console.log('');
console.log('核心函数类型:');
for (const k of ['Xn', 'vW', 'Op', 'd0', 'BB', 'A7', 'mc', 'Gt']) {
  console.log(`  ${k}: ${typeof engine[k]}`);
}
