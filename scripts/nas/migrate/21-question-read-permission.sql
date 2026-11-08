-- ======
-- 权限 v10：题目只读从错题本拆分（2026-11-08，幂等）
--
-- 1. 新增 repo:questions:read：打开题库看题目。管理端用 repo:detail，学员用这个；
--    repo:book 只保留「错题本/收藏/练习册」，不再兼任「能看题库题目」。
-- 2. 老师批量导入用户的 user:import 一并收回：老师不再管理账号，
--    学员由班级管理添加，教职工由管理员创建。
-- ======
SET NAMES utf8mb4;

UPDATE t_role
SET authority = CONCAT(authority, ',repo:questions:read'),
    update_at = NOW()
WHERE code IN ('student', 'xueyuan') AND is_deleted = 0
  AND authority NOT LIKE '%repo:questions:read%';

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',user:import,', ',')),
    update_at = NOW()
WHERE code = 'teacher' AND is_deleted = 0;

SELECT code, name,
       (authority LIKE '%repo:questions:read%') AS can_read_questions,
       (authority LIKE '%repo:book%')           AS has_book,
       (authority LIKE '%user:import%')         AS can_import_users
FROM t_role WHERE is_deleted = 0 ORDER BY code;
