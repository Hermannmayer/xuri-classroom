-- 权限 v3.1（幂等）：移除 answer:attach
SET NAMES utf8mb4;

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',answer:attach,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority LIKE '%answer:attach%';

SELECT name, code,
       (CHAR_LENGTH(authority) - CHAR_LENGTH(REPLACE(authority, ',', '')) + 1) AS perm_count
FROM t_role WHERE is_deleted = 0 ORDER BY perm_count DESC;
