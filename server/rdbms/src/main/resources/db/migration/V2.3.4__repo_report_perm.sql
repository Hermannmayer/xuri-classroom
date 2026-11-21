-- 题库统计权限 repo:report：老师与管理员可见，学员不可见。
UPDATE t_role SET authority = CONCAT(authority, ',repo:report')
WHERE code IN ('admin', 'teacher') AND authority IS NOT NULL AND authority <> ''
  AND authority NOT LIKE '%repo:report%';
