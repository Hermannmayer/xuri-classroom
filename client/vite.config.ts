import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * 端口约定（前后端分离的标准形态）：
 * - 前端（本 dev server / 生产 nginx）对外统一是 80 端口，用户只记一个地址；
 * - 后端是内部服务，随便给一个端口（默认 7007，由 application-dev.yml 决定），
 *   不直接暴露给用户，也不承载页面。
 * 需要改后端端口时用环境变量 VITE_API_TARGET，例如 http://127.0.0.1:8080。
 */
const target = process.env.VITE_API_TARGET || 'http://127.0.0.1:7007';

export default defineConfig({
  plugins: [react()],
  server: {
    // 0.0.0.0：局域网内手机/同事也能用 http://<本机IP> 访问
    host: true,
    // 前端占 80；端口被占用时直接报错，不要静默漂移到 5174 让用户找不到入口
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
    chunkSizeWarningLimit: 1200,
  },
});
