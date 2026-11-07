-- =============================================================================
-- 权限 v5：门户（视角）权限（2026-11-07）
--
-- 三个视角由权限点决定，而不是按角色写死：
--   portal:student  学员视角 → 「我的任务」（考试安排 / 练习记录 / 我的成绩）
--   portal:teacher  教师视角 → 「教学管理」「班级学情」
--   portal:admin    管理视角 → 系统管理（用户 / 用户组 / 设置 / 权限 / 日志）
--
-- 管理员登录会自动注入全部目录权限，无需在此授予。
-- =============================================================================
SET NAMES utf8mb4;

UPDATE t_role
SET authority = CONCAT(authority, ',portal:teacher'), update_at = NOW()
WHERE code = 'teacher' AND is_deleted = 0 AND authority NOT LIKE '%portal:teacher%';

UPDATE t_role
SET authority = CONCAT(authority, ',portal:student'), update_at = NOW()
WHERE code IN ('xueyuan', 'student') AND is_deleted = 0 AND authority NOT LIKE '%portal:student%';

SELECT name, code,
       (CHAR_LENGTH(authority) - CHAR_LENGTH(REPLACE(authority, ',', '')) + 1) AS perm_count,
       (authority LIKE '%portal:teacher%') AS teacher_view,
       (authority LIKE '%portal:student%') AS student_view
FROM t_role WHERE is_deleted = 0 ORDER BY perm_count DESC;
