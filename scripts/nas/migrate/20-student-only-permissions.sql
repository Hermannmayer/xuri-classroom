-- ======
-- 权限 v9：把「开始答题 / 开始练习 / 学员视角」固化成学员专属权限（2026-11-08，幂等）
--
-- 背景：这些入口以前只按页面/项目状态渲染，管理员又因为「自动注入全部权限目录」
-- 天然拥有 repo:practice / portal:student，导致管理员界面反复出现「开始答题/开始练习」。
--
-- 本脚本：
--   1. 新增 project:answer（开始答题），只给学员；
--   2. 把 repo:practice / repo:book / portal:student / project:answer 标记为学员专属后，
--      代码层管理员不再自动注入它们；
--   3. 清掉库里管理员/老师误存的学员专属串，保证导出审计一致。
-- ======
SET NAMES utf8mb4;

-- 学员：开始答题
UPDATE t_role
SET authority = CONCAT(authority, ',project:answer'),
    update_at = NOW()
WHERE code IN ('student', 'xueyuan') AND is_deleted = 0
  AND authority NOT LIKE '%project:answer%';

-- 管理员：移除学员专属（repo:book 是历史种子带进来的；repo:practice 是 17 脚本补的）
UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(REPLACE(REPLACE(REPLACE(
      CONCAT(',', authority, ','),
      ',repo:book,', ','),
      ',repo:practice,', ','),
      ',portal:student,', ','),
      ',project:answer,', ',')),
    update_at = NOW()
WHERE code = 'admin' AND is_deleted = 0;

-- 老师：同样清掉（正常不会有，幂等兜底）
UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(REPLACE(REPLACE(REPLACE(
      CONCAT(',', authority, ','),
      ',repo:book,', ','),
      ',repo:practice,', ','),
      ',portal:student,', ','),
      ',project:answer,', ',')),
    update_at = NOW()
WHERE code = 'teacher' AND is_deleted = 0;

SELECT code, name,
       (authority LIKE '%project:answer%') AS can_answer,
       (authority LIKE '%repo:practice%')  AS can_practice,
       (authority LIKE '%repo:book%')      AS has_book,
       (authority LIKE '%portal:student%') AS student_view
FROM t_role WHERE is_deleted = 0 ORDER BY code;
