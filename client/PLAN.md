# 新前端建设计划

> 依据：`frontend-recon/spec/`（逆向规格）+ 后端源码实测（`server/`）。
> 后端零改动，新前端命中同一套 `/api/*` 契约。

## 一、技术栈

| 项 | 选择 | 理由 |
|---|---|---|
| 构建 | Vite 5 + TypeScript | 快、产物小，不需要 UmiJS 的约定式路由与 dva |
| UI | React 18 + antd 5 | antd 5 无需 iconfont 字体文件，避开后端静态资源白名单不认 `.woff2` 的问题 |
| 路由 | react-router-dom 6 | 40 条路由按 `spec/architecture.md` 对齐 |
| 请求 | 自研 `fetch` 封装（~120 行） | 后端 HTTP 恒 200、真实结果在 `body.code`，axios 反而要绕 |
| 表单 | antd Form | 设计器属性面板本来就是固定字段，用 antd Form 足够，不引 Formily |
| 状态 | 先 React 内置；设计器阶段引入 zustand + zundo（撤销重做） | 按需引入，P0 不装 |
| 加密 | jsencrypt | 登录密码后端要求 RSA/PKCS#1 v1.5，Web Crypto 不支持该填充 |
| 国际化 | 自研 `t(id, fallback)` + 逆向导出的 1493 条 `zh-CN.json` | id 是扁平点号串，不需要 i18next 的嵌套解析 |

## 二、必须遵守的后端契约（实测）

1. **HTTP 状态恒为 200**：`{code,message,data}`，`code=200` 成功、`401` 未登录、`403` 无权限、其余按业务错误透出。
2. **无 CSRF**：`csrf().disable()` + `STATELESS`，没有 `XSRF-TOKEN`。文档里写的双提交是旧版本，不要照抄。
3. **JWT 存在 Cookie**：`sk-token`，HttpOnly + SameSite=Lax。因此开发期必须用 Vite 同源代理，不能靠 CORS（后端 `cors.allowed-origin-patterns` 默认为空）。
4. **登录密码 RSA 加密**：公钥来自 `GET /api/system` 的 `publicKey`，每次后端重启都会变 → 登录前必须重新取。
5. **JSON 序列化**：`non_null`（空字段不返回）、日期 `yyyy-MM-dd HH:mm:ss`、时区 GMT+8。
6. **未知路径返回 `index.html`**：请求层已拦非 JSON 响应，避免 `JSON.parse` 炸掉。
7. **写接口多为 `void`**：`project/update`、`answer/*`、`system/*`，不能靠响应回填。

## 三、复用资产落位

| 逆向资产 | 新工程位置 | 备注 |
|---|---|---|
| `recovered/rules/build-expression.js` | `src/schema/rules/buildExpression.ts` | 逐行移植，保留 `AND()` 空条件行为 |
| `spec/rules-engine.md` 语义 | `src/schema/rules/engine.ts` | 重写 ~200 行，迁移 9 条断言 |
| `recovered/i18n/zh-CN.json` | `src/i18n/locales/zh-CN.json` | 已拷入 |
| `spec/model.md` | `src/schema/types.ts` | 核心类型手写，视图 DTO 按页面就地定义 |
| `extract/routes.md` | `src/router.tsx` | 一期先占位，P2/P3 替换 |
| `spec/pages.md` | 页面清单与菜单 | 菜单项已对齐 |
| `frontend-recon/web/` | 不动 | 作为行为 oracle，遇到歧义用 `npm run serve` 对照 |

## 四、阶段划分

```
P0 地基 ────────────────────────────────────────────────── [已完成]
  Vite+React18+TS+antd5 · 请求层 · 路由骨架 · 布局 · 登录
      │
      ▼
P1 内核 ────────────────────────────────────────────────── [下一步]
  schema/types.ts（SurveySchema/Attribute/ProjectSetting）
  schema/flatten.ts（拍平成题目列表）
  schema/rules/{buildExpression,engine}.ts（移植 + 断言）
  renderer/ 题型注册表 + SchemaRenderer 三态（edit/preview/answer）
      │
      ▼
P2 设计器 + 项目
  项目列表/文件夹/回收站 → 设计器：大纲树 + 属性面板 + JSON 兜底 → 保存
  发布设置（密码/时间/次数等常用项）
      │
      ▼
P3 答题闭环（一期验收点）
  /s/:id 校验 → 渲染(answer 态) → 自动暂存 → 提交 → 数据表列表/详情/导出
      │
      ▼
P4 补齐
  剩余题型 · 报表 · 系统管理 · 题库/练习 · 模板 · 移动端
```

**一期验收标准**：登录 → 建问卷 → 配 6 种题型（单选/多选/填空/文本域/下拉/评分）+ 一条显隐规则 → 发布 → 匿名答题 → 提交入库 → 数据表看到这份答卷。

## 五、目录结构

```
client/
├── src/
│   ├── api/          request.ts（封装）· index.ts（各域接口）· types.ts
│   ├── schema/       types.ts · flatten.ts · rules/
│   ├── renderer/     题型注册表 · SchemaRenderer · 各题型组件
│   ├── designer/     大纲树 · 属性面板 · JSON 兜底
│   ├── pages/        user/ · Home · Placeholder …
│   ├── layout/       BasicLayout（侧栏+顶栏）
│   ├── i18n/
│   ├── utils/        crypto.ts（RSA）
│   ├── router.tsx
│   └── main.tsx
├── vite.config.ts    proxy /api → VITE_API_TARGET（默认 http://127.0.0.1:80）
└── package.json
```

## 六、本地环境

| 组件 | 位置 | 说明 |
|---|---|---|
| JDK 8 | `%LOCALAPPDATA%\jdk8\jdk8u504-b01` | Temurin，免安装解压版 |
| MySQL 8.0.24 | `%LOCALAPPDATA%\mysql\mysql-8.0.24-winx64` | 便携版，端口 3306，root/123456，库 `surveyking` |
| 后端 jar | `server/api/build/libs/surveyking-v1.13.0.jar` | Gradle `:api:bootJar` |
| 前端 | `client/` → `npm run dev`（5173） | 生产构建产物后续再定反代方案 |

## 七、已知取舍（有意为之）

- **验证码**：P0 不接滑块验证码。若后端开启 `captchaEnabled`，登录页会明确提示先在系统设置里关闭。
- **流程编排（`/api/workflow/*`）**：`flow` 模块不在 API 构建里，接口实际 404；本期不做。
- **主题/模板广场/海报**：延后到 P4，不阻塞闭环。
- **表单引擎**：不引 Formily；规则求值用自己的响应式，语义按 `rules-engine.md` 对齐。
