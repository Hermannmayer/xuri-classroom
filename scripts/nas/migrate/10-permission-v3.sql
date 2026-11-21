-- 权限 v3：文件细分 + 建用户拆分（幂等）
SET NAMES utf8mb4;


UPDATE t_role
SET authority = CONCAT(authority, ',file:upload,template:import,system:user:create:student'),
    update_at = NOW()
WHERE code = 'teacher' AND is_deleted = 0
  AND authority NOT LIKE '%system:user:create:student%';


UPDATE t_role
SET authority = CONCAT(authority, ''),
    update_at = NOW()
WHERE code IN ('xueyuan', 'student') AND is_deleted = 0
  AND authority NOT LIKE '%answer:attach%';

SELECT name, code,
       (CHAR_LENGTH(authority) - CHAR_LENGTH(REPLACE(authority, ',', '')) + 1) AS perm_count,
       (authority LIKE '%answer:attach%')            AS has_attach,
       (authority LIKE '%system:user:create:student%') AS can_create_student
FROM t_role WHERE is_deleted = 0 ORDER BY perm_count DESC;
