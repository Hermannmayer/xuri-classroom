-- 权限模型 v2 落地补丁（幂等）
SET NAMES utf8mb4;


UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',home,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority LIKE '%home%';


UPDATE t_role
SET authority = CONCAT(authority, ',system:log:list,project:publish'),
    update_at = NOW()
WHERE code = 'admin' AND is_deleted = 0 AND authority NOT LIKE '%system:log:list%';


UPDATE t_role
SET authority = 'project,project:list,project:detail,project:create,project:update,project:delete,project:report,project:publish,project:partner,answer,answer:list,answer:detail,answer:create,answer:update,answer:delete,answer:export,answer:upload,answer:restore,repo,repo:list,repo:detail,repo:import,repo:book,template,template:list,template:create,template:update,template:delete,exercise,exercise:list,file,file:detail,file:list,file:import,file:delete,user:update,user:import',
    remark = '发布考试、管协作者、导入题库与题目、看答卷报表；不能改/删题库',
    update_at = NOW()
WHERE code = 'teacher' AND is_deleted = 0;


UPDATE t_role
SET authority = 'project:list,project:detail,project:report,exercise:list,repo:list,repo:book,answer:list,answer:detail,answer:upload,user:update',
    remark = '只做题：我的考试、练习、开始答题；不能点开题库看题',
    update_at = NOW()
WHERE code IN ('xueyuan', 'student') AND is_deleted = 0;


SELECT r.name, r.code,
       (CHAR_LENGTH(r.authority) - CHAR_LENGTH(REPLACE(r.authority, ',', '')) + 1) AS perm_count,
       (r.authority LIKE '%system:log:list%') AS has_log,
       (r.authority LIKE '%project:publish%') AS has_publish,
       (r.authority LIKE '%repo:detail%')     AS has_repo_detail
FROM t_role r WHERE r.is_deleted = 0 ORDER BY perm_count DESC;
