-- 用户组有效期（可重复执行）
-- 语义：valid_from 为空不限开始；valid_to 为空=永久有效。
SET @has = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_dept' AND COLUMN_NAME = 'valid_from');
SET @sql = IF(@has = 0,
  'ALTER TABLE t_dept ADD COLUMN valid_from datetime DEFAULT NULL COMMENT ''有效期开始，空=不限''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_dept' AND COLUMN_NAME = 'valid_to');
SET @sql = IF(@has = 0,
  'ALTER TABLE t_dept ADD COLUMN valid_to datetime DEFAULT NULL COMMENT ''有效期结束，空=永久''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
