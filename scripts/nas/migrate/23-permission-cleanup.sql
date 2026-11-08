-- ======
-- 权限 v12：老师保留考试删除权、答卷删除归管理员、导入权限合并、历史前缀清理（2026-11-09，幂等）
--
-- 1. 老师保留 project:delete（只能删自己创建/协作的考试）；收回 answer:delete / answer:restore，
--    删答卷、恢复答卷、清空答卷回收站归管理员。题库仍然只读（repo:create/update/delete 不授予）。
-- 2. repo:import 合并到 template:import：先补 template:import，再删 repo:import。
-- 3. 清理 t_role.authority 中不参与鉴权的历史前缀（project / answer / repo / ...），
--    这些串从来不是权限点，只会让权限矩阵导出看起来像有权限。
-- ======
SET NAMES utf8mb4;

-- 1) 老师：保留删除自己创建的考试；收回删除/恢复答卷
UPDATE t_role
SET authority = CONCAT(authority, ',project:delete'),
    update_at = NOW()
WHERE code = 'teacher' AND is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') NOT LIKE '%,project:delete,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',answer:delete,', ',')),
    update_at = NOW()
WHERE code = 'teacher' AND is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,answer:delete,%';
UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',answer:restore,', ',')),
    update_at = NOW()
WHERE code = 'teacher' AND is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,answer:restore,%';

-- 2) 导入权限合并 + 内置角色补串
-- 2a) 历史自定义角色如果还有 repo:import，先补等价的 template:import
UPDATE t_role
SET authority = CONCAT(authority, ',template:import'),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,repo:import,%'
  AND CONCAT(',', authority, ',') NOT LIKE '%,template:import,%';

-- 2b) 线上 admin/teacher 本来就没有 repo:import，显式补导入权限
UPDATE t_role
SET authority = CONCAT(authority, ',template:import'),
    update_at = NOW()
WHERE code IN ('admin', 'teacher') AND is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') NOT LIKE '%,template:import,%';

-- 2c) 管理员 = 管理权限全集：把只在运行时注入、库里缺的 7 个管理点补进 DB，
--     让权限矩阵/导出与 init-mysql.sql 一致（学员专属仍然不补）
UPDATE t_role
SET authority = CONCAT(authority, ',repo:export'),
    update_at = NOW()
WHERE code = 'admin' AND is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') NOT LIKE '%,repo:export,%';

UPDATE t_role
SET authority = CONCAT(authority, ',file:upload'),
    update_at = NOW()
WHERE code = 'admin' AND is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') NOT LIKE '%,file:upload,%';

UPDATE t_role
SET authority = CONCAT(authority, ',system:user:create:student'),
    update_at = NOW()
WHERE code = 'admin' AND is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') NOT LIKE '%,system:user:create:student,%';

UPDATE t_role
SET authority = CONCAT(authority, ',system:user:create:teacher'),
    update_at = NOW()
WHERE code = 'admin' AND is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') NOT LIKE '%,system:user:create:teacher,%';

UPDATE t_role
SET authority = CONCAT(authority, ',portal:teacher'),
    update_at = NOW()
WHERE code = 'admin' AND is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') NOT LIKE '%,portal:teacher,%';

UPDATE t_role
SET authority = CONCAT(authority, ',portal:admin'),
    update_at = NOW()
WHERE code = 'admin' AND is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') NOT LIKE '%,portal:admin,%';

UPDATE t_role
SET authority = CONCAT(authority, ',content:protect'),
    update_at = NOW()
WHERE code = 'admin' AND is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') NOT LIKE '%,content:protect,%';

-- 2d) 删除旧导入权限
UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',repo:import,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,repo:import,%';

-- 3) 历史前缀清理（逐个 token，按逗号边界匹配，不会误删 project:list 这类真权限）
UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',project,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,project,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',answer,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,answer,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',repo,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,repo,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',template,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,template,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',file,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,file,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',exercise,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,exercise,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',user,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,user,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',position,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,position,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',position:list,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,position:list,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',position:create,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,position:create,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',system,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,system,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',system:role,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,system:role,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',system:user,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,system:user,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',system:dept,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,system:dept,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',system:org,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,system:org,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',system:org:list,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,system:org:list,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',system:org:create,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,system:org:create,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',system:org:update,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,system:org:update,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',system:org:delete,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,system:org:delete,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',system:position,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,system:position,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',system:position:list,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,system:position:list,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',system:position:create,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,system:position:create,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',system:position:update,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,system:position:update,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',system:position:delete,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,system:position:delete,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',system:dict,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,system:dict,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',system:dictItem,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,system:dictItem,%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',system:user:updatePosition,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority IS NOT NULL
  AND CONCAT(',', authority, ',') LIKE '%,system:user:updatePosition,%';

-- 4) 校验：老师不应再有删除/恢复答卷，任何角色不应再有 repo:import；project:delete 允许保留
SELECT code, name,
       LENGTH(authority) - LENGTH(REPLACE(authority, ',', '')) + 1 AS token_count,
       (CONCAT(',', authority, ',') LIKE '%,project:delete,%')  AS has_project_delete,
       (CONCAT(',', authority, ',') LIKE '%,answer:delete,%')   AS has_answer_delete,
       (CONCAT(',', authority, ',') LIKE '%,answer:restore,%')  AS has_answer_restore,
       (CONCAT(',', authority, ',') LIKE '%,repo:import,%')     AS has_repo_import,
       (CONCAT(',', authority, ',') LIKE '%,template:import,%') AS has_template_import
FROM t_role WHERE is_deleted = 0 ORDER BY code;
