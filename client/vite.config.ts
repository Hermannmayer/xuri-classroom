import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * 端口约定：
 * - 开发态：前端 dev server 占 **80**，后端内部服务用 7007，访问 http://localhost
 * - 生产态（Docker）：nginx 容器内仍然监听 80，但对宿主机**默认发布到 8080**
 *   （四位数端口，避开服务器上已有的 80），改端口只需改 APP_PORT 环境变量。
 */
const target = process.env.VITE_API_TARGET || 'http://127.0.0.1:7007';

export default defineConfig({
  plugins: [react()],
  server: {
    // 0.0.0.0：局域网内手机/同事也能用 http://<本机IP> 访问
    host: true,
    port: 80,
    strictPort: true,
    proxy: {
      // 走同源代理：后端用 HttpOnly cookie 存 JWT，跨域反而要多配 CORS
      '/api': { target, changeOrigin: false },
      '/captcha': { target, changeOrigin: false },
      '/files': { target, changeOrigin: false },
    },
  },
  build: {
    outDir: 'dist',
    // 生产用 web-watch 常驻 vite build --watch，nginx 直接读 dist。
    // 默认 emptyOutDir=true 会在每次构建开始时清空目录：一旦构建失败（例如依赖还没装好、
    // 或某次改动有语法错误），线上首页立刻 403，而且旧产物也没了。
    // 关掉之后：构建失败 = 目录保持原样（线上仍是上一版），成功 = 新 hash 文件与旧文件共存。
    // 代价是旧 assets 会累积：需要时在 NAS 上执行 docker exec xuri-live-web-watch find /web/dist/assets -type f -mtime +14 -delete。
    emptyOutDir: false,
    chunkSizeWarningLimit: 1200,
  },
});
