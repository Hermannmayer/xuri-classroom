-- 题库统计权限 repo:report：老师与管理员可见，学员不可见。
-- 背景：题库页要加「统计」入口（整体练习情况、题目正确率、薄弱题），
-- 这份数据暴露的是别人练得怎么样，学员不该看到，所以单独开一个权限点，
-- 不挂在 repo:detail / repo:questions:read 上（那两个学员也有，用于看题）。
--
-- 幂等：authority 里没有该 code 才追加；只动内置 admin/teacher，自定义角色需在权限页手动勾。
UPDATE t_role SET authority = CONCAT(authority, ',repo:report')
WHERE code IN ('admin', 'teacher') AND authority IS NOT NULL AND authority <> ''
  AND authority NOT LIKE '%repo:report%';
