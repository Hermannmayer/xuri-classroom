# 全项目审计总览（2026-11-06）

八个方向并行审计，各自独立报告：

| 报告 | 覆盖范围 | 分级统计 |
|---|---|---|
| [backend-security.md](backend-security.md) | 后端安全：鉴权/越权/注入/上传/泄露 | 严重 1 · 高 4 · 中 8 · 低 8 |
| [backend-data.md](backend-data.md) | 后端数据一致性：事务/并发/软删/缓存 | P0 5 · P1 11 · P2 11 |
| [permission-model.md](permission-model.md) | 权限模型：完整性/覆盖/提权路径 | P0 3 · P1 3 · P2 4 |
| [frontend-a.md](frontend-a.md) | 前端 A：答题/练习/设计器 | 高 4 · 中 11 · 低 12 |
| [frontend-b.md](frontend-b.md) | 前端 B：系统管理/API 层/路由/样式 | 高 2 · 中 13 · 低 12 |
| [business-logic.md](business-logic.md) | 业务逻辑：35 个设置项是否真生效 | 13 已实现 · 15 部分 · 7 未实现 |
| [db-deploy.md](db-deploy.md) | 数据库与部署：表结构/索引/迁移/Docker | P0 3 · P1 5 · P2 若干 |
| [code-quality.md](code-quality.md) | 代码质量：死代码/重复/测试/构建 | 11 类 + 优先 10 项 |

## 一、必须先修的 7 条（跨报告交叉确认）

### 安全

1. **公开接口可读任意人答卷**（严重，已实测）
   `getAnswerForProject` 只校验「答卷属于该项目」，不校验答卷人；`/api/public/projectOutline|loadProject|loadExamResult` 全是 `permitAll`。
   answerId 会出现在成绩单 URL 里 → 拿到就能读别人的答案。
   `SurveyServiceImpl.java:1131-1146`、`:185-202`、`:616-638`
2. **同一根因的写越权**：项目开了「允许修改答案」时，带他人 answerId 可直接覆盖对方答卷。
   `SurveyServiceImpl.java:373-383` → `AnswerServiceImpl.java:225-227`
3. **提交绕过密码/登录/白名单**：密码与登录校验只在「打开问卷」时执行，直接 POST `/api/public/saveAnswer` 可以提交受保护的问卷。
   `SurveyServiceImpl.java:353-360` vs `:1253-1259`、`:1424-1470`
4. **撤销成员后权限仍有效**：成员删除是软删，但权限 SQL 不过滤 `is_deleted` → 被踢掉的人仍能看/改/导出，甚至能永久删项目。
   `ProjectPartnerServiceImpl.java:170-173` + `ProjectPartnerMapper.java:14` + `DataPermAspect.java:57-60`
5. **组维度的提权缺口（3 条 P0）**
   - `system:user:create` / `system:user:update` 改 `deptId`/`deptIds` 无任何校验 → 把账号塞进绑了高权限角色的组即提权（`UserServiceImpl.java:439/469/478/517-525`）
   - `assertManageableUser` 只看直挂角色 → 可重置/删除「靠组继承高权限」的用户，账号接管（`:877`、`:910-917`）
   - `updateDept` 改 `parentId` 无校验 → 挂到高权限祖先下继承角色（`DeptServiceImpl.java:130-135`）

### 数据正确性

6. **客户端自带的 `survey` 会参与判分**：先提交一份伪造成 `examCorrectAnswer` 的答卷快照，再改答案即可按伪造 schema 判分 → **可刷满分**。
   `AnswerViewMapper.java:14`、`AnswerServiceImpl.java:769-771`、`:843-850`
7. **重复提交无幂等 + 首次提交不受时长限制**：新建答卷每次 `UUID.randomUUID()`、表上无唯一约束；`assertWithinTimeLimit` 在 `previousAnswer == null` 时直接放行，而首次提交必然查不到 → 双击产生两条答卷，最长/最短交卷对真实答题时长无效。
   `AnswerServiceImpl.java:225-238`、`:786-810`

### 部署

8. **全新部署跑不起来**（3 个 P0 都是 init 脚本与代码漂移）
   - `t_repo_partner` 缺 `dept_id`（`init-mysql.sql:312-321`）
   - `t_dept` 缺 `valid_from` / `valid_to`（`:142-158`）→ 任何查 dept 的地方都报错
   - 只 seed 了 admin 一个角色；`register_info` 为 NULL → 自注册直接抛错（`:371`、`:401`）

## 二、前端高危 4 条

1. **权限缓存跨账号不失效**：`auth/permissions.ts:12-25` 模块级缓存从不清理，`clearAuthorities()` 全仓 0 调用；同一标签页「管理员登出 → 学员登录」后，管理菜单与导出按钮仍会显示（后端仍 403，但属于真实越权 UI）。
2. **`download()` 把错误 JSON 存成文件**：`api/request.ts:128-138` 只看 `res.ok`，后端「HTTP 200 + body.code」的错误会被当文件保存。
3. **全站没有 ErrorBoundary**：任何渲染异常整页白屏。
4. **答题草稿/answerId 存 localStorage 且登出不清理**：公用电脑上后一位用户能看到前一位的整份答案。

## 三、业务逻辑：设置项真实生效情况

35 个设置项：**13 已实现 / 15 部分实现 / 7 未实现**。

- ❌ 未实现：显示题目序号、允许复制题目、错题练习、完成跳转、triggerType、defaultLocale、initialValues
- 🟡 部分实现：自动暂存、考试结束时间、最短/最长交卷、最大切屏、闯关、闯关限时、排名、回收上限、每 IP、每设备、白名单、微信限制、显示成绩单、显示解析
- 评分口径：多选=集合全等；未作答与答错在计分上等价（都 0），只有错题本用 `hasAnswer` 区分；没配分值一律 0 分；主观题无人工打分恒 0

## 四、权限模型结论

- `@PreAuthorize` 里 **59 个真实权限串全部存在于 `PermissionEnum`（73 项），0 个拼错**
- **150 个映射方法里 100 个有注解**，37 个线上可访问的没有注解；绝大多数是 `/api/public/**`（设计如此），需要处理的是 `ProjectApi.selectUser`（枚举用户手机号/邮箱）与 `DashboardApi.listDashboard`
- admin 角色保护在 API 面**不可绕过**（code/authority/删除/绑组都被拦）；真正的绕过面是「换个组」
- 3 项元数据漂移：`repo:export` / `repo:import` / `system:log:list` 已接入但仍标 `suggested=true`

## 五、代码质量要点

- 死模块：`settings.gradle` 里的 `flow` / `exam` 没有任何模块依赖，`flow` 还拖着 Flowable 全家桶
- **评分判定有三套实现**（成绩单、错题本练习、后端 evaluator）→ 口径漂移会导致「卷面 60、成绩单 58」
- 后端 **0 个测试类**；前端只有两个纯逻辑脚本（树 9 断言、规则 27 断言）
- 文档漂移：`docs/permissions.md` 写「56 个权限点 / 老师 30」，实测目录 73 项、admin 83、teacher 36、student 5
- 12 处 `printStackTrace`；`GlobalExceptionHandler` 把权限拒绝打成 error
- `scripts/dev` 里 40 个 `patch-*.cjs` 一次性脚本

## 六、建议修复顺序

| 优先级 | 事项 | 参考 |
|---|---|---|
| 1 | 公开接口 answerId 的归属校验（读 + 写） | backend-security §1.1 §2.1 |
| 2 | `saveAnswer` 补密码/登录/白名单校验 | backend-security §2.2 |
| 3 | 权限 SQL 过滤 `is_deleted`（撤销成员立即生效） | backend-data P0-1 |
| 4 | 组维度守卫：判权用「直挂 ∪ 组链」、改组校验 parentId | permission-model P0-1~4 |
| 5 | 判分只用服务端 schema，不信任客户端 `survey` | backend-data P0-3 |
| 6 | 提交幂等 + 首次提交的时长校验 | backend-data P0-4 |
| 7 | init 脚本补 3 处 P0，保证全新部署可用 | db-deploy P0-1~3 |
| 8 | 前端权限缓存清理 + `download()` 错误识别 + ErrorBoundary | frontend-b 高 1/2、frontend-a 高 3 |

## 七、正面控制（避免只看坏消息）

- 全仓无 `${}` SQL 拼接；`.last("limit ...")` 的 limit 已夹紧 1..100
- 上传六重校验（文件名/路径段/扩展名/像素/大小/频率/配额）；公共文件必须 `shared=1`
- JWT 随机密钥、cookie HttpOnly + SameSite=Lax、登录限次 10 次/10 分钟
- 导出需一次性 token 或密码，且写审计日志
- `@EnableDataPerm` 切面、SpEL 字段白名单、OAuth `safeRedirect`
- 软删 + 唯一键的三处历史坑已用物理删除/生成列规避，其余表无此组合
- 前端零 `any`、TS strict、`http()` 统一封装、CSS 变量无未定义、暗色弹层已修

## 八、边界说明

- 除 backend-security §1.1（实测读到他人答卷）与 db-deploy 的现网比对、business-logic 的只读探针外，其余为静态分析
- 未做：动态渗透、真机读屏、压测、依赖 CVE 逐条核验
- 并发类结论（重复提交、限额穿透）为静态推导，未做并发实测
