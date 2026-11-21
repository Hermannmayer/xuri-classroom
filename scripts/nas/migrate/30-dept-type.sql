-- 用户组 / 班级拆分：t_dept.dept_type（2026-11，幂等）
SET NAMES utf8mb4;


SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_dept'
    AND COLUMN_NAME = 'dept_type'
);

SET @first_run := IF(@col_exists = 0, 1, 0);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_dept ADD COLUMN dept_type varchar(16) NOT NULL DEFAULT ''org'' COMMENT ''org=用户组(教职工) class=班级(学员)'' AFTER parent_id',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_dept'
    AND INDEX_NAME = 'idx_dept_type'
);
SET @ddl_idx := IF(@idx_exists = 0,
  'ALTER TABLE t_dept ADD KEY idx_dept_type (dept_type)',
  'SELECT 1');
PREPARE stmt_idx FROM @ddl_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;


UPDATE t_dept SET dept_type = 'class'
WHERE @first_run = 1
  AND id IN (SELECT DISTINCT dept_id FROM t_user WHERE user_type = 'student' AND is_deleted = 0 AND dept_id IS NOT NULL);


UPDATE t_dept SET dept_type = 'org'
WHERE @first_run = 1 AND dept_type = 'class' AND (parent_id = '0' OR parent_id IS NULL);


UPDATE t_dept SET dept_type = 'org' WHERE dept_type IS NULL OR dept_type NOT IN ('org', 'class');


SELECT dept_type, COUNT(*) AS cnt FROM t_dept WHERE is_deleted = 0 GROUP BY dept_type ORDER BY dept_type;




SELECT id, parent_id, name, dept_type FROM t_dept WHERE is_deleted = 0 ORDER BY dept_type, parent_id, sort_code;
