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
    chunkSizeWarningLimit: 1200,
  },
});
