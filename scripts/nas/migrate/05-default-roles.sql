-- =============================================================================
-- 恢复/补齐默认角色（幂等，可重复执行）
--
-- 背景：2026-11-07 从上游 H2 迁移到 MySQL 时，t_role 整表被上游数据覆盖，
--       分支自带的「老师 / 学员」两个默认角色没有合并进来 → 只有超级管理员可用。
--       这个脚本把两个默认角色补回来，并补齐「学员能看题库、能练习」所需的权限点。
--
-- 权限语义（和 PermissionEnum 一致，别凭名字猜）：
--   repo:list    看题库列表        repo:detail  打开题库、看题目
--   repo:update  改题库            repo:create/delete/export/import  同名
--   repo:book    练习册/错题本（做题入口）
--   exercise:list 我的练习页
--
-- 用法：
--   docker exec -i xuri-live-db mysql -uroot -p"$DB_PASSWORD" surveyking < 05-default-roles.sql
-- =============================================================================
SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- 1. 老师：配考试、管题库、看答卷与报表，但进不了系统管理
-- ---------------------------------------------------------------------------
INSERT INTO t_role (id, name, code, remark, authority, status, is_deleted, create_at)
VALUES (
  'teacher', '老师', 'teacher', '配置考试与题库、查看答卷数据',
  'project,project:list,project:detail,project:create,project:update,project:delete,project:report,project:publish,project:partner,answer,answer:list,answer:detail,answer:create,answer:update,answer:delete,answer:export,answer:upload,answer:restore,repo,repo:list,repo:detail,repo:create,repo:update,repo:delete,repo:export,repo:import,repo:grant,repo:book,template,template:list,template:create,template:update,template:delete,exercise,exercise:list,file,file:detail,file:list,file:import,file:delete,user:update',
  1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name), code = VALUES(code), remark = VALUES(remark),
  authority = VALUES(authority), status = 1, is_deleted = 0, update_at = NOW();

-- ---------------------------------------------------------------------------
-- 2. 学员：只做题 + 刷题库，没有任何管理权限
--    关键：必须有 repo:book（练习入口）和 repo:detail（打开题库看题目）。
--    少了 repo:detail，题库列表里点不进题目；少了 repo:book，练习接口会 403。
-- ---------------------------------------------------------------------------
UPDATE t_role
SET authority = 'home,exercise:list,repo:list,repo:detail,repo:book,project:list,project:detail,user:update,answer:list,answer:detail,answer:upload',
    remark = '只能做题、刷题库，无任何管理权限',
    status = 1, is_deleted = 0, update_at = NOW()
WHERE code IN ('xueyuan', 'student') AND is_deleted = 0;

-- 如果连学员角色都没有（极端情况），补一条
INSERT INTO t_role (id, name, code, remark, authority, status, is_deleted, create_at)
SELECT 'student', '学员', 'student', '只能做题、刷题库，无任何管理权限',
       'home,exercise:list,repo:list,repo:detail,repo:book,project:list,project:detail,user:update,answer:list,answer:detail,answer:upload',
       1, 0, NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM (SELECT id FROM t_role WHERE code IN ('xueyuan','student') AND is_deleted = 0) x);

-- ---------------------------------------------------------------------------
-- 3. 自检：把三个角色的权限点数量打出来（老师应为 40+，学员应为 10）
-- ---------------------------------------------------------------------------
SELECT id, name, code, CHAR_LENGTH(authority) AS len,
       (CHAR_LENGTH(authority) - CHAR_LENGTH(REPLACE(authority, ',', '')) + 1) AS perm_count
FROM t_role
WHERE is_deleted = 0
ORDER BY perm_count DESC;
