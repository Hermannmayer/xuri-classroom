// webpack 运行时模拟器：让 modules2/ 下的模块能像原 bundle 里那样互相 require
// 用途：单独跑通逆向出来的模块（如规则引擎），验证它们可执行、行为正确
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const nodeRequire = createRequire(import.meta.url);

export function createRuntime(rootDir = 'modules2', { globals = {} } = {}) {
  const index = JSON.parse(fs.readFileSync(path.join(rootDir, '_index.json'), 'utf8'));
  const idToPath = {};
  for (const [id, meta] of Object.entries(index)) {
    const flat = path.resolve(rootDir, `${id}.cjs`);
    const nested = path.resolve(rootDir, String(meta.chunk || '').replace(/\.js$/, ''), `${id}.cjs`);
    idToPath[id] = fs.existsSync(flat) ? flat : nested;
  }

  for (const [k, v] of Object.entries(globals)) globalThis[k] = v;

  const cache = new Map();

  function makeModule(id) {
    const mod = { id, exports: {}, loaded: false };
    cache.set(id, mod);
    const factory = nodeRequire(idToPath[id]);
    if (typeof factory !== 'function') throw new Error(`模块 ${id} 不是可调用工厂`);
    factory(mod, mod.exports, req);
    mod.loaded = true;
    return mod.exports;
  }

  const chunkPromises = new Map();
  function req(id) {
    // webcrack 会把 require(12345) 改写成 require("./12345.js")，这里归一化
    if (typeof id === 'string') id = id.replace(/^\.\//, '').replace(/\.js$/, '');
    if (cache.has(id)) return cache.get(id).exports;
    if (!idToPath[id]) {
      // 缺失模块：返回一个惰性抛错的占位，避免整条链断掉
      const missing = new Proxy(
        {},
        {
          get() {
            throw new Error(`缺少模块 ${id}`);
          },
        }
      );
      return missing;
    }
    return makeModule(id);
  }

  // webpack 运行时辅助
  req.o = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  req.d = (exports, definition) => {
    for (const key in definition) {
      if (req.o(definition, key) && !req.o(exports, key)) {
        Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
      }
    }
  };
  req.r = (exports) => {
    if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
      Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    }
    Object.defineProperty(exports, '__esModule', { value: true });
  };
  req.n = (module) => {
    const getter = module && module.__esModule ? () => module.default : () => module;
    req.d(getter, { a: getter });
    return getter;
  };
  // webpack5 __webpack_require__.t（创建命名空间对象）
  req.t = function (value, mode) {
    if (mode & 1) value = req(value);
    if (mode & 8) return value;
    if (mode & 4 && typeof value === 'object' && value && value.__esModule) return value;
    const ns = Object.create(null);
    req.r(ns);
    const def = {};
    if (mode & 2 && typeof value !== 'string') {
      for (const key in value) def[key] = () => value[key];
    }
    def.default = () => value;
    req.d(ns, def);
    return ns;
  };
  req.e = (chunkId) => {
    // 已抓取的 chunk 视为已加载
    if (!chunkPromises.has(chunkId)) chunkPromises.set(chunkId, Promise.resolve(chunkId));
    return chunkPromises.get(chunkId);
  };
  req.bind = (fn, id) => (...args) => req(id).apply(null, args);
  req.p = '/';
  // webpack 的 CommonJS 模块装饰
  req.nmd = (module) => {
    module.paths = [];
    if (!module.children) module.children = [];
    return module;
  };
  req.m = {};
  req.c = cache;

  return {
    require: req,
    moduleIds: Object.keys(idToPath),
    has: (id) => !!idToPath[id],
    index,
  };
}
