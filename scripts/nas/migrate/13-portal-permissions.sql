-- 权限 v5：门户（视角）权限（2026-11-07）
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
