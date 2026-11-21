-- 删除「职务」相关权限（2026-11-07）
SET NAMES utf8mb4;

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM
      REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        CONCAT(',', authority, ','),
        ',system:position:list,', ','),
        ',system:position:create,', ','),
        ',system:position:update,', ','),
        ',system:position:delete,', ','),
        ',system:user:updatePosition,', ',')
    ),
    update_at = NOW()
WHERE is_deleted = 0
  AND (   authority LIKE '%system:position:%'
       OR authority LIKE '%system:user:updatePosition%');

SELECT name, code,
       (CHAR_LENGTH(authority) - CHAR_LENGTH(REPLACE(authority, ',', '')) + 1) AS perm_count
FROM t_role WHERE is_deleted = 0 ORDER BY perm_count DESC;
