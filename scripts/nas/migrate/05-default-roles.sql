-- 恢复/补齐默认角色（幂等，可重复执行）
SET NAMES utf8mb4;




INSERT INTO t_role (id, name, code, remark, authority, status, is_deleted, create_at)
VALUES (
  'teacher', '老师', 'teacher', '配置考试与题库、查看答卷数据',
  'project,project:list,project:detail,project:create,project:update,project:delete,project:report,project:publish,project:partner,answer,answer:list,answer:detail,answer:create,answer:update,answer:delete,answer:export,answer:upload,answer:restore,repo,repo:list,repo:detail,repo:create,repo:update,repo:delete,repo:export,repo:import,repo:grant,repo:book,template,template:list,exercise,exercise:list,file,file:detail,file:list,file:import,file:delete,user:update,file:upload,template:import,system:user:create:student,portal:teacher',
  1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name), code = VALUES(code), remark = VALUES(remark),
  authority = VALUES(authority), status = 1, is_deleted = 0, update_at = NOW();






UPDATE t_role
SET authority = 'home,exercise:list,repo:list,repo:practice,repo:book,project:list,project:detail,user:update,answer:list,answer:detail,answer:upload',
    remark = '只能做题、刷题库，无任何管理权限',
    status = 1, is_deleted = 0, update_at = NOW()
WHERE code IN ('xueyuan', 'student') AND is_deleted = 0;


INSERT INTO t_role (id, name, code, remark, authority, status, is_deleted, create_at)
SELECT 'student', '学员', 'student', '只能做题、刷题库，无任何管理权限',
       'home,exercise:list,repo:list,repo:practice,repo:book,project:list,project:detail,user:update,answer:list,answer:detail,answer:upload',
       1, 0, NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM (SELECT id FROM t_role WHERE code IN ('xueyuan','student') AND is_deleted = 0) x);




SELECT id, name, code, CHAR_LENGTH(authority) AS len,
       (CHAR_LENGTH(authority) - CHAR_LENGTH(REPLACE(authority, ',', '')) + 1) AS perm_count
FROM t_role
WHERE is_deleted = 0
ORDER BY perm_count DESC;
