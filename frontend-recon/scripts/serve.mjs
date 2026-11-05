// 本地跑起抓取到的 SurveyKing 前端：静态托管 + /api 反向代理到真实后端
// 目的：拿到一个可运行基线，后续解包/改写都在这个基线上验证
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] || 'web');
const BACKEND = process.argv[3] || 'http://192.168.0.2:201';
const PORT = Number(process.argv[4] || 4173);
const backendUrl = new URL(BACKEND);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function proxy(req, res) {
  const opts = {
    hostname: backendUrl.hostname,
    port: backendUrl.port || 80,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: backendUrl.host },
  };
  const upstream = http.request(opts, (up) => {
    res.writeHead(up.statusCode || 502, up.headers);
    up.pipe(res);
  });
  upstream.on('error', (e) => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('proxy error: ' + e.message);
  });
  req.pipe(upstream);
}

function serveFile(file, res) {
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    'content-type': MIME[ext] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  // 接口全部转发
  if (url.startsWith('/api/')) return proxy(req, res);

  // 静态文件
  const candidate = path.join(ROOT, decodeURIComponent(url));
  if (url !== '/' && existsSync(candidate) && statSync(candidate).isFile()) {
    return serveFile(candidate, res);
  }

  // SPA 兜底
  return serveFile(path.join(ROOT, 'index.html'), res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`前端基线: http://127.0.0.1:${PORT}  → 后端 ${BACKEND}`);
});
