<!-- 由 npm run docs:gen 生成；不要手改。来源：server/shared/.../PermissionEnum.java -->

# 权限目录（生成）

> 共 77 个权限点。`学员专属` 不会自动注入管理员；其余权限管理员运行时自动拥有。

| 权限码 | 名称 | 分组 | 说明 | 学员专属 |
|---|---|---|---|---|
| `project:list` | 查看考试列表 | EXAM | 考试与问卷列表；学员的「我的考试」用 exercise:list 兜底 |  |
| `project:detail` | 查看考试详情 | EXAM | 读取考试基本信息与设置、答题页与预览 |  |
| `project:create` | 新建考试 | EXAM | 新建考试/问卷、复制、从回收站恢复 |  |
| `project:update` | 编辑考试 | EXAM | 保存题目、修改考试设置 |  |
| `project:delete` | 删除考试 | EXAM | 移入回收站；回收站内的项目不会被物理删除 |  |
| `project:report` | 查看考试报表 | EXAM | 按题目统计的图表报表 |  |
| `project:publish` | 开启/关闭收集 | EXAM | 关闭后学员打不开问卷，属于高风险操作 |  |
| `project:partner` | 协作者与班级授权 | EXAM | 把考试授权给协作者或班级，目前混在编辑考试里 |  |
| `project:answer` | 开始答题 | EXAM | 进入考试/问卷答题页作答；学员功能，老师/管理员默认不给 | 是 |
| `answer:list` | 查看答卷列表 | ANSWER | 答卷列表与答卷数据页 |  |
| `answer:detail` | 查看单份答卷 | ANSWER | 查看单份答卷的作答明细 |  |
| `answer:create` | 补录答卷 | ANSWER | 后台代填、批量导入答卷 |  |
| `answer:update` | 修改答卷 | ANSWER | 改答卷内容与批注 |  |
| `answer:delete` | 删除答卷 | ANSWER | 把答卷移入回收站 |  |
| `answer:export` | 导出答卷 | ANSWER | 导出 Excel，含作答人信息，可单独关闭 |  |
| `answer:upload` | 上传答卷附件 | ANSWER | 为答卷补充附件材料 |  |
| `answer:restore` | 恢复答卷 | ANSWER | 从回收站恢复答卷，与删除答卷对称 |  |
| `repo:list` | 查看题库列表 | REPO | 题库列表、练习册入口 |  |
| `repo:detail` | 查看题库详情 | REPO | 读取题库信息与题目；管理员/老师的管理入口 |  |
| `repo:questions:read` | 查看题库题目 | REPO | 打开题库查看题目列表；与错题本 repo:book、练习入口 repo:practice 分开 | 是 |
| `repo:create` | 新建题库 | REPO | 新建题库、从题库复制 |  |
| `repo:update` | 编辑题库 | REPO | 改题库、改题目、导入题目 |  |
| `repo:delete` | 删除题库 | REPO | 删题库/删题目；代价高，建议改为归档 |  |
| `repo:book` | 错题本/收藏 | REPO | 错题本与收藏，属于学员功能；练习入口已拆到 repo:practice | 是 |
| `repo:practice` | 开始练习 | REPO | 题库的开始/随机/继续练习；学员功能，老师/管理员默认不给 | 是 |
| `repo:export` | 导出题库 | REPO | 题库是最核心资产，导出必须能单独关闭 |  |
| `repo:grant` | 题库授权给组 | REPO | 把题库授权给班级；与「编辑题库」分开，避免随手扩大可见范围 |  |
| `template:list` | 查看题目列表 | TEMPLATE | 题目列表与题目详情 |  |
| `template:create` | 新增题目 | TEMPLATE | 新建题目并入库 |  |
| `template:update` | 修改题目 | TEMPLATE | 修改题干、选项与属性 |  |
| `template:delete` | 删除题目 | TEMPLATE | 删除题库中的题目，不可恢复 |  |
| `exercise:list` | 练习记录与练习页 | EXERCISE | 我的练习、练习作答；学员专属，管理员不自动拥有 | 是 |
| `class:list` | 查看班级管理 | CLASS | 班级管理页入口；班主任看自己创建/负责的班，其他人看被授权的班 |  |
| `class:detail` | 查看班级成员与学情 | CLASS | 查看班级成员名单与成员信息 |  |
| `class:grant` | 分配班级给老师 | CLASS | 把班级的查看权限分配给老师；拥有者可看到全部班级用于分配 |  |
| `class:member:create` | 在班级中新增学员 | CLASS | 班主任在自己可见的班里添加学员账号 |  |
| `class:member:update` | 编辑班级学员 | CLASS | 改学员姓名/联系方式/状态、重置密码；不改角色与所属组 |  |
| `class:member:delete` | 删除班级学员 | CLASS | 删除学员账号；管理员与班主任可用 |  |
| `file:list` | 查看附件列表 | FILE | 附件与导入文件列表 |  |
| `file:detail` | 下载/预览附件 | FILE | 按 id 读取附件内容 |  |
| `file:import` | 导入文件 | FILE | 上传并导入外部文件 |  |
| `file:delete` | 删除文件 | FILE | 删除已上传的附件 |  |
| `user:update` | 修改本人资料 | USER | 改自己的资料与密码，三个角色都应具备 |  |
| `user:import` | 批量导入用户 | USER | 目前隐含在新建用户里，单独拆出来便于审计 |  |
| `system:user:list` | 查看用户列表 | SYSTEM | 用户管理列表、协作者候选 |  |
| `system:user:create` | 新建用户 | SYSTEM | 后台创建账号 |  |
| `system:user:update` | 修改用户 | SYSTEM | 改用户资料、状态与角色 |  |
| `system:user:delete` | 删除用户 | SYSTEM | 删除账号并清理角色关联 |  |
| `system:role:list` | 查看角色 | SYSTEM | 角色列表与权限目录；权限矩阵页的进入条件 |  |
| `system:role:create` | 新建角色 | SYSTEM | 新建角色并授予权限 |  |
| `system:role:update` | 修改角色 | SYSTEM | 改角色信息与权限串；权限矩阵保存所需 |  |
| `system:role:delete` | 删除角色 | SYSTEM | 删除角色；至少保留一个角色 |  |
| `system:dept:list` | 查看用户组 | SYSTEM | 用户组（班级）树 |  |
| `org:list` | 读取组织树 | SYSTEM | 只读组织树，供题库/考试授权选组；不含用户组管理 |  |
| `user:select` | 读取用户候选 | SYSTEM | 只读用户 id/姓名/组，供授权选人；不含用户管理 |  |
| `system:dept:create` | 新建用户组 | SYSTEM | 新建分组、调整分组排序 |  |
| `system:dept:update` | 修改用户组 | SYSTEM | 重命名、调整上级分组 |  |
| `system:dept:delete` | 删除用户组 | SYSTEM | 删除分组；至少保留一个分组 |  |
| `system:dict:list` | 查看数据字典 | SYSTEM | 字典列表（前端入口已裁剪，权限仍在） |  |
| `system:dict:create` | 新建字典 | SYSTEM | 新增字典 |  |
| `system:dict:update` | 修改字典 | SYSTEM | 改字典 |  |
| `system:dict:delete` | 删除字典 | SYSTEM | 删除字典 |  |
| `system:dictItem:list` | 查看字典项 | SYSTEM | 字典项列表 |  |
| `system:dictItem:create` | 新建字典项 | SYSTEM | 新增字典项 |  |
| `system:dictItem:update` | 修改字典项 | SYSTEM | 改字典项 |  |
| `system:dictItem:import` | 导入字典项 | SYSTEM | 批量导入字典项 |  |
| `system:dictItem:delete` | 删除字典项 | SYSTEM | 删除字典项 |  |
| `system:setting:update` | 修改系统设置 | SYSTEM | 水印、防复制、协作者策略都在这里；现在靠查看角色兜底，必须独立 |  |
| `system:log:list` | 查看操作日志 | SYSTEM | 审计能力的前提：谁导出了什么、谁改了谁的权限 |  |
| `file:upload` | 通用文件上传 | FILE | 系统 Logo 等通用上传；与「导入模板/题库文件」分开 |  |
| `template:import` | 批量导入题目 | TEMPLATE | 从 Excel/题库文件导入题目；原 repo:import 已合并到这里 |  |
| `system:user:create:student` | 新建学员 | SYSTEM | 只能创建「不含任何 system:* 权限」的角色（学员） |  |
| `system:user:create:teacher` | 新建老师/职工 | SYSTEM | 可创建带 system:* 权限的角色；比新建学员高一档 |  |
| `portal:student` | 学员视角 | PORTAL | 显示「我的任务」：考试安排 / 练习记录 / 我的成绩 | 是 |
| `portal:teacher` | 教师视角 | PORTAL | 显示「教学管理」与「班级学情」 |  |
| `portal:admin` | 管理视角 | PORTAL | 显示系统管理（用户 / 用户组 / 系统设置 / 权限 / 日志） |  |
| `content:protect` | 水印与防复制策略 | CONTENT | 全站水印与防复制开关；文档里标注可与修改系统设置二选一 |  |
