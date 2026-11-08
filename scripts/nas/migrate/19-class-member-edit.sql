-- ======
-- 权限 v8：班级学员编辑/删除（2026-11-08，幂等）
--
-- 配合 18-user-type.sql：学员只在班级管理里维护，因此班主任需要
--   class:member:update  改姓名/联系方式/状态、重置密码
--   class:member:delete  删除学员账号
-- 老师仍然不进入「用户管理」，也不持有 system:user:* 权限。
-- ======
SET NAMES utf8mb4;

UPDATE t_role
SET authority = CONCAT(authority, ',class:member:update,class:member:delete'),
    update_at = NOW()
WHERE code = 'teacher' AND is_deleted = 0
  AND authority NOT LIKE '%class:member:update%';

UPDATE t_role
SET authority = CONCAT(authority, ',class:member:update,class:member:delete'),
    update_at = NOW()
WHERE code = 'admin' AND is_deleted = 0
  AND authority NOT LIKE '%class:member:update%';

SELECT code, name,
       (CHAR_LENGTH(authority) - CHAR_LENGTH(REPLACE(authority, ',', '')) + 1) AS perm_count,
       (authority LIKE '%class:member:update%') AS can_update_member,
       (authority LIKE '%class:member:delete%') AS can_delete_member,
       (authority LIKE '%system:user:%')         AS has_system_user
FROM t_role WHERE is_deleted = 0 AND code IN ('teacher', 'admin') ORDER BY code;
