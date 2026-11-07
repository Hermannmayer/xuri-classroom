-- =============================================================================
-- 权限接线补丁（幂等，可重复执行）
--
-- 背景：2026-11-07 给 5 个「目录里有、后端没用」的权限接上了真实注解：
--   project:partner → /api/project/partner/*（原 project:update）
--   repo:grant      → /api/repo/partner/*   （原 repo:update）
--   answer:restore  → /api/answer/restore   （原 answer:update）
--   user:import     → /api/importUser       （原 system:user:create）
--   system:setting:update → /api/system/update（原仅 hasRole('admin')）
--
-- 这些注解都写成「目标权限 or hasRole('admin')」，所以管理员不受影响；
-- 但**老师**这类非管理员角色需要真的持有这些串，否则原来能用的功能会 403。
-- 本脚本把缺的串追加进去（只追加，不重写整串——t_role.authority 里还有
-- answer/system:role/position 等历史前缀串，重写会丢）。
--
-- 用法：
--   docker exec -i xuri-live-db mysql -uroot -p"$DB_PASSWORD" surveyking < 06-permission-wiring.sql
-- =============================================================================
SET NAMES utf8mb4;

-- 老师：补 project:partner / repo:grant / answer:restore（开关类 publish 仍单独处理）
UPDATE t_role
SET authority = CONCAT(authority, ',project:partner,repo:grant,answer:restore'),
    update_at = NOW()
WHERE code = 'teacher' AND is_deleted = 0
  AND (authority NOT LIKE '%project:partner%' OR authority NOT LIKE '%repo:grant%' OR authority NOT LIKE '%answer:restore%');

-- 管理员：把本次接线的 5 个串补全（虽然注解里有 hasRole('admin') 兜底，
-- 但前端矩阵/导出仍按 authority 展示，保持一致）
UPDATE t_role
SET authority = CONCAT(authority, ',project:partner,repo:grant,answer:restore,user:import,system:setting:update'),
    update_at = NOW()
WHERE code = 'admin' AND is_deleted = 0
  AND authority NOT LIKE '%project:partner%';

-- 自检
SELECT name, code,
       (CHAR_LENGTH(authority) - CHAR_LENGTH(REPLACE(authority, ',', '')) + 1) AS perm_count,
       (authority LIKE '%project:partner%') AS has_partner,
       (authority LIKE '%repo:grant%')      AS has_grant,
       (authority LIKE '%answer:restore%')  AS has_restore
FROM t_role WHERE is_deleted = 0 ORDER BY perm_count DESC;
