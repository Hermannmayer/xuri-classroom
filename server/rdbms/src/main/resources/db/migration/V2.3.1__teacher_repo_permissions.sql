-- 老师补齐题库维护权限（repo:create/update/delete/export、template:create/update/delete）。
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
