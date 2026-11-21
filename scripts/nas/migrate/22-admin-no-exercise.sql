-- 权限 v11：练习记录归学员（2026-11-08，幂等）
SET NAMES utf8mb4;

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',exercise:list,', ',')),
    update_at = NOW()
WHERE code IN ('admin', 'teacher') AND is_deleted = 0;

SELECT code, name, (authority LIKE '%exercise:list%') AS has_exercise
FROM t_role WHERE is_deleted = 0 ORDER BY code;
