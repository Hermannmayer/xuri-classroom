# SurveyKing 前端架构还原

> 来源：用户部署实例 `http://192.168.0.2:201`（v1.13.0）的构建产物逆向 + 后端 Java 源码对照。
> 所有 chunk 已抓取到 `SurveyKing-recon/web/`，美化版在 `SurveyKing-recon/pretty/`。

## 0. 速览

| 项 | 值 |
|---|---|
| 前端是否开源 | **否**。仓库 `client/` 只有 `todo`，发布的是构建产物 |
| 框架 | UmiJS **3.5.41**（`window.routerBase = "/"`）+ React **17.0.2**（react-dom 版本串确认） |
| UI 库 | Ant Design **4.x**（依据：产物含大量 `.chunk.css`，是 v4 的 less 编译结果，无 v5 CSS-in-JS 痕迹；未用 ProLayout） |
| 状态管理 | **dva**（redux + redux-saga，UmiJS 内置） |
| 请求库 | **axios**（自带封装，非 umi-request） |
| 国际化 | react-intl 风格 `formatMessage`，8 种语言 |
| 产物规模 | 169 个文件 / 15.3 MB；主包 `umi.*.js` 3.79 MB |
| Sourcemap | 无 |
| 部署方式 | 静态文件打进 Spring Boot jar 的 `resources/static/` |

## 1. 技术栈细节

- **构建**：webpack，UmiJS 3 约定式路由 → 编译为 `routes: [...]` 配置
- **代码分割**：每个页面一个 `p__<path>.async.js` chunk（32 个），另有 100 个公共/vendor chunk
- **模块 id 稳定**：chunk 名直接编码了源码路径（`p__survey__Setting` ← `src/pages/survey/Setting.tsx`），这是本次逆向的最大突破口
- **压缩**：仅压缩变量名与空白，**字符串、JSX 结构、函数边界全部完整**，可直接还原

## 2. 分发链路

```
Spring Boot jar
└── resources/static/
    ├── index.html      ← UmiJS 注入 runtime + umi.js + umi.css
    ├── umi.<hash>.js   ← 主包（路由、API 客户端、布局、i18n、antd、dva、axios 全在这）
    ├── umi.<hash>.css
    └── p__*.async.js / <id>.async.js / *.chunk.css
```

后端用 Spring Boot 默认静态资源处理，无 context path。前端不参与服务端渲染。

## 3. 路由表

完整路径（从 `path:` 定义还原，共 40 条）：

| 路由 | 菜单名 | 说明 |
|---|---|---|
| `/` | — | 布局根 |
| `/home` | home | 首页 |
| `/project` | project | 我的项目 |
| `/project/:id` | — | 项目详情 |
| `/exercise` | exercise | 我的练习 |
| `/exercise/:repoId` | — | 练习详情 |
| `/repo` | repo | 题库中心（父级） |
| `/repo/index` | repo | 题库列表 |
| `/repo/template` | template | 题库模板 |
| `/repo/book` | book | 练习册 |
| `/repo/:repoId/questions/:mode` | questions | 题目列表（按模式） |
| `/template` | template | 模板广场 |
| `/survey` | — | 问卷容器 |
| `/survey/:id` | survey-overview | 问卷总览 |
| `/survey/:id/edit` | survey-edit | **问卷设计器** |
| `/survey/:id/setting` | survey-setting | 问卷设置 |
| `/survey/:id/flow` | survey-flow | 流程/逻辑 |
| `/survey/:id/data` | survey-data | 答卷数据 |
| `/survey/:id/report` | survey-report | 数据分析 |
| `/survey/:id/poster` | survey-poster | 海报/分享 |
| `/s/:id` | — | 公开答题（无布局） |
| `/s/:id/:answerId` | — | 答卷编辑/回填 |
| `/s/:id/exam-result/:answerId` | — | 考试结果 |
| `/s/:id/result/:resultId` | — | 结果查询 |
| `/t/:id` | — | 模板预览 |
| `/t/:id/:answerId` | — | 模板演示 |
| `/account/settings` | — | 账号设置 |
| `/account/settingsH5` | — | 账号设置（移动端） |
| `/system/user` | user | 用户管理 |
| `/system/role` | role | 角色管理 |
| `/system/dept` | dept | 部门管理 |
| `/system/position` | position | 职务管理 |
| `/system/dict` | dict | 数据字典 |
| `/system/setting` | setting | 系统设置 |
| `/setup` | — | 初始化向导（`layout: false`） |
| `/user/login` | — | 登录（`layout: false`） |
| `/user/register` | — | 注册（`layout: false`） |
| `/404` | — | 兜底 |

**侧边菜单实际顺序**（线上确认）：首页 → 我的项目 → 我的练习 → 题库中心 → 模板广场 → 系统管理
图标：`home` / `project` / `form` / `database` / `copy` / `setting`

## 4. 请求层（重建的核心）

全部收敛在一个封装里（`pretty/umi.ded23be0.js` L55195-55250）。还原成 TypeScript 大致是：

```ts
// 统一请求
const request = (method: string, url: string, data?: any, extra?: AxiosRequestConfig) =>
  axios({
    url,
    method,
    data,
    withCredentials: true,                 // ← 会话靠 Cookie
    params: method === 'GET' ? data : undefined,
    paramsSerializer: (p) =>
      qs.stringify(p, { skipNull: true, skipEmptyString: true }),
    headers: {
      Accept: 'application/json',
      'Accept-Language': currentLocale(),   // zh-CN / en-US / ...
      'Cache-Control': 'no-cache',
      'X-XSRF-TOKEN': readCookie('XSRF-TOKEN'),  // ← 双提交 CSRF
      Expires: '-1',
      Pragma: 'no-cache',
      'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json',
    },
    transformResponse: [(raw) => {
      const res = JSON.parse(raw);
      if (res.code === 200) res.success = true;
      else if (res.code === 401) { res.success = false; history.push('/user/login'); }
      else res.success = false;
      return res;
    }],
    ...extra,
  }).then((r) => {
    if (r.data.code === 403) message.error('未授权访问');
    if (r.data.code === 4043) message.error(r.data.message);
    return r.data;
  });
```

配套方法：`get(url, params)` / `post(url, data)` / `delete(url)` / `upload(url, form)` /
`download(url, opts)`（用 `content-disposition` 解析文件名 + `Blob` 触发下载）/
`getWithPagination(url, params)`（把 `list` 包成 `{current, pageSize, data, total}`）。

**重建时可直接照抄这段语义**，不需要猜后端约定。

## 5. 鉴权与会话

| 项 | 机制 |
|---|---|
| 会话载体 | **Cookie**（`withCredentials: true`，后端 Spring Security session） |
| CSRF | Cookie `XSRF-TOKEN` → 请求头 `X-XSRF-TOKEN`（双提交） |
| 未登录 | 响应 `code: 401` → 前端 `history.push('/user/login')` |
| 登录 | `POST /api/public/login` |
| 当前用户 | `GET /api/currentUser` → 再取 `GET /api/userOverview` |
| 登出 | `POST /api/public/logout` |
| 权限 | 前端仅做菜单/按钮级判断，实质由后端 `code: 403` 兜底 |

**注意**：跨域部署时必须 `allowCredentials` + 明确 `Access-Control-Allow-Origin`（不能是 `*`），且 CSRF cookie 需可读（非 HttpOnly）。

## 6. 响应约定

```jsonc
{ "code": 200, "message": "ok", "data": { } }
```

| code | 含义 | 前端行为 |
|---|---|---|
| 200 | 成功 | `success = true` |
| 401 | 未登录/会话过期 | 跳转 `/user/login` |
| 403 | 无权限 | toast「未授权访问」 |
| 4043 | 业务错误（需提示） | 直接 toast `message` |
| 其他 | 失败 | `success = false`，由调用方处理 |

GET 参数走 querystring，null/空串自动剔除；POST 走 JSON body，上传走 `multipart/form-data`。

## 7. 国际化

- 1494 条词条，id 形如 `pages.survey.editor.xxx`、`pages.system.user.xxx`
- 8 种语言：`zh-CN` / `zh-TW` / `en-US` / `ja-JP` / `ko-KR` / `de-DE` / `fr-FR` / `th-TH`
- 词条原文已导出：`extract/i18n.tsv`（id<TAB>中文/英文默认文案）
- **重建价值最高的一件资产**：等于拿到了全部 UI 文案与功能点索引

## 8. 布局与视觉

线上实测（AntD 经典后台布局，无 ProLayout）：

```
┌──────────────────────────────────────────────────────┐
│ [Logo] 系统名称         [?] [语言] [头像 用户名]      │  Header
├────────────┬─────────────────────────────────────────┤
│ 首页        │ 面包屑                                   │
│ 我的项目    │ ┌─────────────────────────────────────┐ │
│ 我的练习    │ │ 卡片 / 表格 / 表单                   │ │
│ 题库中心 ▾  │ └─────────────────────────────────────┘ │
│ 模板广场    │                                         │
│ 系统管理 ▾  │                                          │
└────────────┴─────────────────────────────────────────┘
```

- 左侧 Sider 可折叠，含二级菜单（题库中心、系统管理）
- 顶部 Header：系统 Logo + 系统名（可后台配置，本例为「威海市旭日职业培训学校」）、帮助、语言切换、用户菜单
- 内容区：面包屑 + Card 容器
- 默认亮色主题。i18n 里存在 `app.setting.pagestyle.light` / `realdark` 等词条，但主包中未找到暗色主题实现，疑似沿用 AntD Pro 模板残留词条

> ⚠️ `index.html` 内联注入了**百度统计**（`hm.baidu.com/hm.js?43e89c38...`）与微信 WebView 字号兼容脚本。自建/重写时按需移除。

## 9. 启动流程

```
加载 index.html
  → umi.js 初始化 dva / i18n / 路由
  → 请求系统配置（系统名、是否已初始化、Logo 等）
      ├─ dbInitialized=false 且当前不在 /setup、/s/ → 跳 /setup
      └─ 正常 → 请求 /api/currentUser
                  ├─ 401 → /user/login
                  └─ 成功 → 渲染布局 + 页面
  → document.title = 系统名
```

版本号写死在主包：`v1.13.0`。

## 10. 对「重写前端」的直接含义

**好消息**
- 路由、请求封装、响应约定、鉴权链路**已 100% 还原**，不需要试错
- 1494 条 i18n 词条 = 完整功能清单与文案
- 后端 153 个端点全开源，可读可改，接口语义有权威定义
- 数据模型可从 Java 实体直接取，不用从前端猜

**需要重做的重活**
- 问卷设计器（`/survey/:id/edit`）：拖拽、题型渲染、属性面板、条件逻辑编辑
- 数据/报告页：图表、交叉分析
- 流程编辑器（`/survey/:id/flow`）
- 答案渲染引擎：一套 DSL 同时渲染 Web/移动端/公开答题页

详见 `spec/pages.md`、`spec/api.md`、`spec/model.md`。
