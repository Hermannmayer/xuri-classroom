// 最小浏览器环境：让逆向出的前端模块能在 Node 里加载
// 只补「模块初始化时会碰到的」全局量，不追求完整 DOM 行为
import { JSDOM } from 'jsdom';

export function installDomShims() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
  });

  dom.window.fetch = globalThis.fetch;
  dom.window.URL = globalThis.URL;
  dom.window.URLSearchParams = globalThis.URLSearchParams;
  dom.window.routerBase = '/';

  const def = (name, value) => {
    try {
      Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
    } catch {
      globalThis[name] = value;
    }
  };

  const w = dom.window;
  def('window', w);
  def('document', w.document);
  def('self', w);
  def('navigator', w.navigator);
  def('location', w.location);
  def('history', w.history);
  def('localStorage', w.localStorage);
  def('sessionStorage', w.sessionStorage);
  def('getComputedStyle', w.getComputedStyle.bind(w));
  def('matchMedia', () => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  }));
  def('requestAnimationFrame', (cb) => setTimeout(cb, 0));
  def('cancelAnimationFrame', () => {});

  for (const name of [
    'HTMLElement', 'HTMLInputElement', 'HTMLDivElement', 'Element', 'Node', 'DocumentFragment',
    'ShadowRoot', 'Event', 'CustomEvent', 'KeyboardEvent', 'MouseEvent', 'MutationObserver',
    'XMLSerializer', 'DOMParser', 'Range', 'Selection', 'CSSStyleSheet', 'Image', 'Blob', 'File',
    'FileReader', 'FormData', 'DataTransfer',
  ]) {
    def(name, w[name] ?? class {});
  }
  for (const name of ['ResizeObserver', 'IntersectionObserver']) {
    def(name, class { observe() {} unobserve() {} disconnect() {} });
  }

  return dom;
}
