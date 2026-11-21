-- 权限接线补丁（幂等，可重复执行）

-- 本脚本把缺的串追加进去（只追加，不重写整串——t_role.authority 里还有 answer/system:role/position 等历史前缀串，重写会丢）。
SET NAMES utf8mb4;


UPDATE t_role
SET authority = CONCAT(authority, ',project:partner,repo:grant,answer:restore'),
    update_at = NOW()
WHERE code = 'teacher' AND is_deleted = 0
  AND (authority NOT LIKE '%project:partner%' OR authority NOT LIKE '%repo:grant%' OR authority NOT LIKE '%answer:restore%');



UPDATE t_role
SET authority = CONCAT(authority, ',project:partner,repo:grant,answer:restore,user:import,system:setting:update'),
    update_at = NOW()
WHERE code = 'admin' AND is_deleted = 0
  AND authority NOT LIKE '%project:partner%';


SELECT name, code,
       (CHAR_LENGTH(authority) - CHAR_LENGTH(REPLACE(authority, ',', '')) + 1) AS perm_count,
       (authority LIKE '%project:partner%') AS has_partner,
       (authority LIKE '%repo:grant%')      AS has_grant,
       (authority LIKE '%answer:restore%')  AS has_restore
FROM t_role WHERE is_deleted = 0 ORDER BY perm_count DESC;
