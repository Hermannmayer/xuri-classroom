-- ======
-- 权限 v11：练习记录归学员（2026-11-08，幂等）
--
-- exercise:list 是「我的练习/练习记录」，属于学员能力；管理员不应因为自动权限目录而拥有。
-- 学员保留；老师本来就没有；管理员清掉库里的历史串，代码层也不再注入。
-- ======
SET NAMES utf8mb4;

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',exercise:list,', ',')),
    update_at = NOW()
WHERE code IN ('admin', 'teacher') AND is_deleted = 0;

SELECT code, name, (authority LIKE '%exercise:list%') AS has_exercise
FROM t_role WHERE is_deleted = 0 ORDER BY code;
