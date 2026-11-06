# 权限与角色

> 本文是「权限设计基线」：先盘点后端代码里真正存在的权限点，再对照三类身份，
> 最后给出建议新增的权限点与落地路线。改动权限前请先更新本文。
>
> 盘点方式：对 `server/**/*.java` 全量提取 `@PreAuthorize("hasAuthority('...')")`，
> 得到 **56 个权限串**，再与 `t_role.authority` 里三个角色的实际授予情况对照。

## 1. 现状总览

系统有三类角色，权限来自后端 `t_role.authority`，前端按 `authorityList` 决定菜单、按钮和页面可见性。

| | 管理员 `admin` | 老师 `teacher` | 学员 `student` |
|---|---|---|---|
| 定位 | 系统运维 + 全部业务 | 出卷、管题库、看数据 | 做题、练习 |
| 判定方式 | `ROLE_admin` 全放行 | 权限串精确命中 | 权限串精确命中 |
| 权限点数量 | 56（全量） | 30 | 5 |

## 2. 权限点全量清单

「代码用途」只列一到两处代表性接口；`✅` 表示该角色当前实际持有。

### 2.1 考试 / 项目（`project:*`）

| 权限串 | 代码用途 | 管理员 | 老师 | 学员 |
|---|---|:--:|:--:|:--:|
| `project:list` | 列表 `GET /api/project/list` | ✅ | ✅ | ❌（改用 `exercise:list` 兜底） |
| `project:detail` | 详情、设置读取 | ✅ | ✅ | ❌ |
| `project:create` | 新建、恢复回收站 | ✅ | ✅ | ❌ |
| `project:update` | 保存题目、改设置、开关收集中 | ✅ | ✅ | ❌ |
| `project:delete` | 移入回收站 | ✅ | ✅ | ❌ |
| `project:report` | 报表 | ✅ | ✅ | ❌ |

### 2.2 答卷（`answer:*`）

| 权限串 | 代码用途 | 管理员 | 老师 | 学员 |
|---|---|:--:|:--:|:--:|
| `answer:list` | 答卷列表 | ✅ | ✅ | ❌ |
| `answer:detail` | 单份答卷 | ✅ | ✅ | ❌ |
| `answer:create` | 后台补录 | ✅ | ✅ | ❌ |
| `answer:update` | 修改答卷 | ✅ | ✅ | ❌ |
| `answer:delete` | 删除答卷 | ✅ | ✅ | ❌ |
| `answer:export` | 导出 Excel | ✅ | ✅ | ❌ |
| `answer:upload` | 附件上传 | ✅ | ✅ | ❌ |

> 学员提交答卷走公开接口 `/api/public/saveAnswer`，不受 `answer:*` 约束（匿名也能答），
> 这几个权限点是「后台管理答卷」用的，别和「学员能答题」混为一谈。

### 2.3 题库与题目（`repo:*`、`template:*`）

| 权限串 | 代码用途 | 管理员 | 老师 | 学员 |
|---|---|:--:|:--:|:--:|
| `repo:list` | 题库列表 | ✅ | ✅ | ✅ |
| `repo:detail` | 题库详情、题目读取 | ✅ | ✅ | ✅ |
| `repo:create` | 新建题库 | ✅ | ✅ | ❌ |
| `repo:update` | 改题库、改题目、导入 | ✅ | ✅ | ❌ |
| `repo:delete` | 删题库、删题目 | ✅ | ✅ | ❌ |
| `repo:book` | **错题本 / 收藏 / 练习** | ✅ | ✅ | ✅ |
| `template:list` | 题目列表 | ✅ | ✅ | ❌ |
| `template:create` | 新增题目 | ✅ | ✅ | ❌ |
| `template:update` | 改题目 | ✅ | ✅ | ❌ |
| `template:delete` | 删题目 | ✅ | ✅ | ❌ |

> `repo:book` 是学员功能，放在 `repo` 域里只是因为历史原因；它不代表任何题库管理权限。

### 2.4 练习（`exercise:list`）

| 权限串 | 代码用途 | 管理员 | 老师 | 学员 |
|---|---|:--:|:--:|:--:|
| `exercise:list` | 练习记录、练习页；同时给 `project:list` 兜底 | ✅ | ✅ | ✅ |

### 2.5 文件（`file:*`）

| 权限串 | 代码用途 | 管理员 | 老师 | 学员 |
|---|---|:--:|:--:|:--:|
| `file:list` / `file:detail` / `file:import` / `file:delete` | 附件与导入文件 | ✅ | ✅ | ❌ |

### 2.6 系统管理（`system:*`，共 26 个，仅管理员）

`system:user`（list/create/update/updatePosition/delete）、`system:role`（list/create/update/delete）、
`system:dept`（list/create/update/delete）、`system:position`（list/create/update/delete）、
`system:dict`（list/create/update/delete）、`system:dictItem`（list/create/update/import/delete）。

> ⚠️ 前端已经把「角色 / 职务 / 数据字典」三个入口剪掉了，这些权限点目前**有权限、无入口**。

### 2.7 其它

| 权限串 | 用途 | 管理员 | 老师 | 学员 |
|---|---|:--:|:--:|:--:|
| `home` | 首页 | ✅ | ✅ | ❌ |
| `user:update` | 改自己的资料 / 密码 | ✅ | ✅ | ✅ |

## 3. 盘点发现的问题

1. **导出没有独立权限**：`answer:export` 有，但题库/题目导出没有对应权限点，`repo:detail` 等于「能看就能导」。老师可以把整个题库导走。
2. **删除权限过宽**：老师同时拥有 `project:delete`、`repo:delete`、`template:delete`、`answer:delete`、`file:delete`。题库误删的代价很高，建议区分「归档」与「彻底删除」。
3. **没有操作审计**：既没有 `system:log:*` 权限点，后端也没有审计表。谁导出了什么、谁改了谁的权限，事后查不到。
4. **权限点与界面不一致**：26 个 `system:*` 里，角色/职务/数据字典相关的前端入口已被剪掉。
5. **系统设置页靠 `system:role:list` 兜底**：语义错位，改系统设置应该有自己的权限点。
6. **`home` 当成权限点**：首页是登录后的默认页，不该要权限；真要去掉，得同时改菜单过滤逻辑。
7. **协作者选择需要用户列表**：老师没有 `system:user:list`，所以「加协作者」只能走 `/api/project/selectUser`（已按此改造）。
8. **组级权限缺失**：`t_dept` 只决定数据可见范围，不能覆盖功能权限；同角色不同组无法差异化。

## 4. 建议新增的权限点

原则：**能造成数据外流或不可逆损失的动作，都必须单独一个权限点**，别混在 `xxx:update` 里。

| 建议权限串 | 中文名 | 建议默认授予 | 理由 |
|---|---|---|---|
| `repo:export` | 导出题库 | 仅管理员 | 题库是最核心资产，导出必须可单独关闭 |
| `repo:import` | 导入题库 | 管理员 + 老师 | 批量导入是日常操作，但要有审计 |
| `repo:grant` | 题库授权给组 | 管理员 + 老师 | 和「改题库」分开，避免随手扩大可见范围 |
| `template:export` | 导出题目 | 仅管理员 | 同上，题目级导出同样危险 |
| `project:publish` | 开启 / 关闭收集 | 管理员 + 老师 | 关掉收集会让学员打不开，属于高风险操作 |
| `project:partner` | 协作者与班级授权 | 管理员 + 老师 | 现在混在 `project:update` 里 |
| `answer:audit` | 人工改分 / 审核 | 管理员 + 老师 | 和「改答卷内容」区分，成绩可追溯 |
| `answer:restore` | 答卷回收站恢复 | 管理员 + 老师 | 与 `answer:delete` 对称 |
| `exercise:manage` | 删除他人练习记录 | 管理员 | 现在学员练习记录删不掉，管理员也删不了别人的 |
| `system:setting:update` | 修改系统设置 | 仅管理员 | 水印、防复制、协作者策略都在这里，必须独立 |
| `system:log:list` | 查看操作日志 | 仅管理员 | 审计能力的前提 |
| `system:log:export` | 导出操作日志 | 仅管理员 | 出事时的取证能力 |
| `system:backup` / `system:restore` | 备份 / 恢复 | 仅管理员 | 部署脚本已有，界面还没有 |
| `user:import` / `user:export` | 批量导入 / 导出用户 | 仅管理员 | 现在隐含在 `system:user:create` 里 |
| `content:protect` | 水印与防复制策略 | 仅管理员 | 和 `system:setting:update` 可合并，二选一 |

## 5. 目标权限矩阵（建议）

| 能力 | 管理员 | 老师 | 学员 |
|---|:--:|:--:|:--:|
| 建卷 / 改卷 / 删卷（回收站） | ✅ | ✅ | ❌ |
| 开启关闭收集 | ✅ | ✅ | ❌ |
| 看答卷 / 导出答卷 | ✅ | ✅ | ❌ |
| 改分 / 审核答卷 | ✅ | ✅（可关） | ❌ |
| 建题库 / 改题目 | ✅ | ✅ | ❌ |
| 导入题库 | ✅ | ✅ | ❌ |
| **导出题库** | ✅ | ❌ | ❌ |
| 删题库 / 删题目 | ✅ | ✅（建议改成归档） | ❌ |
| 题库授权给班级 | ✅ | ✅ | ❌ |
| 浏览题库 / 练习 / 错题本 | ✅ | ✅ | ✅ |
| 参加考试 | ✅ | ✅ | ✅ |
| 用户 / 用户组 / 系统设置 / 日志 / 备份 | ✅ | ❌ | ❌ |
| 改自己资料密码 | ✅ | ✅ | ✅ |

## 6. 落地路线

1. **权限目录 API**（0.5 天）：后端建 `PermissionEnum`（权限串 / 中文名 / 分组 / 默认授予角色），
   暴露 `GET /api/system/permission/list`。现在权限串散落在注解里，前端没法列出可勾选项。
2. **角色权限矩阵页**（1 天）：系统管理 → 角色权限，按分组渲染勾选框，保存回 `t_role.authority`。
   这是「权限配置」的入口，之前被剪掉了，得补回来。
3. **补新增权限点**（0.5 天）：按第 4 节加注解与常量，存量角色补授默认值。
4. **用户组权限覆盖**（2～3 天）：`t_dept` 加 `authority_mode`（继承 / 追加 / 覆盖）+ `authority`，
   登录时按「用户所在组 + 祖先组」解析最终权限。详见待办里的设计稿。

## 7. 数据可见性（与功能权限是两条线）

**题库**：`t_repo_partner`（`user_id` 或 `dept_id` = 我的部门），支持父组继承（`WITH RECURSIVE`）
**考试**：`t_project_partner`（`user_id` 或 `group_id` = 我的部门，`type` 为 1/2/3）

匿名答题不受这两条影响——公开链接 `/s/:id` 任何人都能答。

## 8. 前端与后端如何配合

```ts
import { can, loadAuthorities } from '../auth/permissions';
const authorities = await loadAuthorities();
can(authorities, 'repo:create'); // 学员为 false
```

- 菜单：`BasicLayout` 按权限过滤；页面：`RequirePerm` 守卫；按钮：按权限渲染而不是 disabled
- 后端所有写接口都有 `@PreAuthorize`，前端隐藏只是体验，真正拦截在后端

> ⚠️ 已知坑：`loadAuthorities()` 内部走 `http()`，**匿名页面调用会因 401 被全局踢到登录页**。
> 公开页（`/s/:id` 答题）不要用它，改用裸 `fetch('/api/currentUser')` 并静默处理失败。

## 参考

- [ADDING MULTI-TENANCY AND A FLEXIBLE PERMISSION SYSTEM TO THE ONLINE EXAMINATION TOOL XAMINER](https://epub.jku.at/obvulihs/download/pdf/12444779) —— 在线考试系统里「角色 + 资源级授权」的拆分思路
- [后台管理设计方案（权限部分）](https://github.com/zheco68-collab/kece/blob/main/%E5%90%8E%E5%8F%B0%E7%AE%A1%E7%90%86%E8%AE%BE%E8%AE%A1%E6%96%B9%E6%A1%88.md) —— 中文后台常见的「域:对象:动作」权限串约定
