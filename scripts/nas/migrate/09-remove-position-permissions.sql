-- =============================================================================
-- 删除「职务」相关权限（2026-11-07）
--
-- 产品决策：权限只靠「用户组 + 角色 + 权限」控制，职务不是规划内概念。
-- 已从 PermissionEnum 删除 5 个点：
--   system:position:list / create / update / delete、system:user:updatePosition
-- 对应后端接口保持可用但改为 hasRole('admin')，不再作为可配置权限。
--
-- 本脚本把角色串里的这 5 个残留摘掉（幂等）。
-- =============================================================================
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
