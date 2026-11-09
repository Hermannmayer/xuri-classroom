# 旭日云课堂 · 前端

React 18 + TypeScript + Vite + Ant Design。

- 开发：`npm run dev`（需要后端在 7007，见 `vite.config.ts` 的代理配置）
- 类型检查：`npm run check`
- 构建：`npm run build`（产物 `dist/`，生产由 nginx 托管）
- 规则/树自测：`npm run test:rules` / `npm run test:tree`

接口层在 `src/api/`：约定见 [docs/modules/frontend.md](../docs/modules/frontend.md)。
