-- 从角色权限串里摘掉 7 个「未实现」的权限（幂等，可重复执行）
SET NAMES utf8mb4;

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM
      REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        CONCAT(',', authority, ','),
        ',answer:audit,', ','),
        ',template:export,', ','),
        ',exercise:manage,', ','),
        ',user:export,', ','),
        ',system:log:export,', ','),
        ',system:backup,', ','),
        ',system:restore,', ',')
    ),
    update_at = NOW()
WHERE is_deleted = 0
  AND (   authority LIKE '%answer:audit%'
       OR authority LIKE '%template:export%'
       OR authority LIKE '%exercise:manage%'
       OR authority LIKE '%user:export%'
       OR authority LIKE '%system:log:export%'
       OR authority LIKE '%system:backup%'
       OR authority LIKE '%system:restore%');


SELECT name, code,
       (CHAR_LENGTH(authority) - CHAR_LENGTH(REPLACE(authority, ',', '')) + 1) AS perm_count
FROM t_role WHERE is_deleted = 0 ORDER BY perm_count DESC;
