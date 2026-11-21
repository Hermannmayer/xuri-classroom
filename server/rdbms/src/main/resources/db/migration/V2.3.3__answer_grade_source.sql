-- 2.3.3 批改来源（幂等） t_answer_grade.source：区分「AI 预批改」与「老师手工给分」。
SET NAMES utf8mb4;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_answer_grade' AND COLUMN_NAME = 'source'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_answer_grade ADD COLUMN source varchar(8) NOT NULL DEFAULT ''manual'' COMMENT ''分数来源：manual 人工 / ai AI 预批改（老师复核后可覆盖）'' AFTER grader',
  'SELECT ''source already exists'' AS skipped_source');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
