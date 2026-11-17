-- 老师补齐题库维护权限（repo:create/update/delete/export、template:create/update/delete）。
--
-- 背景：老师能看题库、能导入题目（template:import），但缺「新建/改/删题库与题目」与题库导出，
-- 前端按权限点隐藏按钮，表现为「题库页只能看、不能建题」；而角色描述写的是「配置考试与题库」。
--
-- 幂等：先判断 authority 里没有该 code 才追加；只动内置 teacher 角色，自定义角色不自动扩权。
UPDATE t_role SET authority = CONCAT(authority, ',repo:create')
WHERE code = 'teacher' AND authority IS NOT NULL AND authority <> '' AND authority NOT LIKE '%repo:create%';

UPDATE t_role SET authority = CONCAT(authority, ',repo:update')
WHERE code = 'teacher' AND authority IS NOT NULL AND authority <> '' AND authority NOT LIKE '%repo:update%';

UPDATE t_role SET authority = CONCAT(authority, ',repo:delete')
WHERE code = 'teacher' AND authority IS NOT NULL AND authority <> '' AND authority NOT LIKE '%repo:delete%';

UPDATE t_role SET authority = CONCAT(authority, ',repo:export')
WHERE code = 'teacher' AND authority IS NOT NULL AND authority <> '' AND authority NOT LIKE '%repo:export%';

UPDATE t_role SET authority = CONCAT(authority, ',template:create')
WHERE code = 'teacher' AND authority IS NOT NULL AND authority <> '' AND authority NOT LIKE '%template:create%';

UPDATE t_role SET authority = CONCAT(authority, ',template:update')
WHERE code = 'teacher' AND authority IS NOT NULL AND authority <> '' AND authority NOT LIKE '%template:update%';

UPDATE t_role SET authority = CONCAT(authority, ',template:delete')
WHERE code = 'teacher' AND authority IS NOT NULL AND authority <> '' AND authority NOT LIKE '%template:delete%';
