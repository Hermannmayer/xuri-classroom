-- 权限 v4：老师不能再编辑题库里的题目（2026-11-07）
SET NAMES utf8mb4;

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM
      REPLACE(REPLACE(REPLACE(
        CONCAT(',', authority, ','),
        ',template:create,', ','),
        ',template:update,', ','),
        ',template:delete,', ',')
    ),
    remark = '出考试/问卷、导入题目、看答卷报表；题库与题目由管理员维护',
    update_at = NOW()
WHERE code = 'teacher' AND is_deleted = 0;

SELECT name, code,
       (CHAR_LENGTH(authority) - CHAR_LENGTH(REPLACE(authority, ',', '')) + 1) AS perm_count,
       (authority LIKE '%template:update%') AS can_edit_question,
       (authority LIKE '%template:import%') AS can_import_question
FROM t_role WHERE is_deleted = 0 ORDER BY perm_count DESC;
