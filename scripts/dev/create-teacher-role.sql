-- 老师角色：能配考试/问卷、管题库、看答卷与报表；没有 system:*（进不了系统管理）
INSERT INTO t_role (id, name, code, remark, authority, status, is_deleted, create_at)
SELECT 'teacher', '老师', 'teacher', '配置考试与题库、查看答卷数据',
  'project,project:list,project:detail,project:create,project:update,project:delete,project:report,answer,answer:list,answer:detail,answer:create,answer:update,answer:delete,answer:export,answer:upload,repo,repo:list,repo:detail,repo:create,repo:update,repo:delete,repo:book,template,template:list,template:create,template:update,template:delete,exercise,exercise:list,file,file:detail,file:list,file:import,file:delete,user:update,home', 1, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_role WHERE code = 'teacher');

-- 学生角色：只练习、看题库、改自己资料（答题走公开链接，不需要后台权限）
UPDATE t_role SET authority = 'exercise:list,repo:list,repo:detail,user:update'
WHERE code = 'student';

SELECT id, name, code, CHAR_LENGTH(authority) AS len FROM t_role ORDER BY code;
