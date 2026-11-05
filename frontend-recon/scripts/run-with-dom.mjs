// 用 jsdom 提供真实 DOM，跑通逆向出来的模块
import { JSDOM } from 'jsdom';
import { createRuntime } from './webpack-runtime.mjs';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});

const g = globalThis;
const def = (name, value) => {
  try {
    Object.defineProperty(g, name, { value, configurable: true, writable: true });
  } catch {
    g[name] = value;
  }
};

def('window', dom.window);
def('document', dom.window.document);
def('self', dom.window);
def('navigator', dom.window.navigator);
def('location', dom.window.location);
def('history', dom.window.history);
def('localStorage', dom.window.localStorage);
def('sessionStorage', dom.window.sessionStorage);
def('HTMLElement', dom.window.HTMLElement);
def('Element', dom.window.Element);
def('Node', dom.window.Node);
def('CustomEvent', dom.window.CustomEvent);
def('MutationObserver', dom.window.MutationObserver);
def('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
def('requestAnimationFrame', dom.window.requestAnimationFrame?.bind(dom.window) || ((cb) => setTimeout(cb, 0)));
def('cancelAnimationFrame', dom.window.cancelAnimationFrame?.bind(dom.window) || (() => {}));
def('matchMedia', () => ({
  matches: false,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
}));
dom.window.routerBase = '/';
// jsdom 缺的一些 Web API，补上 Node 自带的
dom.window.fetch = globalThis.fetch;
dom.window.Headers = globalThis.Headers;
dom.window.Request = globalThis.Request;
dom.window.Response = globalThis.Response;
dom.window.AbortController = globalThis.AbortController;
dom.window.URL = globalThis.URL;
dom.window.URLSearchParams = globalThis.URLSearchParams;
dom.window.TextEncoder = globalThis.TextEncoder;
dom.window.TextDecoder = globalThis.TextDecoder;
dom.window.queueMicrotask = globalThis.queueMicrotask;


const rt = createRuntime('modules3');
const engine = rt.require(83676);

console.log('=== 规则引擎 83676 ===');
console.log('导出:', Object.keys(engine).join(', '));
console.log('');
for (const k of ['Xn', 'vW', 'Op', 'd0']) {
  console.log(`  ${k}: ${typeof engine[k]}`);
}
