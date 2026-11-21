-- 考试/问卷分类：t_project.category（2026-11，幂等）
SET NAMES utf8mb4;


SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_project'
    AND COLUMN_NAME = 'category'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_project ADD COLUMN category varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT ''分类名（如 保育员/养老护理员/育婴员）'' AFTER name',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


SELECT COUNT(*) AS category_column FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_project' AND COLUMN_NAME = 'category';
