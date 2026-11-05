// 从压缩产物里抽可读情报：API 路径、请求基址、路由
import fs from 'node:fs';

const file = process.argv[2];
const js = fs.readFileSync(file, 'utf8');

const uniq = (arr) => [...new Set(arr)];

// 1) 字符串字面量里的 /api 路径
const apiPaths = uniq([...js.matchAll(/["'`](\/api\/[A-Za-z0-9_\-/{}.:$]{0,120})["'`]/g)].map((m) => m[1]));

// 2) baseURL / 请求前缀
const baseUrls = uniq([...js.matchAll(/baseURL\s*:\s*["'`]([^"'`]{0,80})["'`]/g)].map((m) => m[1]));

// 3) 所有 /xxx/yyy 形式的长路径（可能含接口）
const anyPaths = uniq([...js.matchAll(/["'`](\/[a-zA-Z][A-Za-z0-9_\-/]{3,80})["'`]/g)].map((m) => m[1]));

// 4) 路由名（UmiJS 应用里常见 path 定义）
const routeDefs = uniq([...js.matchAll(/path\s*:\s*["'`]([^"'`]{0,60})["'`]/g)].map((m) => m[1]));

// 5) window.g_config / routerBase
const gconfig = [...js.matchAll(/g_config\s*=\s*(\{[^}]{0,400}\})/g)].map((m) => m[1]);

fs.writeFileSync('out-api-paths.txt', apiPaths.sort().join('\n'));
fs.writeFileSync('out-base-urls.txt', baseUrls.sort().join('\n'));
fs.writeFileSync('out-paths.txt', anyPaths.sort().join('\n'));
fs.writeFileSync('out-routes.txt', routeDefs.sort().join('\n'));

console.log(JSON.stringify({
  file,
  bytes: js.length,
  apiPathCount: apiPaths.length,
  baseUrls,
  gconfig: gconfig.slice(0, 3),
  routeCount: routeDefs.length,
  anyPathCount: anyPaths.length,
}, null, 2));
