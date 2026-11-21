-- 学员只做题，不做题库浏览（2026-11-14，幂等）
SET NAMES utf8mb4;

UPDATE t_role
SET authority = CONCAT(authority, ',repo:practice'),
    update_at = NOW()
WHERE code IN ('student', 'xueyuan') AND is_deleted = 0
  AND authority NOT LIKE '%repo:practice%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',repo:detail,', ',')),
    update_at = NOW()
WHERE code IN ('student', 'xueyuan') AND is_deleted = 0;

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',repo:questions:read,', ',')),
    update_at = NOW()
WHERE code IN ('student', 'xueyuan') AND is_deleted = 0;

SELECT code, name,
       (authority LIKE '%repo:practice%') AS can_practice,
       (authority LIKE '%repo:detail%') AS can_browse_repo,
       (authority LIKE '%repo:questions:read%') AS can_read_questions
FROM t_role WHERE is_deleted = 0 ORDER BY code;
