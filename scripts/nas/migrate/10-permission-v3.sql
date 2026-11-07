-- =============================================================================
-- 权限 v3：文件细分 + 建用户拆分（幂等）
--
-- 新增权限点（PermissionEnum 已加）：
--   answer:attach   答题附件上传（与后台 answer:upload 分开）
--   file:upload     通用文件上传（Logo 等，与 file:import 分开）
--   template:import 批量导入题目（与 repo:import 分开）
--   system:user:create:student  新建学员
--   system:user:create:teacher  新建老师/职工
--
-- 授予策略：
--   老师：能建学员、能传答题附件、能导入题目、能传 Logo；不能建老师
--   学员：只能传答题附件
--   管理员：登录自动拥有全部目录权限，无需在此处理
-- =============================================================================
SET NAMES utf8mb4;

-- 老师
UPDATE t_role
SET authority = CONCAT(authority, ',answer:attach,file:upload,template:import,system:user:create:student'),
    update_at = NOW()
WHERE code = 'teacher' AND is_deleted = 0
  AND authority NOT LIKE '%system:user:create:student%';

-- 学员：只加答题附件
UPDATE t_role
SET authority = CONCAT(authority, ',answer:attach'),
    update_at = NOW()
WHERE code IN ('xueyuan', 'student') AND is_deleted = 0
  AND authority NOT LIKE '%answer:attach%';

SELECT name, code,
       (CHAR_LENGTH(authority) - CHAR_LENGTH(REPLACE(authority, ',', '')) + 1) AS perm_count,
       (authority LIKE '%answer:attach%')            AS has_attach,
       (authority LIKE '%system:user:create:student%') AS can_create_student
FROM t_role WHERE is_deleted = 0 ORDER BY perm_count DESC;
