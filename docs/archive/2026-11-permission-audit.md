> ⚠️ 历史审计快照（2026-11-08）：点数与“未处理”列表已过时。当前事实见 [权限与角色](../modules/permissions.md)；审计结论已并入模块页和 ADR。

# 权限与角色审计（2026-11-08）

> 口径：管理员 = 管理权限全集；学员能力（开始答题/开始练习/错题本/题目只读/学员视角/练习记录）
> 是另一条轴，不随管理员全量注入。老师 = 教学、题库、答卷、班级管理；不含系统管理与学员能力。

## 1. 当前角色矩阵

| 角色 | code | 权限点数 | 学员能力 | system:* | 说明 |
|---|---|---|---|---|---|
| 超级管理员 | admin | 71 | 否 | 是 | 管理权限全集；学员能力不自动注入 |
| 老师 | teacher | 33 | 否 | 否 | 建/编/发/删自己创建的考试与问卷、从题库组卷、题库导入、答卷补录/批改、班级管理；**保留 project:create/update/delete，但无 repo:create/update/delete（不能改题库本身）；删答卷/恢复答卷归管理员** |
| 学员 | xueyuan | 14 | 是 | 否 | 答题、练习、错题本、题目只读、我的考试 |

> 2026-11-09 清理后口径：管理员 71 个管理权限点，老师 33 个，学员 14 个（含 6 个学员专属）。
> 历史前缀（project/answer/repo/template/file/exercise/user 等）已从 t_role.authority 清掉，不再出现在权限矩阵里。

学员专属权限（PermissionEnum.studentOnly=true，前端 STUDENT_ONLY_PERMISSIONS）：

- project:answer 开始答题
- repo:practice 开始/随机/继续练习
- repo:book 错题本/练习册
- repo:questions:read 查看题库题目
- exercise:list 练习记录/练习页
- portal:student 学员视角

## 2. 本次已修

| # | 问题 | 影响 | 修法 |
|---|---|---|---|
| 1 | 前端 can() 对 ROLE_admin 直接放行 | 管理员/老师页面反复出现「开始答题/开始练习」，权限配置形同虚设 | 学员专属权限必须精确命中；题库列表的本地 hasPermission 改用统一 can() |
| 2 | 管理员自动注入“全部权限目录” | 与“管理员不应有学员入口”互锁 | 目录分管理/学员两类，studentOnly 不注入；管理员=管理全集 |
| 3 | /api/answer/list 只校验 answer:list，无数据范围 | 学员知道 projectId 可看别人答卷 | 管理员/项目所有者/协作者（含组）看全部；本人看自己；getAnswer 同步校验 |
| 4 | @EnableDataPerm 只认 user_id、无管理员例外 | 组协作者/管理员在数据、报表、答卷接口被误判 403 | getProjectPerms 合并组授权；Aspect 管理员直接放行 |
| 5 | repo:book 兼任“错题本”和“看题库题目” | 权限语义混乱，学员靠错题本权限点开题库 | 新增 repo:questions:read，题目列表接口/路由/按钮改用独立权限 |
| 6 | 老师保留 user:import | 可绕过用户管理批量导入账号 | 老师收回；学员由班级管理添加，教职工由管理员创建 |
| 7 | 管理员题库列表受 createBy 限制 | 别人建的题库管理员看不到 | 管理员跳过成员过滤，看全部 |
| 8 | 练习记录 exercise:list 管理员自动拥有 | 管理员仍能看到学员练习入口 | 标记 studentOnly，迁移清掉管理员/老师的历史串 |
| 9 | 班级/用户组两套树 | 页面重复、术语混乱 | 班级管理承载组织设置；/system/group 对有 class:list 的账号重定向 |
| 10 | 分组删除无入口/无解释 | 有成员/子组时删不掉且不知道为什么 | 班级页加「删除分组」；有成员/子组返回明确中文原因；空组可删 |
| 11 | 预设按 student 字符串查找 | 线上学员角色 code 是 xueyuan，套用学员预设失败 | 改为按角色 id 复制；任意现有角色（含未来新增）都可作为复制源 |
| 12 | 权限预设静态常量过期 | 还留着 repo:create/update/delete、home 等旧权限 | 删除静态清单，页面只从内置角色实时读取 |
| 13 | 内置角色识别漏 xueyuan | 学员角色不被标“预设”、code 可被改 | BUILTIN_CODES 加 xueyuan |
| 14 | 报表/设置路由守卫与接口不一致 | 进入后被 403 | 报表改 project:report；设置加 project:update；题目页支持任意权限命中 |

## 3. 仍建议下一轮处理（已审计，未在本次改）

| 优先级 | 位置 | 问题 | 本轮处理 |
|---|---|---|---|
| P1 | survey/Overview.tsx | 编辑/数据/保存/授权按钮只按页面 project:detail 渲染，学员/只读协作者可见但 403 | 编辑/保存仅 project:update，数据仅 answer:list，协作者仅 project:partner；无 update 时整页只读，报表/答卷接口按权限跳过 |
| P1 | project/List.tsx | 「开启/关闭」仍走 /project/update，没有走 project:publish 端点 | 改走 POST /project/status；按钮仅 project:publish；删除/批量删除仅 project:delete |
| P1 | router.tsx /teaching | 守卫是 portal:teacher，接口要 project:report | 改为 portal:teacher **且** project:report；菜单/移动端/首页/任务中心同步 |
| P2 | system/Group.tsx | 角色列依赖 system:role:list，只有组织权限的角色会静默空角色 | 新增 GET /system/role/options 只读接口；无权限时显示“无权读取角色”并禁用选择 |
| P2 | project/List.tsx 操作列 | 6 个链接、宽 280，中文仍有折行风险 | 按实际动作数算宽 + nowrap；删除类对老师隐藏 |
| P2 | 老师矩阵 | answer:create/update/delete、project:delete、file:delete 偏宽 | 保留 project:delete（仅能删自己创建的考试）、answer:create/update；收回 answer:delete / answer:restore；file:delete 保留但仅能删自己上传的文件 |
| P3 | repo:import / template:import | 两个导入权限语义重叠，老师都有 | 合并为 template:import；迁移补串后删除 repo:import，老师可正常导入题目 |
| P3 | system:user:create:student | 只在服务层分档使用，未挂接口注解 | 已挂到 /user/create 与 /importUser；服务层仍按目标角色二次校验 |
| P3 | t_role.authority 历史前缀 | project、answer、repo、template、file、system:org 等不是权限点 | 23-permission-cleanup.sql 逐 token 清理；初始化脚本同步为新矩阵 |

## 4. 验证

- 前端 npm run check / npm run build、后端 :api:compileJava 通过。
- NAS 编译 + 重启 + 冒烟；前端静态资源 `index-NfuWq0rM.js` 200，admin 登录与试卷列表正常。
- 迁移 23 正式应用（先事务试跑回滚）：admin 71 / teacher 33 / student 14；
  老师保留 `project:create/update/delete/publish`，无 `repo:create/update/delete/import`；
  `answer:delete`、`answer:restore` 已收回；`template:import` 已补，`repo:import` 已删。
- 线上老师账号实测：创建考试 → 改名 → 删除 → 彻底删除（回收站）全部 200，随后清理测试数据；
  `POST /api/answer/delete` 返回 403；`/api/system/user/list` 403；`/api/system/role/options` 200；
  `/api/teaching/projects`、`/api/teaching/classes/tree` 200。
- 管理员：`/api/currentUser` 无 `repo:practice` / `project:answer`；题库页无练习入口；
  `/api/system/role/options`、`/api/teaching/projects` 均 200。
- 老师题库页为「题库浏览」，没有新建/编辑/删除/授权之外的管理动作；老师进入班级管理页正常。
- 临时验证账号已逻辑删除（`is_deleted=1`），临时考试已彻底删除。
