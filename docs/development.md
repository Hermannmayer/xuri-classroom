# 开发说明

## 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 前端 | React 18 + TypeScript + Ant Design 5 + Vite 5 | 自行开发 |
| 路由 | react-router-dom 6 | 页面按业务域划分 |
| 请求 | 自研 `fetch` 封装 | 后端 HTTP 恒 200，结果在 `body.code` |
| 状态 | React 内置 + 局部 hook | 编辑器有撤销/重做（`designer/useHistory.ts`） |
| 加密 | jsencrypt | 登录密码需要 RSA/PKCS#1 v1.5，Web Crypto 不支持该填充 |
| 后端 | Spring Boot 2.7 + MyBatis-Plus + MySQL 8 | 基于开源 SurveyKing 二次开发 |
| 主题 | antd token + CSS 变量 | 亮/暗两套，见 `ui-style.md` |

## 后端契约（实测，务必遵守）

1. **HTTP 状态恒为 200**：返回 `{code, message, data}`；`200` 成功、`401` 未登录、`403` 无权限，其余按业务错误透出。
2. **没有 CSRF**：后端 `csrf().disable()` + `STATELESS`，不要照抄旧文档里的双提交方案。
3. **JWT 在 Cookie 里**：`sk-token`，HttpOnly + SameSite=Lax → 开发期必须用 Vite 同源代理，不能走 CORS。
4. **登录密码 RSA 加密**：公钥来自 `GET /api/system` 的 `publicKey`，**每次后端重启都会变**，登录前要重新取。
5. **JSON 序列化**：`non_null`（空字段不返回）、日期 `yyyy-MM-dd HH:mm:ss`、时区 GMT+8。
6. **未知路径返回 `index.html`**：请求层已拦非 JSON 响应，避免 `JSON.parse` 崩溃。
7. **写接口大多返回 `void`**：`project/update`、`answer/*`、`system/*`，不能靠响应回填，改完要重新拉。
8. **项目有缓存**：`custom-cache.projectCache: 1d`，直接改库不会立刻生效，重启后端才刷新。

## 目录结构

```
client/
  src/
    api/          request.ts（封装）· index.ts（各域接口）· types.ts
    auth/         permissions.ts（权限判定）
    schema/       types.ts · flatten.ts · rules/（表达式与求值）
    renderer/     题型注册表 · SchemaRenderer · questions/
    designer/     大纲树 · 属性面板 · 规则编辑器 · 选项编辑
    pages/        user / project / survey / answer / repo / exercise / system / account / home
    layout/       BasicLayout + MobileTabBar
    theme/        ThemeProvider + buildTheme
    i18n/
    router.tsx
  vite.config.ts  代理 /api → VITE_API_TARGET（默认 http://127.0.0.1:7007）
server/
  api/            REST 接口
  rdbms/          业务实现与数据访问
  shared/         公共模型与工具
scripts/
  dev/            本地启动、数据导入、修补脚本
  deploy/         生产部署与备份（见 deploy/README.md）
docs/             文档
```

## 本地环境

| 组件 | 位置 | 说明 |
|---|---|---|
| JDK 8 | `%LOCALAPPDATA%\jdk8\jdk8u504-b01` | Temurin 免安装版 |
| MySQL 8.0.24 | `%LOCALAPPDATA%\mysql\mysql-8.0.24-winx64` | 便携版，3306，root/123456，库 `surveyking` |
| 后端 | `server/api/build/libs/surveyking-v1.13.0.jar` | `gradlew :api:bootJar -x test`，默认端口 7007（内部） |
| 前端 | `client/` → `npm run dev` | **对外 80**，`/api` 代理到后端 7007 |

启动顺序：`scripts/dev/start-mysql.ps1` → `scripts/dev/start-backend.ps1` → `npm run dev`（均在仓库根目录执行）。

端口约定：**前端占 80，后端随便一个端口（默认 7007）**。后端不再需要管理员权限，也不对外暴露；
接口走同源代理，JWT 的 HttpOnly cookie 才能正常工作。生产环境同构：nginx 80 + 后端 7007 内网。

**改后端代码后必须重新构建并重启**，否则 `@Cacheable` 的缓存不会刷新（表现是改了库但页面没变）。

## 检查命令

```bash
cd client
npx tsc --noEmit      # 类型检查
npm run test:rules    # 规则引擎断言（27 项）
npm run test:tree     # 树操作断言（9 项）
npm run build         # 生产构建
```

## 已知限制

- **数据库只支持 MySQL 8**：代码里 H2 的依赖是注释掉的，没有多库支持与迁移工具。
- **生产部署**：见 `scripts/deploy/README.md`（Docker / Linux systemd / Windows 服务）。
- **题库导入**：Excel 要按题型分 sheet（单选/多选/判断/填空/简答），列名固定；单 sheet+题型列的格式需要先用 `scripts/dev/convert-repos.py` 转换。
- **答题导出**：评分题为纯数字时后端曾抛异常导致空文件，已修（`SchemaHelper.parseOptionValue`）。
