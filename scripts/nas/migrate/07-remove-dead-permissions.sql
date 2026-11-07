-- =============================================================================
-- 从角色权限串里摘掉 7 个「未实现」的权限（幂等，可重复执行）
--
-- 这 7 个前后端都没实现，已从 PermissionEnum 目录删除：
--   answer:audit, template:export, exercise:manage, user:export,
--   system:log:export, system:backup, system:restore
--
-- 做法：把 authority 首尾补逗号 → 逐个把 ",code," 替换成 "," → 去掉首尾逗号。
-- 这样不会误伤子串（例如不会把 answer:auditX 当成 answer:audit）。
--
-- 用法：
--   docker exec -i xuri-live-db mysql -uroot -p"$DB_PASSWORD" surveyking < 07-remove-dead-permissions.sql
-- =============================================================================
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

-- 自检：应只剩 66 个目录内权限 + 若干历史前缀串
SELECT name, code,
       (CHAR_LENGTH(authority) - CHAR_LENGTH(REPLACE(authority, ',', '')) + 1) AS perm_count
FROM t_role WHERE is_deleted = 0 ORDER BY perm_count DESC;
