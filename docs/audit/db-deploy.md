# 数据库与部署审计（只读）

> 审计对象：`server/**/resources/scripts/*.sql`、`scripts/dev/*.sql`、`Dockerfile`、`docker-compose.yml`、`deploy/`、`application*.yml`、`scripts/deploy/*`
> 审计方式：静态读脚本 + 只读查询现网库（`information_schema`、`COUNT(*)`、孤儿 `LEFT JOIN`），**未执行任何 DDL、未改源码、未重启服务**
> 现网快照：MySQL 8.0.24 / 库 `surveyking`；`t_template` 11096 行、`t_project` 19 行、`t_role` 4 行

## 结论摘要

**全新部署目前跑不起来**，三个 P0 全部出在 `init-mysql.sql` 与代码/现网的漂移上：

1. 缺 `t_repo_partner.dept_id` 列 → 题库授权、组可见范围查询直接 SQL 报错
2. 缺 `t_dept.valid_from / valid_to` 列 → `Dept` 实体按列名查询，登录与用户组页面报错
3. 角色只 seed 了 admin 一个，且 `t_sys_info.register_info` 是 NULL → 没有老师/学员角色、自注册被拒

现网（长期迭代过的库）这三个问题都被 `scripts/dev/*.sql` 手工补过，所以一直没暴露——一旦「空库 + init 脚本」就是现成的故障。

---

## P0 · 阻断全新部署

### P0-1 `init-mysql.sql` 缺 `t_repo_partner.dept_id`

- 位置：`server/rdbms/src/main/resources/scripts/init-mysql.sql:312-321`（建表只到 `update_by`，`PRIMARY KEY(id)` 收尾）
- 现网事实：`information_schema` 里 `t_repo_partner` 有 6 列 + `dept_id`，且带索引 `idx_repo_partner_dept`
- 代码引用（会以列名出现在 SQL 里）：
  - `server/rdbms/src/main/java/cn/surveyking/server/impl/RepoServiceImpl.java:1025` — `RepoPartner::getDeptId`
  - `server/rdbms/src/main/java/cn/surveyking/server/impl/RepoPartnerServiceImpl.java:78,130`
- 影响：全新部署后，凡是走「题库授权给班级 / 按组看题库」的查询都会 `Unknown column 'dept_id'` → 接口 500；学员看不到被授权的题库。
- 建议：把 `dept_id varchar(64) DEFAULT NULL COMMENT '部门/组 id'` 与 `KEY idx_repo_partner_dept (dept_id)` 合并进 init 建表语句（`scripts/dev/repo-partner-dept.sql` 里的语句可作为参照）。

### P0-2 `init-mysql.sql` 缺 `t_dept.valid_from / valid_to`

- 位置：`init-mysql.sql:142-158`（`t_dept` 建表）
- 现网事实：两列存在（`add-dept-validity.sql` 加的）
- 代码引用：`server/rdbms/src/main/java/cn/surveyking/server/domain/model/Dept.java:43,48`；读取逻辑 `UserServiceImpl.java:160,164`
- 影响：MyBatis-Plus 按实体列生成 `SELECT ... valid_from, valid_to` → 全新部署下 **任何查 dept 的地方都会报错**，包括登录时的组有效期校验、用户组页面、注册取根组。属于「一登录就炸」级别。
- 建议：两列合并进 init（`datetime NULL DEFAULT NULL`），不要依赖手工脚本。

### P0-3 初始化数据不全：只有 admin 角色 + 注册被关

- 位置：`init-mysql.sql:371`（`INSERT INTO t_role` 只有一条：`1457995481928998914 / 超级管理员 / admin`）
- 位置：`init-mysql.sql:401`（`t_sys_info` seed 里 `register_info` 为 **NULL**，`name` 仍是旧品牌「卷王问卷考试系统」）
- 代码事实：
  - 注册入口 `UserServiceImpl#register` 开头判 `registerInfo == null || !registerEnabled` → 直接抛 `RegisterError`
  - 建号时角色来自 `registerInfo.getRoles()`（`UserServiceImpl` register 段），空列表等于新用户没有任何权限
- 影响：全新部署后**没有老师/学员角色可选**，用户管理里角色下拉为空；自注册必定失败；系统名还是旧品牌。
- 建议：init 里补齐 `teacher`、`student` 两条角色（直接用现网 authority 串，注意 student 要含 `repo:book`），并把 `t_sys_info.register_info` 写成 `{"registerEnabled":false,"roles":["student"]}` 这类可解析值；系统名改成正式名。角色串见本文附录 A。

---

## P1 · 上线前必须处理

### P1-1 `pro` 配置没有数据源，`-Ppro` 打出来的包连不上库

- 位置：`server/rdbms/src/main/resources/config/application-pro.yml:5-10`（只有 `driver-class-name`，`url / username / password` 全被注释掉）
- 位置：`server/api/src/main/resources/application-pro.yml:2`（端口 1991，与容器 7007 不一致，靠 `--server.port=7007` 覆盖）
- 位置：`Dockerfile:21` — `gradle :api:bootJar -x test`，**没有 `-Ppro`**，`server/build.gradle:10` 的默认值是 `dev`
- 影响：现在 Docker 镜像其实跑的是 **dev 配置**（能连上是因为 dev 里有 `${DB_HOST:...}` 占位），语义错位；哪天有人按「生产」用 `-Ppro` 打包，会得到连不上数据库的镜像。
- 建议：pro 配置补齐 `${DB_HOST}/${DB_PORT}/${DB_NAME}/${DB_USER}/${DB_PASSWORD}` 占位，Dockerfile 显式传 `-Ppro`（或反过来，明确只维护 dev 一套并删掉 pro，避免两套漂移）。

### P1-2 核心表缺索引，题目列表全表扫

| 表 | 缺的索引 | 证据 |
|---|---|---|
| `t_template` | `repo_id`（11096 行，所有题目查询都按它过滤） | `RepoServiceImpl.java:88,123,135` |
| `t_project_partner` | `project_id`、`user_id`、`group_id`（每次权限判断都扫） | 现网只有 `PRIMARY` |
| `t_repo_partner` | `repo_id`、`user_id`（连 `dept_id` 列都缺，见 P0-1） | `init-mysql.sql:312-321` |
| `t_project` | `create_by`、`is_deleted` | 现网只有 `PRIMARY` |
| `t_user` | `dept_id`（按组查人） | `init-mysql.sql:459` |
| `t_dept` | `parent_id`（递归祖先链 `WITH RECURSIVE` 的入口） | `init-mysql.sql:142` |

- 影响：现在数据量小看不出来；题目过万后，每次打开题库/组卷都会扫全表，且 `WITH RECURSIVE` 的祖先查询没有索引起点会放大成多次全表扫。
- 建议：至少补 `idx_template_repo (repo_id, is_deleted)`、`idx_pp_project (project_id)`、`idx_pp_user (user_id)`、`idx_pp_group (group_id)`、`idx_repo_partner_repo (repo_id)`、`idx_project_create_by (create_by)`、`idx_user_dept (dept_id)`、`idx_dept_parent (parent_id)`。

### P1-3 JWT 密钥每次启动随机，重启即全员掉线

- 位置：`server/shared/src/main/java/cn/surveyking/server/core/security/JwtTokenUtil.java:33`（`private final String jwtSecret = generateSecurityKey();`）、`:91`（随机 HS512）
- 影响：后端一重启/一扩容，所有已登录用户 token 全部失效（本次联调里已多次发生，表现为页面突然 401 跳登录）；多实例部署时实例之间无法互认 token。
- 建议：支持 `sk.security.jwt.secret`（环境变量注入，Base64 32+ 字节），缺省时才回退随机生成并打 WARN。

### P1-4 备份脚本与 Docker 部署形态不匹配

- 位置：`scripts/deploy/backup.sh:24`（默认 `INSTALL_DIR=/opt/xuri-classroom`）、`:78`（读 `$INSTALL_DIR/app.env`）、`:82`（调用宿主机 `mysqldump`）、`:127`（打包 `$INSTALL_DIR/files`）
- 位置：`docker-compose.yml:15,45` — 用的是命名卷 `db-data` / `app-files`，`:41` app 只 `expose`，`:11` MySQL 未发布 3306
- 影响：按我们自己的 compose 部署后，宿主机上没有 `app.env`，`mysqldump` 也连不到容器内的 MySQL（没暴露端口）→ **备份脚本无法直接使用**，等于 Docker 路线没有可执行的备份方案。
- 建议：补一份容器版备份（`docker compose exec -T db mysqldump ... ` + `docker run --rm -v app-files:... tar`），或让 `backup.sh` 自动检测 docker 并走 exec 分支；`scripts/deploy/README.md` 里同时写清两种形态的操作步骤。

### P1-5 角色种子脚本与现网漂移，重跑会让学员丢错题本

- 位置：`scripts/dev/create-student-role.sql:3` — student 权限串 `exercise:list,repo:list,repo:detail,user:update`（**缺 `repo:book`**）
- 位置：`scripts/dev/create-teacher-role.sql:8` — 同一条 UPDATE 又写了一遍同样缺 `repo:book` 的串
- 现网事实：`t_role.student.authority = exercise:list,repo:list,repo:detail,user:update,repo:book`
- 影响：任何人重跑这两个脚本，学员立刻失去错题本/练习入口（403），而且很难联想到是脚本干的。
- 建议：脚本与 init 统一从一处取（或直接删掉这两个 dev 脚本，改为「角色由 init 统一 seed」）。

---

## P2 · 建议改进

### P2-1 容器以 root 运行、无 JVM 内存约束

- 位置：`Dockerfile:24-34`（app stage 无 `USER`）、`Dockerfile:37-41`（nginx 官方镜像 master 默认 root）
- 影响：容器逃逸面更大；`-Xmx` 未设置，容器内存限制下可能 OOMKill。
- 建议：app 建非 root 用户并 `USER`；加 `JAVA_OPTS`（如 `-XX:MaxRAMPercentage=75`）。

### P2-2 构建上下文过大

- 位置：`.dockerignore` — 未排除 `frontend-recon/`（148 MB）、`docs/`、`website/`、`client/node_modules`（已排除）、`docs/audit`
- 影响：每次 `docker compose build` 都要打包上百 MB 上下文，构建明显变慢。
- 建议：`.dockerignore` 增加 `frontend-recon/`、`website/`、`docs/`、`backups/`、`.git/`。

### P2-3 唯一约束缺失，已经生出脏数据

- 位置：`init-mysql.sql:8-25`（`t_account` 只有 `PRIMARY` 与 `oauth_identity_key` 唯一，`auth_account` 无唯一约束）
- 位置：`init-mysql.sql:352-364`（`t_role.code` 无唯一约束）
- 现网事实：`t_role` 里躺着一条 `id=2118670911906299906 / name='1' / code='a123' / authority=NULL` 的脏角色；同一手机号可以注册出多条 `t_account`
- 建议：`t_role` 加 `UNIQUE KEY uk_role_code(code)`；账号唯一性按 `(auth_type, auth_account, is_deleted)` 加强校验（应用层已有判断的话补 DB 兜底要考虑逻辑删除）。

### P2-4 初始化系统信息是旧品牌且为空

- 位置：`init-mysql.sql:401` — `name='卷王问卷考试系统'`，`setting/ai_setting/oauth_setting/register_info` 全 NULL
- 影响：全新部署首屏是旧名字；`system.setting` 为 NULL 时水印/防复制/协作者权限等新配置项都是 null（前端有兜底，但后台设置页要保存一次才会写库）。
- 建议：seed 改成正式名称与合理默认值（至少 `setting` 写 `{"copyProtected":true,"watermarkEnabled":true,"watermarkMode":"name_phone","collaboratorAuthority":"project:create"}`）。

### P2-5 dev 配置里的 YAML 键是错的

- 位置：`server/rdbms/src/main/resources/config/application-dev.yml:3-4`
  ```yaml
  spring:
    h2:
      enabled:
        true console:
  ```
- 影响：在 MySQL 模式下无实际作用（所以一直没人发现），但它表达不了任何意图，属于埋雷。
- 建议：删掉，或改成 `spring.h2.console.enabled: false`。

### P2-6 H2 模式缺两张表（**仅影响 H2 模式**）

- 事实：`init-mysql.sql` 24 张表，`init-h2.sql` 22 张，缺 `t_audit_log`（`init-mysql.sql:594`）与 `t_dept_role`（`init-mysql.sql:614`）；列级无差异
- 影响：H2 模式下调用操作审计、组绑定角色相关接口会报表不存在。MySQL 部署不受影响。
- 建议：要么把两表补进 `init-h2.sql`，要么明确「H2 仅用于本地演示」并让相关功能在 H2 下降级。

### P2-7 孤儿数据：没有外键也没有清理任务

只读 `LEFT JOIN` 结果：

| 关系 | 孤儿数 | 样例 |
|---|---|---|
| 题目 → 题库 | **10** | `t_template.id=2118274182123958273 → repo_id=2118274181926825986`（已不存在） |
| 答卷 → 项目 | 1 | `t_answer.id=26307a01-… → project_id=OorD1j` |
| 项目协作者 → 项目 | 1 | `t_project_partner.id=2118275364221431809 → project_id=ribd4w` |
| 用户 → 部门 / 用户角色 / 组角色 | 0 | — |

- 影响：这些行不会报错，但会污染统计（比如按题库计数、协作者列表），也会让「删题库」这类操作看起来成功、实际留下垃圾。
- 建议：补一个定期清理任务（或删除时用事务级联），并在上线前手动清一次；顺带把 `t_role` 里的脏角色删掉。

### P2-8 时区依赖服务端

- 位置：`server/rdbms/src/main/resources/config/application-dev.yml:12`（JDBC URL 未带 `serverTimezone`）
- 现状：compose 里 `TZ: Asia/Shanghai`（`docker-compose.yml:12`）兜住了；裸装的 MySQL 若是 UTC，`create_at` 会整体偏移 8 小时。
- 建议：URL 里显式 `serverTimezone=Asia/Shanghai`，不依赖宿主机。

### P2-9 `spring.sql.init.continue-on-error: true`

- 位置：`server/rdbms/src/main/resources/config/application-pro.yml:11-13`
- 影响：将来若启用 `sql.init` 建表，建表失败会被静默吞掉，表现为「启动成功但功能全崩」。
- 建议：改成 `false`，或干脆移除该配置（当前没有 schema.sql/data.sql 依赖）。

---

## 附录 A · 权限与角色现状（初始化数据核对）

- 代码里实际使用的权限点：**59 个**（`@PreAuthorize("hasAuthority('...')")` 全量提取，剔除注释中的误报 1 个）
- `admin` 角色现网持有 **83 项**，**完整覆盖**全部 59 个代码权限点（含后来新增的 `repo:book`、`exercise:list`、`home`、`system:user:updatePosition`、`system:dept:*`）→ 这条没问题
- `init-mysql.sql:371` 的 admin 权限串与现网 **完全一致**（83 项），不会因为重新部署而 403
- `teacher` 现网 433 字符；`student` 现网 `exercise:list,repo:list,repo:detail,user:update,repo:book`
- ⚠️ 但 init 里只有 admin 一条角色记录（见 P0-3）

## 附录 B · 好的方面（避免只报坏消息）

- `Dockerfile` 四阶段拆分合理：前端 → jar → JRE 运行时 → nginx，前后端分离干净
- `docker-compose.yml:59` 宿主机默认 **9527** ✅；`:41` 后端只 `expose` 不发布 ✅；`:11` MySQL 不发布端口 ✅
- `deploy/nginx.conf` 的 `/api/`、`/captcha/`、`/files/` 反代与 SPA 回落都正确，`client_max_body_size 64m` ✅
- 时区三处一致：容器 `TZ`、`/etc/localtime`、Jackson `time-zone: GMT+8` ✅
- 健康检查：app 打 `/api/system`、web 打 `/` ✅
- 逻辑删除配置正确：`BaseModel` 的 `@TableLogic` + `select=false`，`is_deleted` 会被自动过滤 ✅
- 备份脚本本身逻辑完整（mysqldump + files + 脱敏 `app.env` + 保留 N 份），只是与 Docker 形态不匹配（见 P1-4）

## 附录 C · 复现命令（全部只读）

```sql
-- 1. 表/列漂移：init 脚本 vs 现网
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema='surveyking' ORDER BY table_name, ordinal_position;

-- 2. 索引现状
SELECT table_name, index_name, GROUP_CONCAT(column_name ORDER BY seq_in_index)
FROM information_schema.statistics WHERE table_schema='surveyking'
GROUP BY table_name, index_name ORDER BY table_name, index_name;

-- 3. 孤儿数据
SELECT COUNT(*) FROM t_template t LEFT JOIN t_repo r ON r.id=t.repo_id WHERE r.id IS NULL;
SELECT COUNT(*) FROM t_answer a LEFT JOIN t_project p ON p.id=a.project_id
  WHERE p.id IS NULL AND a.project_id <> 'exercise';
SELECT COUNT(*) FROM t_project_partner pp LEFT JOIN t_project p ON p.id=pp.project_id WHERE p.id IS NULL;

-- 4. 脏角色
SELECT id, name, code, CHAR_LENGTH(authority) FROM t_role;
```

**验证「全新部署能否直接跑起来」的最短路径**（建议在临时库做，不要在现网库上跑）：
建一个空库 → 执行 `init-mysql.sql` → 后端连它启动 → 打开「用户组」「题库授权」「用户管理-角色」三页。
按当前脚本，预计会在 dept 查询（P0-2）和题库授权（P0-1）处报错，且角色列表只有「超级管理员」。
