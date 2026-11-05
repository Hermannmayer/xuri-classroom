import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 后端地址：默认本地 80 端口，可用 VITE_API_TARGET 覆盖
const target = process.env.VITE_API_TARGET || 'http://127.0.0.1:80';

export default defineConfig({
  plugins: [react()],
  server: {
    // host: true 让局域网内其它设备（手机/同事）能通过 http://<本机IP>:5173 访问
    host: true,
    port: 5173,
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
