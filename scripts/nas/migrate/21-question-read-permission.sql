-- 权限 v10：题目只读从错题本拆分（2026-11-08，幂等）
SET NAMES utf8mb4;

UPDATE t_role
SET authority = CONCAT(authority, ',repo:questions:read'),
    update_at = NOW()
WHERE code IN ('student', 'xueyuan') AND is_deleted = 0
  AND authority NOT LIKE '%repo:questions:read%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',user:import,', ',')),
    update_at = NOW()
WHERE code = 'teacher' AND is_deleted = 0;

SELECT code, name,
       (authority LIKE '%repo:questions:read%') AS can_read_questions,
       (authority LIKE '%repo:book%')           AS has_book,
       (authority LIKE '%user:import%')         AS can_import_users
FROM t_role WHERE is_deleted = 0 ORDER BY code;
