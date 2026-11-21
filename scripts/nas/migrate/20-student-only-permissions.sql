-- 权限 v9：把「开始答题 / 开始练习 / 学员视角」固化成学员专属权限（2026-11-08，幂等）
SET NAMES utf8mb4;


UPDATE t_role
SET authority = CONCAT(authority, ',project:answer'),
    update_at = NOW()
WHERE code IN ('student', 'xueyuan') AND is_deleted = 0
  AND authority NOT LIKE '%project:answer%';


UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(REPLACE(REPLACE(REPLACE(
      CONCAT(',', authority, ','),
      ',repo:book,', ','),
      ',repo:practice,', ','),
      ',portal:student,', ','),
      ',project:answer,', ',')),
    update_at = NOW()
WHERE code = 'admin' AND is_deleted = 0;


UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(REPLACE(REPLACE(REPLACE(
      CONCAT(',', authority, ','),
      ',repo:book,', ','),
      ',repo:practice,', ','),
      ',portal:student,', ','),
      ',project:answer,', ',')),
    update_at = NOW()
WHERE code = 'teacher' AND is_deleted = 0;

SELECT code, name,
       (authority LIKE '%project:answer%') AS can_answer,
       (authority LIKE '%repo:practice%')  AS can_practice,
       (authority LIKE '%repo:book%')      AS has_book,
       (authority LIKE '%portal:student%') AS student_view
FROM t_role WHERE is_deleted = 0 ORDER BY code;
